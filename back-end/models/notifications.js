const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pet',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  body: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['system', 'reminder', 'alert', 'promotional', 'order', 'chat', 'mail', 'delivery', 'schedule'],
    default: 'system'
  },
  data: {
    type: Map,
    of: String,
    default: {}
  },
  scheduledFor: {
    type: Date,
    default: null
  },
  sentAt: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'canceled'],
    default: 'pending'
  },
  read: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Índices para consultas eficientes
notificationSchema.index({ user: 1, status: 1 });
notificationSchema.index({ scheduledFor: 1, status: 1 });
notificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);