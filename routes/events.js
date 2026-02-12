const express = require('express');
const { body, validationResult } = require('express-validator');
const Event = require('../models/Event');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, category, search } = req.query;
    const query = {};
    
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

    const events = await Event.find(query)
      .populate('createdBy', 'email')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ datetime: 1 });

    const total = await Event.countDocuments(query);

    res.json({
      events,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate('createdBy', 'email');
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json(event);
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

    const event = new Event({
      title,
      location,
      datetime,
      capacity,
      description,
      category,
      price,
      createdBy: req.user._id
    });

    await event.save();

    const populatedEvent = await Event.findById(event._id).populate('createdBy', 'email');

    res.status(201).json(populatedEvent);
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

    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

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
    if (datetime) event.datetime = datetime;
    if (description) event.description = description;
    if (category) event.category = category;
    if (price !== undefined) event.price = price;

    await event.save();

    const updatedEvent = await Event.findById(event._id).populate('createdBy', 'email');

    req.io.to(`event-${event._id}`).emit('seat-update', {
      eventId: event._id,
      availableSeats: event.availableSeats
    });

    res.json(updatedEvent);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.delete('/:id', [auth, adminAuth], async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    await Event.findByIdAndDelete(req.params.id);

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
