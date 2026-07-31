const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const User = require('./User');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI);

cron.schedule('0 0 * * *', async () => {
  const backupDir = process.env.BACKUP_PATH || '/home/user/titan-panel/backups';
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const data = await User.find().lean();
  const file = path.join(backupDir, `auto_backup_${new Date().toISOString().split('T')[0]}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  console.log('Automatic 24h backup saved:', file);
});

console.log('Backup cron started (every 24 hours at midnight)');
