const mongoose = require('mongoose');

const channelSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url: { type: String, required: true },
  category: { type: String, default: 'General' },
  free: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
  adsEnabled: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Channel', channelSchema);
