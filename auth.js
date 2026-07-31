const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router(); // <-- اهم سطر
const User = require('./User');

// Middleware
const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  if (!token) return res.status(401).json({ error: 'Not authorized - no token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-passwordHash');
    if (!req.user) return res.status(401).json({ error: 'User not found' });
    if (req.user.deviceBlocked) return res.status(403).json({ error: 'Device blocked by admin' });
    req.user.lastLogin = new Date();
    await req.user.save({ validateBeforeSave: false });
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Not authorized - invalid token' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user ||!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden - insufficient role' });
    }
    next();
  };
};

// Routes مثال
router.post('/login', async (req,res)=> { /*... */ })
router.get('/me', protect, async (req,res)=> { res.json(req.user) })

// تصدير المهم
module.exports = router; // <-- اهم سطر
module.exports.protect = protect; // عشان تستخدمه في ملفات تانية
module.exports.authorize = authorize;
