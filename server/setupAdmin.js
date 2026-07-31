require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    const username = process.env.ADMIN_USERNAME || 'SHADOWKING';
    const plainPass = process.env.ADMIN_PASSWORD || 'CHANGE_ME';
    const existing = await User.findOne({ username });
    if (existing) {
      console.log('Admin already exists:', username);
      process.exit(0);
    }
    const salt = await bcrypt.genSalt(12);
    const user = new User({
      username,
      passwordHash: await bcrypt.hash(plainPass, salt),
      role: 'ADMIN',
      device: process.env.ADMIN_DEVICE || 'TV-MOBIL-PC-OPENED',
      subscriptionDays: 365,
      subscriptionActive: true
    });
    await user.save();
    console.log('Admin created:', username, '(role:', user.role, ')');
    process.exit(0);
  })
  .catch(err => { console.error(err); process.exit(1); });
