const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  status: {
    type: String,
    enum: ['confirmed', 'cancelled', 'waitlist'],
    default: 'confirmed'
  },
  bookingDate: {
    type: Date,
    default: Date.now
  },
  numberOfSeats: {
    type: Number,
    default: 1,
    min: 1
  },
  selectedSeats: [{
    type: String,
    required: false
  }],
  confirmationCode: {
    type: String,
    unique: true,
    required: true
  },
  notifications: {
    email: {
      sent: { type: Boolean, default: false },
      sentAt: Date
    },
    sms: {
      sent: { type: Boolean, default: false },
      sentAt: Date
    }
  }
});

bookingSchema.pre('save', function(next) {
  if (!this.confirmationCode) {
    this.confirmationCode = Math.random().toString(36).substr(2, 9).toUpperCase();
  }
  next();
});

module.exports = mongoose.model('Booking', bookingSchema);
