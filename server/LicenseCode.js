const mongoose = require('mongoose');

const codeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, index: true },
  days: { type: Number, required: true, default: 30 },
  type: { type: String, enum: ['1MONTH','3MONTHS','YEAR'], default: '1MONTH' },
  used: { type: Boolean, default: false },
  usedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  usedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('LicenseCode', codeSchema);
