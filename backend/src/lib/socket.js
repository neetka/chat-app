import { Server } from "socket.io";
import http from "http";
import express from "express";
import Message from "../models/message.model.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (process.env.NODE_ENV === "production") {
        const allowedOrigin = process.env.FRONTEND_URL || "http://localhost:5173";
        callback(null, origin === allowedOrigin);
      } else {
        // Allow any localhost origin in development
        const isLocalhost = origin && /^http:\/\/localhost:\d+$/.test(origin);
        callback(null, isLocalhost);
      }
    },
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
  if (userId) {
    userSocketMap[userId] = socket.id;

    // Update messages sent TO this user that are 'sent' -> 'delivered'
    try {
      const result = await Message.updateMany(
        { receiverId: userId, status: "sent" },
        { $set: { status: "delivered" } }
      );

      if (result.modifiedCount > 0) {
        // Find distinct senders of these messages to notify them
        // This is a bit complex to do perfectly efficiently, but we can just broadcast 
        // that THIS user received messages, or verify per-sender.
        // For simplicity and performance in this demo, we can fetch the distinct senders 
        // of the just-updated messages if we want precisely targeted events, or 
        // we can just let the client handle it if we emit a general "userOnline" 
        // but explicit events are better.
        
        // Let's notify specific senders that their messages to this user are delivered
        const updatedMessages = await Message.find({ receiverId: userId, status: "delivered" }).select("senderId");
        const senders = [...new Set(updatedMessages.map(m => m.senderId.toString()))];
        
        senders.forEach(senderId => {
           const senderSocketId = userSocketMap[senderId];
           if (senderSocketId) {
             io.to(senderSocketId).emit("messagesDelivered", { receiverId: userId });
           }
        });
      }
    } catch (error) {
       console.error("Error updating delivery status:", error);
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

  socket.on("deleteMessage", ({ receiverId, messageId }) => {
    const receiverSocketId = userSocketMap[receiverId];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("deleteMessage", { messageId });
    }
  });

  socket.on("joinGroup", (groupId) => {
      socket.join(`group:${groupId}`);
      console.log(`User ${socket.id} joined group:${groupId}`);
  });

  socket.on("leaveGroup", (groupId) => {
      socket.leave(`group:${groupId}`);
  });

  // ── WebRTC Mesh Signaling Events ─────────────────────────────
  
  // Fired when a user initiates a call to multiple participants
  socket.on("call:ring", ({ toUsers, callType, roomId, callerData }) => {
    // Notify all targeted users
    toUsers.forEach((targetId) => {
      const receiverSocketId = userSocketMap[targetId];
      if (receiverSocketId && targetId !== userId) { // Don't ring self
        io.to(receiverSocketId).emit("call:incoming", {
          fromUser: callerData || { _id: userId },
          roomId,
          callType,
          participants: toUsers, // Useful for UI to know who else is ringing
        });
      }
    });
  });

  // Fired when a user accepts a call
  socket.on("call:join", ({ roomId }) => {
    socket.join(`call:${roomId}`);
    // Notify others in the room that I just joined, so they can initiate P2P Offers to me
    socket.to(`call:${roomId}`).emit("call:user-joined", { userId });
  });

  // Fired when an offer is sent to a specific user
  socket.on("call:offer", ({ to, offer, roomId }) => {
    const receiverSocketId = userSocketMap[to];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("call:offer", { from: userId, offer, roomId });
    }
  });

  // Fired when an answer is sent back
  socket.on("call:answer", ({ to, answer, roomId }) => {
    const callerSocketId = userSocketMap[to];
    if (callerSocketId) {
      io.to(callerSocketId).emit("call:answer", { from: userId, answer, roomId });
    }
  });

  // Fired for trickle ICE
  socket.on("call:ice-candidate", ({ to, candidate }) => {
    const receiverSocketId = userSocketMap[to];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("call:ice-candidate", { from: userId, candidate });
    }
  });

  // Fired when rejecting a ringing call
  socket.on("call:reject", ({ toUser, roomId }) => {
    const callerSocketId = userSocketMap[toUser];
    if (callerSocketId) {
      io.to(callerSocketId).emit("call:rejected", { from: userId, roomId });
    }
  });

  // Fired when manually leaving or hanging up
  socket.on("call:leave", ({ roomId }) => {
    socket.leave(`call:${roomId}`);
    // Tell others in the call room I have left
    socket.to(`call:${roomId}`).emit("call:user-left", { userId });
  });

  // ── End WebRTC Mesh Signaling ────────────────────────────────

  socket.on("disconnect", () => {
    console.log("A user disconnected", socket.id);
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
    
    // Ideally we should tell their call rooms they dropped if we kept track of their active calls.
    // For now the client P2P 'disconnected' statechange handles unexpected drops!
  });
});

export { io, app, server };
