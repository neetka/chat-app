import rateLimit from "express-rate-limit";

// ─── General API limiter ───────────────────────────────────────────
// Applies to every request that hits the server.
// Allows 100 requests per 15-minute window per IP address.
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true, // Return rate-limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  message: {
    error: "Too many requests, please try again after 15 minutes.",
  },
});

// ─── Auth limiter (login / signup) ─────────────────────────────────
// Much stricter — prevents brute-force password guessing and
// credential stuffing attacks.
// Allows 10 attempts per 15-minute window per IP address.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error:
      "Too many login/signup attempts. Please try again after 15 minutes.",
  },
});

// ─── Message-sending limiter ───────────────────────────────────────
// Prevents message-spam while still allowing normal conversation.
// Allows 30 messages per 1-minute window per IP address.
export const messageLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "You are sending messages too fast. Please slow down.",
  },
});
