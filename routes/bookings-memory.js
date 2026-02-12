const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth-memory');

const router = express.Router();

router.post('/', [
  auth,
  body('eventId').isNumeric(),
  body('numberOfSeats').optional().isInt({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { eventId, numberOfSeats = 1 } = req.body;
    const db = req.db;

    const event = db.events.find(e => e._id == eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const existingBooking = db.bookings.find(b => 
      b.user == req.user._id && b.event == eventId && b.status === 'confirmed'
    );

    if (existingBooking) {
      return res.status(409).json({ message: 'You already have a confirmed booking for this event' });
    }

    if (event.availableSeats < numberOfSeats) {
      const waitlistBooking = {
        _id: db.nextBookingId++,
        user: req.user._id,
        event: eventId,
        status: 'waitlist',
        numberOfSeats,
        bookingDate: new Date(),
        confirmationCode: Math.random().toString(36).substr(2, 9).toUpperCase()
      };

      db.bookings.push(waitlistBooking);

      return res.status(201).json({
        bookingId: waitlistBooking._id,
        confirmation: waitlistBooking.confirmationCode,
        status: 'waitlist',
        message: 'Event is full. You have been added to the waitlist.'
      });
    }

    const booking = {
      _id: db.nextBookingId++,
      user: req.user._id,
      event: eventId,
      status: 'confirmed',
      numberOfSeats,
      bookingDate: new Date(),
      confirmationCode: Math.random().toString(36).substr(2, 9).toUpperCase()
    };

    db.bookings.push(booking);

    event.availableSeats -= numberOfSeats;

    req.io.to(`event-${eventId}`).emit('seat-update', {
      eventId,
      availableSeats: event.availableSeats
    });

    req.io.emit('booking-confirmed', {
      bookingId: booking._id,
      eventId,
      userId: req.user._id
    });

    res.status(201).json({
      bookingId: booking._id,
      confirmation: booking.confirmationCode,
      event: {
        title: event.title,
        location: event.location,
        datetime: event.datetime
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/', [auth], async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const db = req.db;
    let userBookings = db.bookings.filter(b => b.user == req.user._id);
    
    if (status) {
      userBookings = userBookings.filter(b => b.status === status);
    }

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedBookings = userBookings.slice(startIndex, endIndex);

    const bookingsWithEvents = paginatedBookings.map(booking => {
      const event = db.events.find(e => e._id == booking.event);
      return {
        ...booking,
        event: event ? {
          title: event.title,
          location: event.location,
          datetime: event.datetime,
          category: event.category
        } : null
      };
    });

    res.json({
      bookings: bookingsWithEvents,
      totalPages: Math.ceil(userBookings.length / limit),
      currentPage: parseInt(page),
      total: userBookings.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/:id', [auth], async (req, res) => {
  try {
    const db = req.db;
    const booking = db.bookings.find(b => b._id == req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.user != req.user._id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const event = db.events.find(e => e._id == booking.event);
    const user = db.users.find(u => u._id == booking.user);

    res.json({
      ...booking,
      event: event ? {
        title: event.title,
        location: event.location,
        datetime: event.datetime,
        description: event.description
      } : null,
      user: user ? {
        email: user.email,
        profileData: user.profileData
      } : null
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.put('/:id/cancel', [auth], async (req, res) => {
  try {
    const db = req.db;
    const bookingIndex = db.bookings.findIndex(b => b._id == req.params.id);

    if (bookingIndex === -1) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const booking = db.bookings[bookingIndex];

    if (booking.user != req.user._id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ message: 'Booking is already cancelled' });
    }

    booking.status = 'cancelled';

    if (booking.status === 'confirmed') {
      const event = db.events.find(e => e._id == booking.event);
      if (event) {
        event.availableSeats += booking.numberOfSeats;

        req.io.to(`event-${event._id}`).emit('seat-update', {
          eventId: event._id,
          availableSeats: event.availableSeats
        });

        // Process waitlist
        const waitlistBookings = db.bookings.filter(b => 
          b.event == booking.event && b.status === 'waitlist'
        ).sort((a, b) => new Date(a.bookingDate) - new Date(b.bookingDate));

        for (const waitlistBooking of waitlistBookings) {
          if (event.availableSeats >= waitlistBooking.numberOfSeats) {
            waitlistBooking.status = 'confirmed';
            event.availableSeats -= waitlistBooking.numberOfSeats;

            req.io.to(`event-${event._id}`).emit('seat-update', {
              eventId: event._id,
              availableSeats: event.availableSeats
            });

            req.io.emit('booking-confirmed', {
              bookingId: waitlistBooking._id,
              eventId: event._id,
              userId: waitlistBooking.user
            });
          } else {
            break;
          }
        }
      }
    }

    res.json({ message: 'Booking cancelled successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
