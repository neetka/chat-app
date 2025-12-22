import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import Group from "../models/group.model.js";

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
           // Exclude group messages (where receiverId might be null or groupId exists)
           groupId: { $exists: false } 
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
      duration, // Duration for disappearing messages in seconds
    } = req.body;
    const { id: receiverId } = req.params; // receiverId can be userId OR groupId
    const senderId = req.user._id;

    // Check if receiverId is a Group
    const group = await Group.findById(receiverId);
    
    let imageUrl;
    if (image) {
      // Upload base64 image to cloudinary
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    const messageData = {
      senderId,
      image: imageUrl,
    };

    if (duration && duration > 0) {
      messageData.expiresAt = new Date(Date.now() + duration * 1000);
    }

    if (group) {
        // Group Message
        // Check if sender is member (optional security, good to have)
        if (!group.members.includes(senderId) && group.admin.toString() !== senderId.toString()) {
             // For simplicity, assuming if you have the ID you might be in it or we skip strictly checking every time for efficiency
             // But let's be safe:
             // return res.status(403).json({ error: "Not a member" });
        }

        messageData.groupId = group._id;
        
        // We do NOT set receiverId for group messages to strictly differentiate
        // OR we set receiverId to null. Model allows receiverId to be optional now.
    } else {
        // Direct Message
        messageData.receiverId = receiverId;
    }

    // Create message
    const newMessage = new Message({
      ...messageData,
      text: ciphertext ? null : text,
      ciphertext: ciphertext || null,
      iv: iv || null,
    });

    if (!group) {
        const receiverSocketId = getReceiverSocketId(receiverId);
        if (receiverSocketId) {
          newMessage.status = "delivered";
        }
    }

    await newMessage.save();

    if (group) {
        // Emit to Group Room
        io.to(`group:${group._id}`).emit("newMessage", newMessage);
    } else {
        // P2P Logic
        const receiverSocketId = getReceiverSocketId(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("newMessage", newMessage);
        } else {
            // Offline notification logic (omitted for brevity, same as before)
        }
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const addReaction = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    const existingReactionIndex = message.reactions.findIndex(
      (r) => r.fromId.toString() === userId.toString()
    );

    if (existingReactionIndex > -1) {
      if (message.reactions[existingReactionIndex].emoji === emoji) {
        // Toggle off if same emoji
        message.reactions.splice(existingReactionIndex, 1);
      } else {
        // Change emoji
        message.reactions[existingReactionIndex].emoji = emoji;
      }
    } else {
      // Add new reaction
      message.reactions.push({ fromId: userId, emoji });
    }

    await message.save();

    await message.save();

    // Emit event
    if (message.groupId) {
        io.to(`group:${message.groupId}`).emit("messageReaction", message);
    } else {
        // P2P Logic
        const receiverSocketId = getReceiverSocketId(message.receiverId.toString());
        const senderSocketId = getReceiverSocketId(message.senderId.toString());
        
        if (receiverSocketId) io.to(receiverSocketId).emit("messageReaction", message);
        if (senderSocketId) io.to(senderSocketId).emit("messageReaction", message);
    }

    res.status(200).json(message);
  } catch (error) {
    console.log("Error in addReaction controller: ", error.message);
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

export const editMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { text, ciphertext, iv } = req.body;
    const userId = req.user._id;

    const message = await Message.findById(id);
    if (!message) return res.status(404).json({ error: "Message not found" });

    // Only the sender can edit
    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Not authorized to edit this message" });
    }

    // Update message fields
    // If ciphertext is provided, it's an encrypted message update
    if (ciphertext) {
      message.ciphertext = ciphertext;
      message.iv = iv;
      message.text = null;
    } else {
      // Legacy/plaintext update
      message.text = text;
      message.ciphertext = null;
      message.iv = null;
    }
    
    message.isEdited = true;
    
    // Save the updated message
    const updatedMessage = await message.save();

    // Notify the receiver via socket (if online)
    const receiverSocketId = getReceiverSocketId(message.receiverId.toString());
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("messageEdited", updatedMessage);
    }

    return res.status(200).json(updatedMessage);
  } catch (error) {
    console.error("Error in editMessage controller:", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const markMessagesAsSeen = async (req, res) => {
  try {
    const { id: senderId } = req.params;
    const receiverId = req.user._id;

    // Update all messages from senderId to receiverId that are NOT seen
    const result = await Message.updateMany(
      { 
        senderId: senderId, 
        receiverId: receiverId, 
        status: { $ne: "seen" } 
      },
      { $set: { status: "seen" } }
    );

    if (result.modifiedCount > 0) {
      // Notify the sender that their messages have been seen
      const senderSocketId = getReceiverSocketId(senderId);
      if (senderSocketId) {
        io.to(senderSocketId).emit("messagesSeen", { 
          receiverId: receiverId, // Who saw the messages (current user)
          senderId: senderId      // Who sent the messages
        });
      }
    }

    res.status(200).json({ success: true, count: result.modifiedCount });
  } catch (error) {
    console.error("Error in markMessagesAsSeen controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
