const express = require('express');
const { body, validationResult } = require('express-validator');
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const { auth } = require('../middleware/auth');
const notificationService = require('../services/notificationService');

const router = express.Router();

router.post('/', [
  auth,
  body('eventId').isMongoId(),
  body('numberOfSeats').optional().isInt({ min: 1 }),
  body('selectedSeats').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { eventId, numberOfSeats = 1, selectedSeats = [] } = req.body;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.availableSeats < numberOfSeats) {
      const existingBooking = await Booking.findOne({
        user: req.user._id,
        event: eventId,
        status: { $in: ['confirmed', 'waitlist'] }
      });

      if (existingBooking) {
        return res.status(409).json({ message: 'You already have a booking for this event' });
      }

      const waitlistBooking = new Booking({
        user: req.user._id,
        event: eventId,
        status: 'waitlist',
        numberOfSeats,
        selectedSeats: selectedSeats.length > 0 ? selectedSeats : undefined
      });

      await waitlistBooking.save();

      return res.status(201).json({
        bookingId: waitlistBooking._id,
        confirmation: waitlistBooking.confirmationCode,
        status: 'waitlist',
        message: 'Event is full. You have been added to the waitlist.'
      });
    }

    const existingBooking = await Booking.findOne({
      user: req.user._id,
      event: eventId,
      status: { $in: ['confirmed', 'waitlist'] }
    });

    if (existingBooking) {
      return res.status(409).json({ message: 'You already have a booking for this event' });
    }

    const booking = new Booking({
      user: req.user._id,
      event: eventId,
      numberOfSeats,
      selectedSeats: selectedSeats.length > 0 ? selectedSeats : undefined
    });

    await booking.save();

    event.availableSeats -= numberOfSeats;
    await event.save();

    const populatedBooking = await Booking.findById(booking._id)
      .populate('user', 'email profileData')
      .populate('event', 'title location datetime');

    req.io.to(`event-${eventId}`).emit('seat-update', {
      eventId,
      availableSeats: event.availableSeats
    });

    req.io.emit('booking-confirmed', {
      bookingId: booking._id,
      eventId,
      userId: req.user._id
    });

    try {
      await notificationService.sendBookingConfirmation(populatedBooking);
    } catch (notificationError) {
      console.error('Notification failed:', notificationError);
    }

    res.status(201).json({
      bookingId: booking._id,
      confirmation: booking.confirmationCode,
      event: populatedBooking.event
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const query = { user: req.user._id };
    
    if (status) query.status = status;

    const bookings = await Booking.find(query)
      .populate('event', 'title location datetime category')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ bookingDate: -1 });

    const total = await Booking.countDocuments(query);

    res.json({
      bookings,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('user', 'email profileData')
      .populate('event', 'title location datetime description');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.user._id.toString() !== req.user._id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.put('/:id/cancel', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.user.toString() !== req.user._id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ message: 'Booking is already cancelled' });
    }

    const wasConfirmed = booking.status === 'confirmed';
    booking.status = 'cancelled';
    await booking.save();

    if (wasConfirmed) {
      const event = await Event.findById(booking.event);
      event.availableSeats += booking.numberOfSeats;
      await event.save();

      req.io.to(`event-${event._id}`).emit('seat-update', {
        eventId: event._id,
        availableSeats: event.availableSeats
      });

      await processWaitlist(event._id);
    }

    res.json({ message: 'Booking cancelled successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

async function processWaitlist(eventId) {
  try {
    const event = await Event.findById(eventId);
    const waitlistBookings = await Booking.find({
      event: eventId,
      status: 'waitlist'
    }).sort({ bookingDate: 1 });

    for (const booking of waitlistBookings) {
      if (event.availableSeats >= booking.numberOfSeats) {
        booking.status = 'confirmed';
        await booking.save();

        event.availableSeats -= booking.numberOfSeats;
        await event.save();

        const populatedBooking = await Booking.findById(booking._id)
          .populate('user', 'email profileData')
          .populate('event', 'title location datetime');

        await notificationService.sendWaitlistConfirmation(populatedBooking);

        global.io.to(`event-${eventId}`).emit('seat-update', {
          eventId,
          availableSeats: event.availableSeats
        });

        global.io.emit('booking-confirmed', {
          bookingId: booking._id,
          eventId,
          userId: booking.user
        });
      } else {
        break;
      }
    }
  } catch (error) {
    console.error('Error processing waitlist:', error);
  }
}

module.exports = router;
