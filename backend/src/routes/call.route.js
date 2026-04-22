import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// GET /api/call/ice-servers
// Returns ICE/TURN server configuration for WebRTC peer connections.
// TURN credentials are read from environment variables so they aren't
// exposed in the frontend bundle.
router.get("/ice-servers", protectRoute, (req, res) => {
  const iceServers = [
    // Free Google STUN servers (sufficient for local / simple NAT)
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];

  // Add TURN server if credentials are configured
  const turnUrl = process.env.TURN_SERVER_URL;
  const turnUsername = process.env.TURN_SERVER_USERNAME;
  const turnCredential = process.env.TURN_SERVER_CREDENTIAL;

  if (turnUrl && turnUsername && turnCredential) {
    const urls = turnUrl.split(",").map((u) => u.trim());

    for (const url of urls) {
      if (url.startsWith("stun:")) {
        // STUN servers don't need credentials
        iceServers.push({ urls: url });
      } else {
        // TURN / TURNS servers need credentials
        iceServers.push({
          urls: url,
          username: turnUsername,
          credential: turnCredential,
        });
      }
    }
  }

  res.json({ iceServers });
});

// GET /api/call/health — public diagnostic (no auth required)
// Reports whether TURN is configured without exposing credentials
router.get("/health", (req, res) => {
  const turnUrl = process.env.TURN_SERVER_URL;
  const turnUsername = process.env.TURN_SERVER_USERNAME;
  const turnCredential = process.env.TURN_SERVER_CREDENTIAL;

  res.json({
    turnConfigured: !!(turnUrl && turnUsername && turnCredential),
    turnUrlCount: turnUrl ? turnUrl.split(",").length : 0,
    hasUsername: !!turnUsername,
    hasCredential: !!turnCredential,
  });
});

export default router;
