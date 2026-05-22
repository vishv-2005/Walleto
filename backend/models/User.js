const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    trim: true,
  },
  businessName: {
    type: String,
    trim: true,
    default: '',
  },
  phone: {
    type: String,
    trim: true,
    default: '',
  },
  role: {
    type: String,
    enum: ['owner', 'manager', 'staff'],
    default: 'owner',
  },
  pushToken: {
    type: String,
    default: null,
  },
  notificationPreferences: {
    new_message: { type: Boolean, default: true },
    reminder: { type: Boolean, default: true },
    status_change: { type: Boolean, default: true },
    login: { type: Boolean, default: true },
    complaint_alert: { type: Boolean, default: true },
    order_update: { type: Boolean, default: true },
    system: { type: Boolean, default: true },
    email_on_login: { type: Boolean, default: true },
  },
  lastLoginAt: {
    type: Date,
    default: null,
  },
  lastLoginIp: {
    type: String,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('User', userSchema);
