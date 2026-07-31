const crypto = require('crypto');
const ENCRYPT_KEY = process.env.DB_ENCRYPT_KEY || 'default_key_32bytes_!!';

function encrypt(text) {
  if (!text) return text;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPT_KEY.slice(0,32)), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text) {
  if (!text || !text.includes(':')) return text;
  const parts = text.split(':');
  const iv = Buffer.from(parts.shift(), 'hex');
  const encrypted = parts.join(':');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPT_KEY.slice(0,32)), iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

module.exports = { encrypt, decrypt };
