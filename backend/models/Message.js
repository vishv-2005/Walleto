const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  from: {
    type: String,
    required: true,
  },
  name: {
    type: String,
  },
  message: {
    type: String,
    required: true,
  },
  timestamp: {
    type: String,
  },
  category: {
    type: String,
    default: 'invalid'
  },
  confidence: {
    type: Number,
    default: 0
  },
  source: {
    type: String,
    default: 'unknown'
  },
  status: {
    type: String,
    default: null
  },
  statusUpdatedAt: {
    type: String,
    default: null
  },
  notificationRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('Message', messageSchema);
