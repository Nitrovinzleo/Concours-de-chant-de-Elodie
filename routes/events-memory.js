const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth, adminAuth } = require('../middleware/auth-memory');
const seatService = require('../services/seatService');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, category, search } = req.query;
    const db = req.db;
    let filteredEvents = [...db.events];
    
    if (category) {
      filteredEvents = filteredEvents.filter(event => event.category === category);
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      filteredEvents = filteredEvents.filter(event => 
        event.title.toLowerCase().includes(searchLower) ||
        (event.description && event.description.toLowerCase().includes(searchLower)) ||
        event.location.toLowerCase().includes(searchLower)
      );
    }

    // Ajouter les informations sur les places réservées pour chaque événement
    const eventsWithBookedSeats = await Promise.all(filteredEvents.map(async (event) => {
      // Initialiser les places pour cet événement si nécessaire
      await seatService.initializeEventSeats(event._id, event.capacity || 96);
      
      // Récupérer les places réservées
      const bookedSeats = await seatService.getBookedSeats(event._id);
      
      return {
        ...event,
        bookedSeats: bookedSeats
      };
    }));

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedEvents = eventsWithBookedSeats.slice(startIndex, endIndex);

    res.json({
      events: paginatedEvents,
      totalPages: Math.ceil(filteredEvents.length / limit),
      currentPage: parseInt(page),
      total: filteredEvents.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const db = req.db;
    const event = db.events.find(e => e._id == req.params.id);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Initialiser les places pour cet événement si nécessaire
    await seatService.initializeEventSeats(event._id, event.capacity || 96);
    
    // Récupérer les places réservées
    const bookedSeats = await seatService.getBookedSeats(event._id);

    const eventWithBookedSeats = {
      ...event,
      bookedSeats: bookedSeats
    };

    res.json(eventWithBookedSeats);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/', [
  auth,
  adminAuth,
  body('title').notEmpty().trim(),
  body('location').notEmpty().trim(),
  body('datetime').isISO8601().toDate(),
  body('capacity').isInt({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, location, datetime, capacity, description, category, price } = req.body;
    const db = req.db;

    const event = {
      _id: db.nextEventId++,
      title,
      location,
      datetime: new Date(datetime),
      capacity: parseInt(capacity),
      availableSeats: parseInt(capacity),
      description,
      category,
      price: price || 0,
      createdBy: req.user._id,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    db.events.push(event);

    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.put('/:id', [
  auth,
  adminAuth,
  body('title').optional().notEmpty().trim(),
  body('capacity').optional().isInt({ min: 1 }),
  body('datetime').optional().isISO8601().toDate()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const db = req.db;
    const eventIndex = db.events.findIndex(e => e._id == req.params.id);
    
    if (eventIndex === -1) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const event = db.events[eventIndex];
    const { title, capacity, datetime, description, category, price } = req.body;
    
    if (title) event.title = title;
    if (capacity) {
      const bookedSeats = event.capacity - event.availableSeats;
      if (capacity < bookedSeats) {
        return res.status(400).json({ message: 'Cannot reduce capacity below booked seats' });
      }
      event.capacity = capacity;
      event.availableSeats = capacity - bookedSeats;
    }
    if (datetime) event.datetime = new Date(datetime);
    if (description) event.description = description;
    if (category) event.category = category;
    if (price !== undefined) event.price = price;

    event.updatedAt = new Date();

    req.io.to(`event-${event._id}`).emit('seat-update', {
      eventId: event._id,
      availableSeats: event.availableSeats
    });

    res.json(event);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.delete('/:id', [auth, adminAuth], async (req, res) => {
  try {
    const db = req.db;
    const eventIndex = db.events.findIndex(e => e._id == req.params.id);
    
    if (eventIndex === -1) {
      return res.status(404).json({ message: 'Event not found' });
    }

    db.events.splice(eventIndex, 1);

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
