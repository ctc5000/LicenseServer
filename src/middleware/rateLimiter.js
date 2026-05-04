const rateLimit = require('express-rate-limit');

const licenseCheckLimiter = rateLimit({
    windowMs: process.env.RATE_LIMIT_WINDOW_MS || 60000,
    max: process.env.RATE_LIMIT_MAX_REQUESTS || 100,
    message: { error: 'Слишком много запросов. Попробуйте позже.' },
    standardHeaders: true,
    legacyHeaders: false
});

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: { error: 'Превышен лимит запросов' }
});

module.exports = { licenseCheckLimiter, apiLimiter };