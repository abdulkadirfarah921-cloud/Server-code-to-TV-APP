const express = require('express');
const router = express.Router();
const User = require('../User');
const LicenseCode = require('../models/LicenseCode');
const ServerLog = require('../models/ServerLog');
const Channel = require('../models/Channel');
const { protect, authorize } = require('../middleware/auth');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Helper: log admin action
async function logAdmin(action, admin, target, details, req) {
  await ServerLog.create({ action, adminId: admin ? admin._id : null, target, details, ip: req.ip || '0.0.0.0' });
}

// =========== A. USER MANAGEMENT ===========

// Create user + set days
router.post('/users', protect, authorize('ADMIN','MODERATOR'), async (req, res) => {
  try {
    const { username, password, days, device, role } = req.body;
    const exists = await User.findOne({ username });
    if (exists) return res.status(409).json({ error: 'User exists' });
    const u = new User({ username, passwordHash: password, device: device || 'TV-MOBIL-PC-OPENED', subscriptionDays: days || 30, role: role || 'USER', subscriptionActive: true });
    await u.save();
    await logAdmin('CREATE_USER', req.user, username, `Created with ${days || 30} days`, req);
    res.status(201).json({ message: 'User created', user: { username: u.username, role: u.role, device: u.device, subscriptionDays: u.subscriptionDays } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// List users with search
router.get('/users', protect, authorize('ADMIN','MODERATOR'), async (req, res) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (q) filter.username = { $regex: q, $options: 'i' };
    const users = await User.find(filter).limit(limit * 1).skip((page - 1) * limit).sort({ createdAt: -1 }).lean();
    const count = await User.countDocuments(filter);
    res.json({ users, total: count, page, pages: Math.ceil(count / limit) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Update / extend / block / delete
router.put('/users/:id', protect, authorize('ADMIN','MODERATOR'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Not found' });
    const { days, subscriptionActive, deviceBlocked, device, role } = req.body;
    if (days !== undefined) user.subscriptionDays = days;
    if (subscriptionActive !== undefined) user.subscriptionActive = subscriptionActive;
    if (deviceBlocked !== undefined) user.deviceBlocked = deviceBlocked;
    if (device) user.device = device;
    if (role && req.user.role === 'ADMIN') user.role = role;
    await user.save({ validateBeforeSave: false });
    await logAdmin('UPDATE_USER', req.user, user.username, `Updated fields: ${JSON.stringify(req.body)}`, req);
    res.json({ message: 'Updated', user: { username: user.username, subscriptionActive: user.subscriptionActive, deviceBlocked: user.deviceBlocked, subscriptionDays: user.subscriptionDays } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/users/:id', protect, authorize('ADMIN'), async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'Not found' });
    await logAdmin('DELETE_USER', req.user, user.username, '', req);
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Export Excel
router.get('/users/export', protect, authorize('ADMIN','MODERATOR'), async (req, res) => {
  try {
    const users = await User.find().lean();
    const data = users.map(u => ({
      username: u.username,
      role: u.role,
      device: u.device,
      deviceBlocked: u.deviceBlocked,
      subscriptionDays: u.subscriptionDays,
      subscriptionActive: u.subscriptionActive,
      lastLogin: u.lastLogin ? u.lastLogin.toISOString() : '',
      createdAt: u.createdAt ? u.createdAt.toISOString() : ''
    }));
    const ws = xlsx.utils.json_to_sheet(data);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Users');
    const file = path.join('/tmp', `titan_users_${Date.now()}.xlsx`);
    xlsx.writeFile(wb, file);
    res.download(file, 'titan_users_export.xlsx', (err) => {
      if (!err) fs.unlinkSync(file);
    });
    await logAdmin('EXPORT_USERS', req.user, 'ALL', 'Excel export', req);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// =========== B. CODE MANAGEMENT ===========

// Generate batch codes (1000 at once concept — here batch endpoint)
router.post('/codes/batch', protect, authorize('ADMIN'), async (req, res) => {
  try {
    const { count = 100, days, type } = req.body;
    const batchSize = Math.min(count, 1000);
    const codes = [];
    for (let i = 0; i < batchSize; i++) {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
      codes.push({ code, days: days || (type === 'YEAR' ? 365 : type === '3MONTHS' ? 90 : 30), type: type || '1MONTH', used: false });
    }
    await LicenseCode.insertMany(codes);
    await logAdmin('GENERATE_CODES', req.user, `Batch ${batchSize}`, `Type ${type || '1MONTH'}`, req);
    res.json({ message: `Created ${batchSize} codes`, count: batchSize });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// List / search codes with usage info
router.get('/codes', protect, authorize('ADMIN','MODERATOR'), async (req, res) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (q) filter.code = { $regex: q, $options: 'i' };
    const codes = await LicenseCode.find(filter).limit(limit * 1).skip((page - 1) * limit).sort({ createdAt: -1 }).populate('usedBy', 'username').lean();
    const total = await LicenseCode.countDocuments(filter);
    res.json({ codes, total, page, pages: Math.ceil(total / limit) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// =========== C. SERVER MANAGEMENT ===========

router.get('/stats/live', protect, authorize('ADMIN'), async (req, res) => {
  try {
    // Approximate active connections via recent login within 5 min
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const active = await User.countDocuments({ lastLogin: { $gte: fiveMinAgo } });
    res.json({ activeUsers: active, serverTime: new Date().toISOString() });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/stats/resources', protect, authorize('ADMIN'), async (req, res) => {
  try {
    const mem = process.memoryUsage();
    const cpu = process.cpuUsage();
    res.json({ memoryUsageMB: Math.round(mem.rss / 1024 / 1024), cpuUsage: cpu, uptime: process.uptime() });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/server/restart', protect, authorize('ADMIN'), async (req, res) => {
  await logAdmin('RESTART_SERVER', req.user, 'SERVER', 'Server restart triggered (simulated)', req);
  res.json({ message: 'Restart signal sent (in production use PM2 / systemd)' });
});

router.get('/logs', protect, authorize('ADMIN','MODERATOR'), async (req, res) => {
  try {
    const logs = await ServerLog.find().limit(100).sort({ timestamp: -1 }).lean();
    res.json({ logs });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Backup endpoint (simulated — hook to cron for real 24h)
router.post('/backup', protect, authorize('ADMIN'), async (req, res) => {
  const backupDir = process.env.BACKUP_PATH || '/home/user/titan-panel/backups';
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const file = path.join(backupDir, `backup_${Date.now()}.json`);
  const data = await User.find().lean();
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  await logAdmin('BACKUP', req.user, 'DB', `Backup saved to ${file}`, req);
  res.json({ message: 'Backup completed', file });
});

// =========== D. CONTENT MANAGEMENT ===========

router.get('/channels', protect, authorize('ADMIN','MODERATOR'), async (req, res) => {
  const channels = await Channel.find().sort({ sortOrder: 1, name: 1 });
  res.json({ channels });
});

router.post('/channels', protect, authorize('ADMIN'), async (req, res) => {
  const ch = new Channel(req.body);
  await ch.save();
  await logAdmin('ADD_CHANNEL', req.user, ch.name, `URL: ${ch.url}`, req);
  res.status(201).json({ message: 'Channel added', channel: ch });
});

router.put('/channels/:id', protect, authorize('ADMIN'), async (req, res) => {
  const ch = await Channel.findByIdAndUpdate(req.params.id, req.body, { new: true });
  await logAdmin('UPDATE_CHANNEL', req.user, ch.name, 'Sorted/updated', req);
  res.json({ message: 'Updated', channel: ch });
});

router.delete('/channels/:id', protect, authorize('ADMIN'), async (req, res) => {
  const ch = await Channel.findByIdAndDelete(req.params.id);
  await logAdmin('DELETE_CHANNEL', req.user, ch ? ch.name : 'N/A', '', req);
  res.json({ message: 'Deleted' });
});

// Ads endpoint (conceptual — can integrate to push notifications)
router.post('/notifications', protect, authorize('ADMIN'), async (req, res) => {
  const { message } = req.body;
  await logAdmin('NOTIFICATION', req.user, 'ALL_USERS', message, req);
  res.json({ message: 'Notification queued to all users (implement via FCM/Expo for real push)' });
});

// =========== E. SUPPORT / PAYMENT (Framework) ===========

router.get('/support/contact', (req, res) => {
  res.json({ whatsapp: '+90 534 872 45 47', note: 'Contact via WhatsApp for payments and technical support.' });
});

router.post('/tickets', protect, async (req, res) => {
  const { title, message } = req.body;
  await ServerLog.create({ action: 'TICKET', target: req.user.username, details: `${title}: ${message}`, ip: req.ip || '0.0.0.0' });
  res.json({ message: 'Ticket submitted' });
});

module.exports = router;
