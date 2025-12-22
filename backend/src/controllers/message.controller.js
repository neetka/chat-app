import User from "../models/user.model.js";
import Message from "../models/message.model.js";

import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import { sendOfflineNotification } from "../lib/email.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;

    // Get all users except logged in user
    const allUsers = await User.find({
      _id: { $ne: loggedInUserId },
    }).select("-password");

    // Get the last message timestamp for each conversation
    const lastMessages = await Message.aggregate([
      {
        $match: {
          $or: [{ senderId: loggedInUserId }, { receiverId: loggedInUserId }],
        },
      },
      {
        // Get the other user in the conversation
        $addFields: {
          otherUserId: {
            $cond: {
              if: { $eq: ["$senderId", loggedInUserId] },
              then: "$receiverId",
              else: "$senderId",
            },
          },
        },
      },
      {
        // Group by the other user and get the latest message time
        $group: {
          _id: "$otherUserId",
          lastMessageAt: { $max: "$createdAt" },
        },
      },
    ]);

    // Create a map of odtherUserId -> lastMessageAt
    const lastMessageMap = new Map();
    lastMessages.forEach((msg) => {
      lastMessageMap.set(msg._id.toString(), msg.lastMessageAt);
    });

    // Sort users: those with recent messages first, then by name
    const sortedUsers = allUsers.sort((a, b) => {
      const aLastMsg = lastMessageMap.get(a._id.toString());
      const bLastMsg = lastMessageMap.get(b._id.toString());

      // If both have messages, sort by most recent
      if (aLastMsg && bLastMsg) {
        return new Date(bLastMsg) - new Date(aLastMsg);
      }
      // If only a has messages, a comes first
      if (aLastMsg) return -1;
      // If only b has messages, b comes first
      if (bLastMsg) return 1;
      // If neither has messages, sort alphabetically by name
      return a.fullName.localeCompare(b.fullName);
    });

    res.status(200).json(sortedUsers);
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

export const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(id);
    if (!message) return res.status(404).json({ error: "Message not found" });

    // Only the sender can perform delete-for-everyone
    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Not authorized to delete this message" });
    }

    // Delete from DB
    await Message.findByIdAndDelete(id);

    // Notify the receiver via socket (if online)
    try {
      const receiverSocketId = getReceiverSocketId(message.receiverId.toString());
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("deleteMessage", { messageId: id });
      }
    } catch (e) {
      console.error("Error emitting deleteMessage socket event:", e.message);
    }

    return res.status(200).json({ message: "Message deleted" });
  } catch (error) {
    console.error("Error in deleteMessage controller:", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
};
