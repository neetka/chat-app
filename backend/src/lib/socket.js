import { Server } from "socket.io";
import http from "http";
import express from "express";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://yapp-27.vercel.app",
  "https://yapp-ixs5.onrender.com",
  process.env.FRONTEND_URL,
].filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

// used to store online users
const userSocketMap = {}; // {userId: socketId}

io.on("connection", async (socket) => {
  console.log("A user connected", socket.id);

  const userId = socket.handshake.query.userId;
  if (userId && userId !== "undefined" && userId !== "null") {
    userSocketMap[userId] = socket.id;
    
    // Update messages sent TO this user that are 'sent' -> 'delivered'
    try {
      await Message.updateMany(
        { receiverId: userId, status: "sent" },
        { $set: { status: "delivered" } }
      );
      
      const updatedMessages = await Message.find({ receiverId: userId, status: "delivered" }).select("senderId");
      const senders = [...new Set(updatedMessages.map(m => m.senderId.toString()))];
      
      senders.forEach(senderId => {
         const senderSocketId = userSocketMap[senderId];
         if (senderSocketId) {
           io.to(senderSocketId).emit("messagesDelivered", { receiverId: userId });
         }
      });
    } catch (error) {
       console.error("Error updating delivery status:", error);
    }

    // ── Send & clear missed call notifications ───────────────
    try {
      const user = await User.findById(userId).select("missedCallNotifications");
      if (user?.missedCallNotifications?.length > 0) {
        socket.emit("call:missed_notifications", user.missedCallNotifications);
        await User.findByIdAndUpdate(userId, { $set: { missedCallNotifications: [] } });
      }
    } catch (err) {
      console.error("Error sending missed call notifications:", err);
    }
  }

  // io.emit() is used to send events to all the connected clients
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  socket.on("typing", ({ receiverId }) => {
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("typing", { senderId: userId });
    }
  });

  socket.on("stopTyping", ({ receiverId }) => {
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("stopTyping", { senderId: userId });
    }
  });

  // Group typing indicators
  socket.on("groupTyping", async ({ groupId }) => {
    try {
      const group = await User.findById(userId).select("fullName profilePic");
      io.to(`group:${groupId}`).emit("groupTyping", { 
        senderId: userId,
        senderName: group?.fullName || "User",
        senderPic: group?.profilePic || "/avatar.png"
      });
    } catch (err) {
      console.error("Error in groupTyping:", err);
    }
  });

  socket.on("stopGroupTyping", ({ groupId }) => {
    io.to(`group:${groupId}`).emit("stopGroupTyping", { senderId: userId });
  });

  socket.on("deleteMessage", ({ receiverId, messageId }) => {
    const receiverSocketId = userSocketMap[receiverId];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("deleteMessage", { messageId });
    }
  });

  socket.on("joinGroup", (groupId) => {
      socket.join(`group:${groupId}`);
  });

  socket.on("leaveGroup", (groupId) => {
      socket.leave(`group:${groupId}`);
  });

  // ── WebRTC Signaling Events ──────────────────────────────────
  socket.on("call:initiate", async ({ to, offer, callType }) => {
    const receiverSocketId = userSocketMap[to];

    // Fetch caller info (needed for both online + offline paths)
    let callerName = "User";
    let callerPic = "";
    try {
      const caller = await User.findById(userId).select("fullName profilePic");
      if (caller) {
        callerName = caller.fullName;
        callerPic = caller.profilePic || "";
      }
    } catch (err) {
      console.error("Error fetching caller info:", err);
    }

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("call:incoming", {
        from: userId,
        callerName,
        callerPic,
        offer,
        callType,
      });
    } else {
      // Receiver is offline — record missed call
      try {
        await User.findByIdAndUpdate(to, {
          $inc: { "stats.callsMissed": 1 },
          $push: {
            missedCallNotifications: {
              $each: [{ fromId: userId, fromName: callerName, fromPic: callerPic, callType, at: new Date() }],
              $slice: -20, // keep only last 20
            },
          },
        });
      } catch (err) {
        console.error("Error recording missed call:", err);
      }
      socket.emit("call:user-offline", { userId: to });
    }
  });

  socket.on("call:accept", ({ to, answer }) => {
    const callerSocketId = userSocketMap[to];
    if (callerSocketId) {
      io.to(callerSocketId).emit("call:accepted", {
        from: userId,
        answer,
      });
    }
  });

  socket.on("call:reject", ({ to }) => {
    const callerSocketId = userSocketMap[to];
    if (callerSocketId) {
      io.to(callerSocketId).emit("call:rejected", { from: userId });
    }
  });

  socket.on("call:end", async ({ to }) => {
    const otherSocketId = userSocketMap[to];
    if (otherSocketId) {
      io.to(otherSocketId).emit("call:ended", { from: userId });
    }
    // Increment callsDone for both parties
    try {
      await User.updateMany(
        { _id: { $in: [userId, to] } },
        { $inc: { "stats.callsDone": 1 } }
      );
    } catch (err) {
      console.error("Error incrementing callsDone:", err);
    }
  });

  socket.on("call:ice-candidate", ({ to, candidate }) => {
    const otherSocketId = userSocketMap[to];
    if (otherSocketId) {
      io.to(otherSocketId).emit("call:ice-candidate", {
        from: userId,
        candidate,
      });
    }
  });
  // ── End WebRTC Signaling ─────────────────────────────────────
  
  socket.on("disconnect", async () => {
    console.log("A user disconnected", socket.id);
    if (userId && userSocketMap[userId] === socket.id) {
       delete userSocketMap[userId];
       // Update lastSeen timestamp
       try {
         const lastSeen = new Date();
         await User.findByIdAndUpdate(userId, { lastSeen });
         io.emit("user:lastSeen", { userId, lastSeen });
       } catch (err) {
         console.error("Error updating lastSeen:", err);
       }
    }
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { io, app, server };

