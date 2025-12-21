import User from "../models/user.model.js";
import Message from "../models/message.model.js";

import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import { sendOfflineNotification } from "../lib/email.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({
      _id: { $ne: loggedInUserId },
    }).select("-password");

    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    });

    // Return messages - server only stores ciphertext, never plaintext
    // Decryption happens client-side using shared secret
    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const {
      text, // Plain text (only for unencrypted/legacy messages)
      image,
      ciphertext, // AES-256-GCM encrypted message content
      iv, // Initialization vector for AES-GCM (12 bytes, base64)
    } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    let imageUrl;
    if (image) {
      // Upload base64 image to cloudinary
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    // Create message - if ciphertext is provided, message is E2E encrypted
    // Server NEVER has access to the encryption key or plaintext
    const newMessage = new Message({
      senderId,
      receiverId,
      // Store either encrypted content or plain text (for legacy)
      text: ciphertext ? null : text || "",
      image: imageUrl,
      // E2EE fields - server stores but cannot decrypt
      ciphertext: ciphertext || null,
      iv: iv || null,
    });

    await newMessage.save();

    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      // User is online - forward encrypted message via WebSocket
      io.to(receiverSocketId).emit("newMessage", newMessage);
    } else {
      // User is OFFLINE - send email notification
      try {
        const [receiver, sender] = await Promise.all([
          User.findById(receiverId).select("email fullName profilePic"),
          User.findById(senderId).select("fullName profilePic"),
        ]);

        if (receiver && sender) {
          // Send notification asynchronously (don't wait for it)
          sendOfflineNotification(receiver, sender, !!imageUrl).catch((err) => {
            console.error("[Email] Async notification error:", err.message);
          });
        }
      } catch (emailError) {
        // Don't fail the message send if email fails
        console.error(
          "[Email] Error preparing notification:",
          emailError.message
        );
      }
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
