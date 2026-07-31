const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { encrypt, decrypt } = require('../crypto');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, index: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['ADMIN','MODERATOR','USER'], default: 'USER' },
  device: { type: String, default: 'TV-MOBIL-PC-OPENED' },
  deviceBlocked: { type: Boolean, default: false },
  subscriptionDays: { type: Number, default: 30 },
  subscriptionActive: { type: Boolean, default: true },
  lastLogin: { type: Date, default: null },
  emailEnc: { type: String, default: null }, // AES encrypted
  phoneEnc: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

// Pre-save: hash password; encrypt email/phone
userSchema.pre('save', async function(next) {
  if (this.isModified('passwordHash') && !this.passwordHash.startsWith('$2a')) {
    const salt = await bcrypt.genSalt(12);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  }
  if (this.isModified('emailEnc') && this.emailEnc && !this.emailEnc.includes(':')) {
    // Assume raw email passed into emailEnc temporarily? Better: separate field handling
  }
  next();
});

userSchema.methods.comparePassword = async function(candidate) {
  return await bcrypt.compare(candidate, this.passwordHash);
};

userSchema.methods.encryptField = function(fieldName, raw) {
  if (!raw) return;
  const encrypted = encrypt(raw);
  this[fieldName] = encrypted;
};

userSchema.methods.decryptField = function(fieldName) {
  if (!this[fieldName]) return '';
  return decrypt(this[fieldName]);
};

module.exports = mongoose.model('User', userSchema);
