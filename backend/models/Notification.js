const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ['new_message', 'reminder', 'status_change', 'login', 'complaint_alert', 'order_update', 'system'],
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  body: {
    type: String,
    required: true,
  },
  icon: {
    type: String,
    default: 'notifications',
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  read: {
    type: Boolean,
    default: false,
  },
  priority: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for efficient queries
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, read: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
