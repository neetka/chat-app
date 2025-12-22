import Group from "../models/group.model.js";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import { io } from "../lib/socket.js";

export const createGroup = async (req, res) => {
  try {
    const { name, description, members } = req.body;
    const adminId = req.user._id;

    if (!name || !members || members.length === 0) {
      return res.status(400).json({ error: "Name and members are required" });
    }

    // Ensure members are valid ObjectIds and include admin
    // Note: members should be an array of user IDs sent from frontend
    const allMembers = [...new Set([...members, adminId.toString()])];

    const newGroup = new Group({
      name,
      description,
      admin: adminId,
      members: allMembers,
    });

    await newGroup.save();

    // Populate members for frontend display
    const populateGroup = await Group.findById(newGroup._id).populate("members", "-password");

    // Notify all members (if they are online/in socket room)
    // We'll need to figure out how to notify them. 
    // Emitting to their user-specific rooms in socket is best.
    allMembers.forEach(memberId => {
        // We don't have direct access to userSocketMap here nicely without exporting it differently? 
        // Or we use io.to(socketId). 
        // For now, let's just create it. The 'getGroups' poll or refresh will catch it, or we enhance socket later.
    });

    res.status(201).json(populateGroup);
  } catch (error) {
    console.error("Error in createGroup:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getGroups = async (req, res) => {
  try {
    const userId = req.user._id;
    // Find groups where I am a member
    const groups = await Group.find({ members: userId })
      .populate("members", "-password")
      .populate("admin", "-password")
      .sort({ updatedAt: -1 });
    
    res.status(200).json(groups);
  } catch (error) {
    console.error("Error in getGroups:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getGroupMessages = async (req, res) => {
    try {
        const { id: groupId } = req.params;
        const messages = await Message.find({ groupId })
            .populate("senderId", "fullName profilePic") // We need sender info for group chats
            .sort({ createdAt: 1 });
            
        res.status(200).json(messages);
    } catch (error) {
        console.error("Error in getGroupMessages:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
}


export const addMember = async (req, res) => {
    try {
        const { id: groupId } = req.params;
        const { userId } = req.body;
        const adminId = req.user._id;

        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ error: "Group not found" });
        }

        // Check if admin
        if (group.admin.toString() !== adminId.toString()) {
            return res.status(403).json({ error: "Only admins can add members" });
        }

        // Check if user already exists
        if (group.members.includes(userId)) {
            return res.status(400).json({ error: "User is already a member" });
        }

        group.members.push(userId);
        await group.save();

        const updatedGroup = await Group.findById(groupId)
            .populate("members", "-password")
            .populate("admin", "-password");

        res.status(200).json(updatedGroup);

    } catch (error) {
        console.error("Error in addMember:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};
