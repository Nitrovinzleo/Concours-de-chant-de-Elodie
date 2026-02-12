const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth-memory');
const seatService = require('../services/seatService');

const router = express.Router();

// GET /api/bookings?eventId=X - Récupérer les réservations pour un événement
router.get('/event/:eventId', [auth], async (req, res) => {
  try {
    const { eventId } = req.params;
    const db = req.db;

    if (!eventId) {
      return res.status(400).json({ message: 'Event ID is required' });
    }

    const bookings = db.bookings.filter(b => 
      b.event == eventId && b.status === 'confirmed'
    );

    res.json({ bookings });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/', [auth], async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const db = req.db;
    
    console.log('Getting bookings for user:', req.user?._id, 'with status:', status);
    
    let userBookings = db.bookings.filter(b => b.user == req.user._id);
    
    if (status) {
      userBookings = userBookings.filter(b => b.status === status);
    }
    
    console.log('Found bookings:', userBookings.length);
    
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

router.post('/', [auth], async (req, res) => {
  try {
    const { eventId, numberOfSeats = 1, seats, waitlist = false } = req.body;
    const db = req.db;

    console.log('Booking request:', { eventId, numberOfSeats, seats, waitlist, userId: req.user._id });

    // Validation manuelle simple
    if (!eventId || isNaN(eventId)) {
      console.log('Invalid eventId:', eventId);
      return res.status(400).json({ message: 'Invalid event ID' });
    }

    if (seats && !Array.isArray(seats)) {
      console.log('Invalid seats array:', seats);
      return res.status(400).json({ message: 'Seats must be an array' });
    }

    const event = db.events.find(e => e._id == eventId);
    if (!event) {
      console.log('Event not found:', eventId);
      return res.status(404).json({ message: 'Event not found' });
    }

    const existingBooking = db.bookings.find(b => 
      b.user == req.user._id && b.event == eventId && (b.status === 'confirmed' || b.status === 'waitlist')
    );

    if (existingBooking) {
      console.log('User already has booking for event:', existingBooking._id);
      return res.status(409).json({ message: 'You already have a booking for this event' });
    }

    // Handle explicit waitlist request
    if (waitlist) {
      console.log('Adding to waitlist for event:', eventId);
      const waitlistBooking = {
        _id: db.nextBookingId++,
        user: req.user._id,
        event: eventId,
        status: 'waitlist',
        numberOfSeats: 1,
        bookingDate: new Date(),
        confirmationCode: Math.random().toString(36).substr(2, 9).toUpperCase()
      };

      db.bookings.push(waitlistBooking);

      console.log('Waitlist booking created:', waitlistBooking._id);
      console.log('Sending waitlist response:', {
        bookingId: waitlistBooking._id,
        confirmation: waitlistBooking.confirmationCode,
        status: 'waitlist',
        message: 'You have been added to the waitlist.'
      });

      return res.status(201).json({
        bookingId: waitlistBooking._id,
        confirmation: waitlistBooking.confirmationCode,
        status: 'waitlist',
        message: 'You have been added to the waitlist.'
      });
    }

    // Handle seat selection booking
    if (seats && seats.length > 0) {
      console.log('Processing seat selection booking:', seats);
      
      // Initialiser les places pour cet événement si nécessaire
      await seatService.initializeEventSeats(eventId, event.capacity || 96);

      // Réserver les places avec le SeatService
      const bookingResult = await seatService.bookSeats(eventId, seats, req.user._id);

      if (!bookingResult.success) {
        console.log('Some seats could not be booked:', bookingResult.errors);
        
        if (bookingResult.bookedSeats.length === 0) {
          // Aucune place n'a pu être réservée
          return res.status(409).json({ 
            message: `Aucune place disponible: ${bookingResult.errors.join(', ')}` 
          });
        } else {
          // Certaines places ont pu être réservées, d'autres pas
          // Pour l'instant, on annule tout et on met en liste d'attente
          await seatService.releaseSeats(eventId, bookingResult.bookedSeats);
          
          const waitlistBooking = {
            _id: db.nextBookingId++,
            user: req.user._id,
            event: eventId,
            status: 'waitlist',
            numberOfSeats: seats.length,
            requestedSeats: seats,
            bookingDate: new Date(),
            confirmationCode: Math.random().toString(36).substr(2, 9).toUpperCase()
          };

          db.bookings.push(waitlistBooking);

          return res.status(201).json({
            bookingId: waitlistBooking._id,
            confirmation: waitlistBooking.confirmationCode,
            status: 'waitlist',
            requestedSeats: seats,
            message: 'Certaines places demandées ne sont plus disponibles. Vous avez été ajouté à la liste d\'attente.'
          });
        }
      }

      // Calculer le prix total basé sur les places réservées
      let totalPrice = 0;
      for (const seatNumber of bookingResult.bookedSeats) {
        const seatInfo = await seatService.getSeatInfo(eventId, seatNumber);
        if (seatInfo) {
          totalPrice += seatInfo.price;
        }
      }

      console.log('Creating booking with seats:', bookingResult.bookedSeats, 'total price:', totalPrice);

      // Create booking with specific seats
      const booking = {
        _id: db.nextBookingId++,
        user: req.user._id,
        event: eventId,
        status: 'confirmed',
        numberOfSeats: bookingResult.bookedSeats.length,
        seats: bookingResult.bookedSeats,
        totalPrice: totalPrice,
        bookingDate: new Date(),
        confirmationCode: Math.random().toString(36).substr(2, 9).toUpperCase()
      };

      db.bookings.push(booking);

      event.availableSeats -= bookingResult.bookedSeats.length;

      console.log('Booking created successfully:', booking._id);

      req.io.to(`event-${eventId}`).emit('seat-update', {
        eventId,
        availableSeats: event.availableSeats,
        bookedSeats: await seatService.getBookedSeats(eventId)
      });

      req.io.emit('booking-confirmed', {
        bookingId: booking._id,
        eventId,
        userId: req.user._id,
        seats: bookingResult.bookedSeats
      });

      return res.status(201).json({
        bookingId: booking._id,
        confirmation: booking.confirmationCode,
        seats: bookingResult.bookedSeats,
        totalPrice: totalPrice,
        event: {
          title: event.title,
          location: event.location,
          datetime: event.datetime
        }
      });
    }

    // Handle regular booking without seat selection
    console.log('Checking available seats:', event.availableSeats, 'requested:', numberOfSeats);
    
    if (event.availableSeats < numberOfSeats) {
      console.log('Event is full, adding to waitlist');
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

    // Create regular booking
    console.log('Creating regular booking for event:', eventId);
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

    console.log('Regular booking created successfully:', booking._id);

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
    console.error('Server error in booking:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/', [auth], async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const db = req.db;
    
    console.log('Getting bookings for user:', req.user?._id, 'with status:', status);
    
    let userBookings = db.bookings.filter(b => b.user == req.user._id);
    
    if (status) {
      userBookings = userBookings.filter(b => b.status === status);
    }
    
    console.log('Found bookings:', userBookings.length);
    
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

    // Garder l'ancien statut pour le traitement
    const originalStatus = booking.status;
    
    // Mettre à jour le statut
    booking.status = 'cancelled';

    // Si c'était une réservation confirmée, libérer les places
    if (originalStatus === 'confirmed') {
      const event = db.events.find(e => e._id == booking.event);
      if (event) {
        event.availableSeats += booking.numberOfSeats;

        // Libérer les places spécifiques si elles existent avec le SeatService
        if (booking.seats && booking.seats.length > 0) {
          await seatService.initializeEventSeats(booking.event, event.capacity || 96);
          const releaseResult = await seatService.releaseSeats(booking.event, booking.seats);
          
          if (releaseResult.success) {
            console.log('Seats released successfully:', releaseResult.releasedSeats);
          } else {
            console.log('Some seats could not be released:', releaseResult.errors);
          }
        }

        req.io.to(`event-${event._id}`).emit('seat-update', {
          eventId: event._id,
          availableSeats: event.availableSeats,
          bookedSeats: await seatService.getBookedSeats(event._id)
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
