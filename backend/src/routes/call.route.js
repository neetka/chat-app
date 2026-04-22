import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// GET /api/call/ice-servers
// Returns ICE/TURN server configuration for WebRTC peer connections.
router.get("/ice-servers", protectRoute, (req, res) => {
  const iceServers = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];

  const turnUsername = process.env.TURN_SERVER_USERNAME;
  const turnCredential = process.env.TURN_SERVER_CREDENTIAL;

  if (turnUsername && turnCredential) {
    // Metered.ca TURN server URLs (standard format)
    const turnUrls = [
      "stun:stun.relay.metered.ca:80",
      "turn:global.relay.metered.ca:80",
      "turn:global.relay.metered.ca:80?transport=tcp",
      "turn:global.relay.metered.ca:443",
      "turns:global.relay.metered.ca:443?transport=tcp",
    ];

    for (const url of turnUrls) {
      if (url.startsWith("stun:")) {
        iceServers.push({ urls: url });
      } else {
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
router.get("/health", (req, res) => {
  const turnUsername = process.env.TURN_SERVER_USERNAME;
  const turnCredential = process.env.TURN_SERVER_CREDENTIAL;

  res.json({
    turnConfigured: !!(turnUsername && turnCredential),
    hasUsername: !!turnUsername,
    hasCredential: !!turnCredential,
  });
});

export default router;
