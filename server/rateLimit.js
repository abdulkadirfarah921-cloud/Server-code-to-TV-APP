const rateLimit = require('express-rate-limit');

exports.apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  message: { error: 'Too many requests — rate limit exceeded' },
  standardHeaders: true,
  legacyHeaders: false,
});

exports.loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts — try later' },
});
