const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  datetime: {
    type: Date,
    required: true
  },
  capacity: {
    type: Number,
    required: true,
    min: 1
  },
  availableSeats: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String
  },
  category: {
    type: String,
    enum: ['conference', 'concert', 'workshop', 'other'],
    default: 'other'
  },
  price: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

eventSchema.pre('save', function(next) {
  if (this.isNew) {
    this.availableSeats = this.capacity;
  }
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Event', eventSchema);
