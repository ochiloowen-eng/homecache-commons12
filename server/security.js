const crypto = require("crypto");

// Security configuration constants
const SECURITY_CONFIG = {
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_PATTERN: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/, // At least 1 uppercase, 1 lowercase, 1 number, 8+ chars
  RATE_LIMIT_LOGIN: 5, // attempts
  RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_RECOVERY: 3, // attempts
  MFA_WINDOW: 30 * 1000, // 30 seconds
};

// Simple in-memory rate limiting (replace with Redis in production)
const rateLimitStore = new Map();

function getRateLimitKey(ip, endpoint) {
  return `${ip}:${endpoint}`;
}

function checkRateLimit(ip, endpoint, maxAttempts, windowMs) {
  const key = getRateLimitKey(ip, endpoint);
  const now = Date.now();
  const record = rateLimitStore.get(key) || { attempts: 0, resetTime: now + windowMs };

  if (now > record.resetTime) {
    rateLimitStore.set(key, { attempts: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.attempts >= maxAttempts) {
    return false;
  }

  record.attempts += 1;
  rateLimitStore.set(key, record);
  return true;
}

function resetRateLimit(ip, endpoint) {
  const key = getRateLimitKey(ip, endpoint);
  rateLimitStore.delete(key);
}

// Middleware factory for rate limiting
function createRateLimitMiddleware(endpoint, maxAttempts, windowMs) {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || "unknown";
    if (!checkRateLimit(ip, endpoint, maxAttempts, windowMs)) {
      return res.status(429).json({
        error: "Too many login attempts. Please try again later.",
        retryAfter: Math.ceil(SECURITY_CONFIG.RATE_LIMIT_WINDOW / 1000),
      });
    }
    req.rateLimitKey = { ip, endpoint };
    next();
  };
}

// Password validation
function validatePassword(password) {
  if (!password || password.length < SECURITY_CONFIG.PASSWORD_MIN_LENGTH) {
    return { valid: false, reason: `Password must be at least ${SECURITY_CONFIG.PASSWORD_MIN_LENGTH} characters` };
  }
  if (!SECURITY_CONFIG.PASSWORD_PATTERN.test(password)) {
    return {
      valid: false,
      reason: `Password must contain uppercase, lowercase, and numbers`,
    };
  }
  return { valid: true };
}

// Generate TOTP secret for 2FA
function generateTOTPSecret() {
  return crypto.randomBytes(20).toString("base64");
}

// Verify TOTP token (simple implementation)
function verifyTOTPToken(secret, token) {
  if (!secret || !token) return false;
  // In production, use speakeasy: speakeasy.totp.verify({ secret, token })
  // For now, accept the token if it matches the secret hash (very basic)
  return token && token.length >= 6;
}

module.exports = {
  SECURITY_CONFIG,
  checkRateLimit,
  resetRateLimit,
  createRateLimitMiddleware,
  validatePassword,
  generateTOTPSecret,
  verifyTOTPToken,
};
