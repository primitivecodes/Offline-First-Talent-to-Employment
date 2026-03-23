/**
 * Simple in-memory rate limiter — no extra dependencies needed.
 * For production at scale, replace with express-rate-limit + Redis.
 */

const store = new Map(); // key → { count, resetAt }

/**
 * createRateLimit(options)
 * @param {number} windowMs   - Time window in ms
 * @param {number} max        - Max requests per window
 * @param {string} message    - Error message to return
 * @param {function} keyFn    - Function(req) → string key (defaults to IP)
 */
const createRateLimit = ({ windowMs, max, message, keyFn }) => {
  return (req, res, next) => {
    const key  = keyFn ? keyFn(req) : (req.ip || 'unknown');
    const now  = Date.now();
    const data = store.get(key);

    if (!data || now > data.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (data.count >= max) {
      const retryAfter = Math.ceil((data.resetAt - now) / 1000);
      res.set('Retry-After', retryAfter);
      return res.status(429).json({
        message: message || 'Too many requests. Please try again later.',
        retryAfterSeconds: retryAfter,
      });
    }

    data.count++;
    return next();
  };
};

// Clean stale entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of store.entries()) {
    if (now > val.resetAt) store.delete(key);
  }
}, 10 * 60 * 1000);

// ── Pre-built limiters ─────────────────────────────────

// Login: 10 attempts per 1 minutes per IP
const loginLimiter = createRateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts. Please wait 1 minutes and try again.',
});

// Register: 5 accounts in 5 minutes per IP
const registerLimiter = createRateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  message: 'Too many accounts created from this IP. Please try again in 5 minutes.',
});

// Password reset: 3 requests per hour per email
const forgotPasswordLimiter = createRateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: 'Too many password reset requests. Please wait an hour.',
  keyFn: (req) => (req.body.email || req.ip || 'unknown').toLowerCase(),
});

// Payment: 5 initiation attempts per 10 minutes per user
const paymentLimiter = createRateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: 'Too many payment requests. Please wait 10 minutes.',
  keyFn: (req) => req.user?.id || req.ip,
});

// General API: 200 requests per minute per IP
const generalLimiter = createRateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: 'Too many requests. Please slow down.',
});

module.exports = {
  loginLimiter,
  registerLimiter,
  forgotPasswordLimiter,
  paymentLimiter,
  generalLimiter,
};
