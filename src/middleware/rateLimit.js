const { rateLimit } = require('express-rate-limit');

function createLoginLimiter(limit = 10) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, res) => res.status(429).json({ error: 'Zu viele Anmeldeversuche. Bitte in 15 Minuten erneut versuchen.' })
  });
}

module.exports = { createLoginLimiter };
