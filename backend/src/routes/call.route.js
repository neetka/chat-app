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
    const urls = turnUrl
      .split(",")
      .map((u) => u.trim().replace(/[^\x20-\x7E]/g, "")) // strip hidden/control chars
      .filter((u) => u.length > 0);

    for (const url of urls) {
      // Validate transport parameter if present
      const transportMatch = url.match(/[?&]transport=(\w+)/i);
      if (transportMatch) {
        const transport = transportMatch[1].toLowerCase();
        if (transport !== "udp" && transport !== "tcp") {
          console.warn(`Skipping ICE URL with invalid transport "${transport}": ${url}`);
          continue;
        }
      }

      if (url.startsWith("stun:")) {
        iceServers.push({ urls: url });
      } else if (url.startsWith("turn:") || url.startsWith("turns:")) {
        iceServers.push({
          urls: url,
          username: turnUsername.trim(),
          credential: turnCredential.trim(),
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
