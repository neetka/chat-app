import nodemailer from "nodemailer";

// Create reusable transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || "gmail",
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: process.env.EMAIL_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // App password for Gmail
    },
  });
};

// Track sent notifications to avoid spamming (userId -> lastNotificationTime)
const notificationCooldown = new Map();
const COOLDOWN_PERIOD = 5 * 60 * 1000; // 5 minutes cooldown between emails

/**
 * Check if we can send a notification (respecting cooldown)
 */
const canSendNotification = (userId) => {
  const lastSent = notificationCooldown.get(userId);
  if (!lastSent) return true;
  return Date.now() - lastSent > COOLDOWN_PERIOD;
};

/**
 * Mark notification as sent
 */
const markNotificationSent = (userId) => {
  notificationCooldown.set(userId, Date.now());
};

/**
 * Send offline notification email
 * @param {Object} receiver - The offline user's info
 * @param {Object} sender - The sender's info
 * @param {boolean} hasImage - Whether message contains an image
 */
export const sendOfflineNotification = async (
  receiver,
  sender,
  hasImage = false
) => {
  // Check if email is configured
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log("[Email] Email not configured, skipping notification");
    return { success: false, reason: "not_configured" };
  }

  // Check cooldown to avoid spam
  if (!canSendNotification(receiver._id.toString())) {
    console.log(`[Email] Cooldown active for ${receiver.email}, skipping`);
    return { success: false, reason: "cooldown" };
  }

  try {
    const transporter = createTransporter();

    const appName = process.env.APP_NAME || "ChatApp";
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

    const mailOptions = {
      from: `"${appName}" <${process.env.EMAIL_USER}>`,
      to: receiver.email,
      subject: `💬 New message from ${sender.fullName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Message</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5; padding: 20px 0;">
            <tr>
              <td align="center">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">
                        💬 ${appName}
                      </h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <p style="color: #333; font-size: 18px; margin: 0 0 20px 0;">
                        Hi <strong>${receiver.fullName}</strong>,
                      </p>
                      
                      <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #667eea;">
                        <table role="presentation" cellspacing="0" cellpadding="0">
                          <tr>
                            <td style="vertical-align: top; padding-right: 15px;">
                              <img src="${
                                sender.profilePic ||
                                "https://api.dicebear.com/7.x/avataaars/svg?seed=" +
                                  sender.fullName
                              }" 
                                   alt="${sender.fullName}" 
                                   style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">
                            </td>
                            <td style="vertical-align: middle;">
                              <p style="margin: 0; color: #333; font-size: 16px;">
                                <strong>${
                                  sender.fullName
                                }</strong> sent you a ${
        hasImage ? "photo" : "message"
      }
                              </p>
                              <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">
                                🔒 Message is encrypted - open the app to read it
                              </p>
                            </td>
                          </tr>
                        </table>
                      </div>
                      
                      <p style="color: #666; font-size: 14px; margin: 20px 0;">
                        You received this notification because you were offline when the message was sent.
                      </p>
                      
                      <!-- CTA Button -->
                      <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 30px 0;">
                        <tr>
                          <td align="center">
                            <a href="${frontendUrl}" 
                               style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                              Open ${appName}
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #eee;">
                      <p style="color: #999; font-size: 12px; margin: 0;">
                        This is an automated notification. You won't receive another email for the next 5 minutes.
                      </p>
                      <p style="color: #999; font-size: 12px; margin: 10px 0 0 0;">
                        © ${new Date().getFullYear()} ${appName}. All messages are end-to-end encrypted.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      text: `Hi ${receiver.fullName},\n\n${sender.fullName} sent you a ${
        hasImage ? "photo" : "message"
      }.\n\n🔒 The message is encrypted - open the app to read it.\n\nOpen ${appName}: ${frontendUrl}\n\nThis is an automated notification.`,
    };

    await transporter.sendMail(mailOptions);
    markNotificationSent(receiver._id.toString());

    console.log(`[Email] Notification sent to ${receiver.email}`);
    return { success: true };
  } catch (error) {
    console.error("[Email] Failed to send notification:", error.message);
    return { success: false, reason: "error", error: error.message };
  }
};

/**
 * Verify email configuration is working
 */
export const verifyEmailConfig = async () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return { configured: false, message: "Email credentials not set" };
  }

  try {
    const transporter = createTransporter();
    await transporter.verify();
    return { configured: true, message: "Email configuration verified" };
  } catch (error) {
    return { configured: false, message: error.message };
  }
};
