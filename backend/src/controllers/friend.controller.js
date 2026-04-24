import FriendRequest from "../models/friendRequest.model.js";
import User from "../models/user.model.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

/**
 * POST /api/friends/request/:userId
 * Send a friend request to another user.
 */
export const sendFriendRequest = async (req, res) => {
  try {
    const senderId = req.user._id;
    const { userId: receiverId } = req.params;

    // Prevent self-request
    if (senderId.toString() === receiverId) {
      return res.status(400).json({ error: "Cannot send a friend request to yourself" });
    }

    // Check receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if a request already exists in EITHER direction
    const existing = await FriendRequest.findOne({
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
    });

    if (existing) {
      if (existing.status === "accepted") {
        return res.status(400).json({ error: "You are already friends" });
      }
      if (existing.status === "pending") {
        // If THEY already sent ME a request, auto-accept it
        if (existing.senderId.toString() === receiverId) {
          existing.status = "accepted";
          await existing.save();

          // Notify both parties
          const receiverSocketId = getReceiverSocketId(receiverId);
          if (receiverSocketId) {
            io.to(receiverSocketId).emit("friend:request-accepted", {
              requestId: existing._id,
              userId: senderId,
            });
          }

          return res.status(200).json({ message: "Friend request accepted", request: existing });
        }
        return res.status(400).json({ error: "Friend request already sent" });
      }
      if (existing.status === "rejected") {
        // Allow re-sending after rejection: reset to pending
        existing.status = "pending";
        existing.senderId = senderId;
        existing.receiverId = receiverId;
        await existing.save();

        // Notify receiver in real time
        const receiverSocketId = getReceiverSocketId(receiverId);
        if (receiverSocketId) {
          const sender = await User.findById(senderId).select("fullName profilePic");
          io.to(receiverSocketId).emit("friend:request-received", {
            requestId: existing._id,
            sender: {
              _id: senderId,
              fullName: sender.fullName,
              profilePic: sender.profilePic,
            },
          });
        }

        return res.status(200).json({ message: "Friend request sent", request: existing });
      }
    }

    // Create new request
    const friendRequest = new FriendRequest({ senderId, receiverId });
    await friendRequest.save();

    // Notify receiver via socket
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      const sender = await User.findById(senderId).select("fullName profilePic");
      io.to(receiverSocketId).emit("friend:request-received", {
        requestId: friendRequest._id,
        sender: {
          _id: senderId,
          fullName: sender.fullName,
          profilePic: sender.profilePic,
        },
      });
    }

    res.status(201).json({ message: "Friend request sent", request: friendRequest });
  } catch (error) {
    console.error("Error in sendFriendRequest:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * PUT /api/friends/accept/:requestId
 * Accept a pending friend request.
 */
export const acceptFriendRequest = async (req, res) => {
  try {
    const userId = req.user._id;
    const { requestId } = req.params;

    const request = await FriendRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ error: "Friend request not found" });
    }

    // Only the receiver can accept
    if (request.receiverId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Not authorized" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({ error: `Request is already ${request.status}` });
    }

    request.status = "accepted";
    await request.save();

    // Notify the sender
    const senderSocketId = getReceiverSocketId(request.senderId.toString());
    if (senderSocketId) {
      io.to(senderSocketId).emit("friend:request-accepted", {
        requestId: request._id,
        userId,
      });
    }

    res.status(200).json({ message: "Friend request accepted", request });
  } catch (error) {
    console.error("Error in acceptFriendRequest:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * PUT /api/friends/reject/:requestId
 * Reject a pending friend request.
 */
export const rejectFriendRequest = async (req, res) => {
  try {
    const userId = req.user._id;
    const { requestId } = req.params;

    const request = await FriendRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ error: "Friend request not found" });
    }

    // Only the receiver can reject
    if (request.receiverId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Not authorized" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({ error: `Request is already ${request.status}` });
    }

    request.status = "rejected";
    await request.save();

    // Notify the sender
    const senderSocketId = getReceiverSocketId(request.senderId.toString());
    if (senderSocketId) {
      io.to(senderSocketId).emit("friend:request-rejected", {
        requestId: request._id,
        userId,
      });
    }

    res.status(200).json({ message: "Friend request rejected", request });
  } catch (error) {
    console.error("Error in rejectFriendRequest:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * GET /api/friends/pending
 * Get all pending friend requests received by the logged-in user.
 */
export const getPendingRequests = async (req, res) => {
  try {
    const userId = req.user._id;

    const requests = await FriendRequest.find({
      receiverId: userId,
      status: "pending",
    }).populate("senderId", "fullName profilePic");

    res.status(200).json(requests);
  } catch (error) {
    console.error("Error in getPendingRequests:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * GET /api/friends/sent
 * Get all friend requests sent by the logged-in user.
 */
export const getSentRequests = async (req, res) => {
  try {
    const userId = req.user._id;

    const requests = await FriendRequest.find({
      senderId: userId,
      status: "pending",
    }).populate("receiverId", "fullName profilePic");

    res.status(200).json(requests);
  } catch (error) {
    console.error("Error in getSentRequests:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * GET /api/friends/list
 * Get all accepted friends of the logged-in user.
 */
export const getFriendsList = async (req, res) => {
  try {
    const userId = req.user._id;

    const friends = await FriendRequest.find({
      $or: [{ senderId: userId }, { receiverId: userId }],
      status: "accepted",
    });

    // Extract the friend IDs (the "other" user in each pair)
    const friendIds = friends.map((f) =>
      f.senderId.toString() === userId.toString()
        ? f.receiverId
        : f.senderId
    );

    const friendUsers = await User.find({ _id: { $in: friendIds } }).select(
      "fullName profilePic"
    );

    res.status(200).json(friendUsers);
  } catch (error) {
    console.error("Error in getFriendsList:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * GET /api/friends/status/:userId
 * Get the friendship status with a specific user.
 * Returns: { status, requestId, direction }
 */
export const getFriendshipStatus = async (req, res) => {
  try {
    const myId = req.user._id;
    const { userId: otherId } = req.params;

    const request = await FriendRequest.findOne({
      $or: [
        { senderId: myId, receiverId: otherId },
        { senderId: otherId, receiverId: myId },
      ],
    });

    if (!request) {
      return res.status(200).json({ status: "none" });
    }

    const direction =
      request.senderId.toString() === myId.toString() ? "sent" : "received";

    res.status(200).json({
      status: request.status,
      requestId: request._id,
      direction,
    });
  } catch (error) {
    console.error("Error in getFriendshipStatus:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
