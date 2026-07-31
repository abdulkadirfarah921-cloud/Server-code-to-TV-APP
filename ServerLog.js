const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  action: { type: String, required: true },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  target: { type: String, default: '' },
  details: { type: String, default: '' },
  ip: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ServerLog', logSchema);
