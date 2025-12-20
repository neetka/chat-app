#!/usr/bin/env node

/**
 * Setup Script for Chat Application
 * This script helps you set up the application for the first time
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import readline from "readline";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query) =>
  new Promise((resolve) => rl.question(query, resolve));

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  red: "\x1b[31m",
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
};

async function main() {
  console.log("\n" + colors.blue + "=".repeat(50));
  console.log("🔐 Chat Application Setup");
  console.log("=".repeat(50) + colors.reset + "\n");

  log.info("This script will help you configure your environment variables.");

  // Check if .env already exists
  const envPath = path.join(__dirname, "backend", ".env");
  if (fs.existsSync(envPath)) {
    log.warn("backend/.env already exists!");
    const overwrite = await question("Do you want to overwrite it? (y/N): ");
    if (overwrite.toLowerCase() !== "y") {
      log.info("Setup cancelled.");
      rl.close();
      return;
    }
  }

  console.log(
    "\n" +
      colors.yellow +
      "Please provide the following configuration:" +
      colors.reset +
      "\n"
  );

  // Gather configuration
  const port = (await question("Server PORT (default: 5001): ")) || "5001";
  const nodeEnv =
    (await question(
      "NODE_ENV (development/production, default: development): "
    )) || "development";
  const mongoUri =
    (await question(
      "MongoDB URI (default: mongodb://localhost:27017/chatapp): "
    )) || "mongodb://localhost:27017/chatapp";
  const jwtSecret = await question(
    "JWT_SECRET (leave empty to generate random): "
  );
  const cloudName = await question("Cloudinary Cloud Name (optional): ");
  const cloudApiKey = await question("Cloudinary API Key (optional): ");
  const cloudApiSecret = await question("Cloudinary API Secret (optional): ");
  const frontendUrl =
    (await question(
      "Frontend URL for production (default: http://localhost:5173): "
    )) || "http://localhost:5173";

  // Generate JWT secret if not provided
  const finalJwtSecret = jwtSecret || generateRandomString(64);

  // Create .env content
  const envContent = `# Server Configuration
PORT=${port}
NODE_ENV=${nodeEnv}

# Database
MONGODB_URI=${mongoUri}

# JWT Secret
JWT_SECRET=${finalJwtSecret}

# Cloudinary Configuration (for image uploads)
CLOUDINARY_CLOUD_NAME=${cloudName}
CLOUDINARY_API_KEY=${cloudApiKey}
CLOUDINARY_API_SECRET=${cloudApiSecret}

# Frontend URL (for CORS in production)
FRONTEND_URL=${frontendUrl}
`;

  // Write .env file
  fs.writeFileSync(envPath, envContent);
  log.success("Created backend/.env");

  console.log("\n" + colors.green + "=".repeat(50));
  console.log("✓ Setup completed successfully!");
  console.log("=".repeat(50) + colors.reset + "\n");

  log.info("Next steps:");
  console.log("  1. Make sure MongoDB is running");
  console.log("  2. Install dependencies: npm install");
  console.log("  3. Start backend: cd backend && npm run dev");
  console.log("  4. Start frontend: cd frontend && npm run dev");
  console.log("  5. Open http://localhost:5173 in your browser\n");

  rl.close();
}

function generateRandomString(length) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

main().catch((error) => {
  log.error("Setup failed: " + error.message);
  process.exit(1);
});
