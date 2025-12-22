import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";
import {
  encryptMessage as encryptSimple,
  decryptMessage as decryptSimple,
  getEncryptionInfo,
} from "../lib/cryptoSimple";

// Decrypt a single message using simple AES encryption
const decryptMessageContent = async (message, myUserId, peerId) => {
  // If message is not encrypted (legacy), return as-is
  if (!message.ciphertext || !message.iv) {
    return {
      ...message,
      decryptedText: message.text || "",
      isEncrypted: false,
      decryptionFailed: false,
    };
  }

  try {
    const plaintext = await decryptSimple(
      myUserId,
      peerId,
      message.ciphertext,
      message.iv
    );

    return {
      ...message,
      decryptedText: plaintext,
      isEncrypted: true,
      decryptionFailed: false,
    };
  } catch (error) {
    console.error("[E2EE] Decryption failed:", error);

    return {
      ...message,
      decryptedText: "🔒 Failed to decrypt message",
      isEncrypted: true,
      decryptionFailed: true,
    };
  }
};

// Decrypt all messages in a conversation
const decryptMessages = async (messages, myUserId, peerId) => {
  const decrypted = [];

  for (const message of messages) {
    const decryptedMsg = await decryptMessageContent(message, myUserId, peerId);
    decrypted.push(decryptedMsg);
  }

  return decrypted;
};

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  encryptionEnabled: true, // E2EE is enabled by default
  disappearingDuration: 0, // 0 = off, value in seconds

  encryptionEnabled: true, // E2EE is enabled by default
  disappearingDuration: 0, // 0 = off, value in seconds
  isTyping: false,

  setDisappearingDuration: (duration) => set({ disappearingDuration: duration }),

  sendTypingEvent: (receiverId) => {
    const socket = useAuthStore.getState().socket;
    socket.emit("typing", { receiverId });
  },

  sendStopTypingEvent: (receiverId) => {
    const socket = useAuthStore.getState().socket;
    socket.emit("stopTyping", { receiverId });
  },

  cleanupExpiredMessages: () => {
    const { messages } = get();
    const now = new Date();
    // Filter out messages that have expired
    // We do this check locally for immediate UI feedback
    const validMessages = messages.filter(msg => {
        if (!msg.expiresAt) return true;
        return new Date(msg.expiresAt) > now;
    });
    
    if (validMessages.length !== messages.length) {
        set({ messages: validMessages });
    }
  },

  addReaction: async (messageId, emoji) => {
    const { messages } = get();
    const authUser = useAuthStore.getState().authUser;
    
    // Optimistic Update
    const previousMessages = [...messages];
    
    // Find the message
    const updatedMessages = messages.map(m => {
        if (m._id === messageId) {
            const reactions = m.reactions ? [...m.reactions] : [];
            const existingIndex = reactions.findIndex(r => r.fromId === authUser._id && r.emoji === emoji);
            
            if (existingIndex > -1) {
                // Toggle off
                reactions.splice(existingIndex, 1);
            } else {
                // Remove any other reaction from this user if we want single-reaction-per-user (optional, but current backend allows multiple emojis per user? No, backend toggles specific emoji. Standard behavior is: click same -> remove. Click diff -> add? Or replace? 
                
                // My backend logic: 
                // if (message.reactions[existingReactionIndex].emoji === emoji) { splice } else { change emoji }
                // So it IS replace or toggle.
                
                const userReactionIndex = reactions.findIndex(r => r.fromId === authUser._id);
                if (userReactionIndex > -1) {
                     reactions[userReactionIndex].emoji = emoji;
                } else {
                    reactions.push({ fromId: authUser._id, emoji });
                }
            }
            return { ...m, reactions };
        }
        return m;
    });
    
    set({ messages: updatedMessages });

    try {
        await axiosInstance.put(`/messages/${messageId}/reaction`, { emoji });
    } catch (error) {
        // Revert on failure
        set({ messages: previousMessages });
        toast.error(error.response?.data?.message || "Failed to add reaction");
    }
  },

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to get users");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      const authUser = useAuthStore.getState().authUser;

      if (!authUser?._id) {
        set({ messages: res.data });
        return;
      }

      // Decrypt all messages
      const decryptedMessages = await decryptMessages(
        res.data,
        authUser._id,
        userId
      );

      set({ messages: decryptedMessages });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to get messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, selectedGroup, messages, encryptionEnabled } = get();
    const authUser = useAuthStore.getState().authUser;

    if (!selectedUser && !selectedGroup) {
      toast.error("Please select a user or group");
      return;
    }

    const recipientId = selectedUser ? selectedUser._id : selectedGroup._id;
    const isGroup = !!selectedGroup;

    try {
      let payload = {};

      if (!isGroup && encryptionEnabled && messageData.text) {
        // E2EE for P2P
        const encrypted = await encryptSimple(
          authUser._id,
          selectedUser._id,
          messageData.text
        );

        payload = {
          ciphertext: encrypted.ciphertext,
          iv: encrypted.iv,
          text: null,
          image: messageData.image,
        };
      } else {
        // Unencrypted (Groups or Disabled P2P)
        payload = {
          text: messageData.text,
          image: messageData.image,
        };
      }

      // Add disappearing duration if set
      const { disappearingDuration } = get();
      if (disappearingDuration > 0) {
          payload.duration = disappearingDuration;
      }

      const res = await axiosInstance.post(
        `/messages/send/${recipientId}`,
        payload
      );

      // Add to local state
      const localMessage = {
        ...res.data,
        senderId: authUser._id, // Keep ID consistent
        // Manually attach sender details if it's a group msg so UI can render name/avatar
        sender: isGroup ? authUser : undefined, 
        
        decryptedText: messageData.text || "",
        isEncrypted: !isGroup && encryptionEnabled && !!messageData.text,
      };

      set({ messages: [...messages, localMessage] });

      // Move user to top if P2P (Groups might need own re-ordering logic)
      if (selectedUser) get().moveUserToTop(selectedUser._id);
      
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error(error.response?.data?.message || "Failed to send message");
    }
  },

  editMessage: async (messageId, newText) => {
    const { messages, selectedUser, encryptionEnabled } = get();
    const authUser = useAuthStore.getState().authUser;
    
    if (!authUser?._id || !selectedUser?._id) return;

    try {
      let payload = {};

      if (encryptionEnabled) {
         // Encrypt the new text
         const encrypted = await encryptSimple(
          authUser._id,
          selectedUser._id,
          newText
        );
        
        payload = {
          ciphertext: encrypted.ciphertext,
          iv: encrypted.iv,
          text: null
        };
      } else {
        payload = { text: newText };
      }

      const res = await axiosInstance.put(`/messages/${messageId}`, payload);
      
      const updatedBackendMessage = res.data;
      
      // Update local state with the new text immediately
      const updatedMessages = messages.map(m => {
        if (m._id === messageId) {
            return {
                ...updatedBackendMessage,
                decryptedText: newText, // We know what we just wrote
                isEncrypted: encryptionEnabled,
                decryptionFailed: false
            };
        }
        return m;
      });
      
      set({ messages: updatedMessages });
      toast.success("Message edited");
    } catch(error) {
      console.error("Error editing message:", error);
      toast.error(error.response?.data?.message || "Failed to edit message");
    }
  },

  markMessagesAsSeen: async (senderId) => {
    const { messages, selectedUser } = get();
    // Only mark as seen if we are currently chatting with this user
    if (!selectedUser || selectedUser._id !== senderId) return;

    try {
        await axiosInstance.put(`/messages/mark-seen/${senderId}`);
        
        // Optimistically update local state
        const updatedMessages = messages.map(m => {
            if (m.senderId === senderId && m.status !== "seen") {
                return { ...m, status: "seen" };
            }
            return m;
        });
        set({ messages: updatedMessages });
    } catch (error) {
        console.error("Error marking messages as seen:", error);
    }
  },

  subscribeToMessages: () => {
    const { selectedUser, selectedGroup } = get();
    if (!selectedUser && !selectedGroup) return;

    const socket = useAuthStore.getState().socket;
    const authUser = useAuthStore.getState().authUser;

    socket.on("newMessage", async (newMessage) => {
      const { selectedUser, selectedGroup } = get();
      
      let shouldAddMessage = false;

      if (selectedUser && newMessage.senderId === selectedUser._id && !newMessage.groupId) {
          shouldAddMessage = true;
      } else if (selectedGroup && newMessage.groupId) {
          // Robust comparison for group chat
          const isSameGroup = newMessage.groupId.toString() === selectedGroup._id.toString();
          
          if (isSameGroup) {
             const authUser = useAuthStore.getState().authUser;
             // Ensure senderId is compared safely (it might be an object if populated, or string)
             const senderId = typeof newMessage.senderId === 'object' ? newMessage.senderId._id : newMessage.senderId;
             const isMe = senderId.toString() === authUser._id.toString();
             
             if (!isMe) {
                 shouldAddMessage = true;
             }
          }
      }

      if (!shouldAddMessage) return;

      // Handle decryption or plain text
      let processedMessage = newMessage;
      
      if (!newMessage.groupId && !newMessage.text && newMessage.ciphertext) {
         // P2P Encrypted
        const authUser = useAuthStore.getState().authUser;
        processedMessage = await decryptMessageContent(
            newMessage,
            authUser._id,
            selectedUser?._id || newMessage.senderId // fallback to senderId if selectedUser mismatch
         );
      } else {
         // Group or Plaintext
         processedMessage = {
             ...newMessage,
             decryptedText: newMessage.text || "",
             isEncrypted: false
         };
      }

      set({ messages: [...get().messages, processedMessage] });

      // Move sender/group to top of sidebar?
      // If group, maybe re-order groups list? TODO later.
    });
    // Handle remote deletion events
    socket.on("deleteMessage", ({ messageId }) => {
      const currentMessages = get().messages || [];
      const updated = currentMessages.filter((m) => m._id !== messageId);
      set({ messages: updated });
    });

    // Handle remote edit events
    socket.on("messageEdited", async (updatedMessage) => {
      const authUser = useAuthStore.getState().authUser;
      const { selectedUser } = get();
      
      // If we are looking at the chat where editing happened
      if (updatedMessage.senderId === selectedUser?._id || updatedMessage.receiverId === selectedUser?._id) {
          
        let decryptedMessage = updatedMessage;
        
        // Decrypt if it's from the other person (if it's our own, we might already have it or we can decrypt it same way)
        try {
           decryptedMessage = await decryptMessageContent(
            updatedMessage,
            authUser._id,
            updatedMessage.senderId === authUser._id ? updatedMessage.receiverId : updatedMessage.senderId
          );
        } catch (e) {
           console.error("Failed to decrypt edited message", e);
        }

        const currentMessages = get().messages || [];
        const updatedMessages = currentMessages.map((m) => 
          m._id === updatedMessage._id ? decryptedMessage : m
        );
        set({ messages: updatedMessages });
      }
    });

    socket.on("messagesDelivered", ({ receiverId }) => {
        const { selectedUser } = get();
        if (selectedUser && selectedUser._id === receiverId) {
             const messages = get().messages.map(m => 
                 m.receiverId === receiverId && m.status === "sent" 
                 ? { ...m, status: "delivered" } 
                 : m
             );
             set({ messages });
        }
    });

    socket.on("messagesSeen", ({ receiverId }) => {
        const { selectedUser } = get();
        if (selectedUser && selectedUser._id === receiverId) {
             const messages = get().messages.map(m => 
                 m.receiverId === receiverId && m.status !== "seen" 
                 ? { ...m, status: "seen" } 
                 : m
             );
              set({ messages });
         }
     });

     socket.on("typing", ({ senderId }) => {
        const { selectedUser } = get();
        if (selectedUser && selectedUser._id === senderId) {
            set({ isTyping: true });
        }
     });

     socket.on("stopTyping", ({ senderId }) => {
        const { selectedUser } = get();
        if (selectedUser && selectedUser._id === senderId) {
            set({ isTyping: false });
        }
     });

     socket.on("messageReaction", (updatedMessage) => {
        const { messages, selectedUser } = get();
        // Update the message in the list
        // Note: updatedMessage might need decryption if we were sending full payload
        // But for reactions, we just need to update the reactions field.
        // However, the controller returns the user object populated? No, simple strings/ids usually.
        // Let's just update the reactions field of the existing message.
        
        const newMessages = messages.map(m => {
            if (m._id === updatedMessage._id) {
                return { ...m, reactions: updatedMessage.reactions };
            }
            return m;
        });
        
        set({ messages: newMessages });
     });
   },

   unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
    socket.off("deleteMessage");
    socket.off("messageEdited");
    socket.off("messagesDelivered");
    socket.off("messagesSeen");
    socket.off("typing");
    socket.off("stopTyping");
    socket.off("messageReaction");
  },

  setSelectedUser: (selectedUser) => set({ selectedUser, selectedGroup: null }), // Deselect group

  // Move a user to the top of the sidebar list (for recent chats)
  moveUserToTop: (userId) => {
    const { users } = get();
    const userIndex = users.findIndex((u) => u._id === userId);

    if (userIndex > 0) {
      // User exists and is not already at top
      const updatedUsers = [...users];
      const [user] = updatedUsers.splice(userIndex, 1);
      updatedUsers.unshift(user);
      set({ users: updatedUsers });
    }
  },

  // Get encryption info
  getEncryptionStatus: () => {
    return getEncryptionInfo();
  },

  // Toggle encryption (for debugging/testing)
  toggleEncryption: () => {
    const { encryptionEnabled } = get();
    set({ encryptionEnabled: !encryptionEnabled });
    toast.success(`Encryption ${!encryptionEnabled ? "enabled" : "disabled"}`);
  },
  
  // Delete message on server (Delete for everyone) - only sender allowed
  deleteMessage: async (messageId) => {
    const { messages } = get();
    try {
      await axiosInstance.delete(`/messages/${messageId}`);

      // Remove locally as well
      const updated = (messages || []).filter((m) => m._id !== messageId);
      set({ messages: updated });
      toast.success("Message deleted for everyone");
    } catch (error) {
      console.error("Error deleting message:", error);
      toast.error(error.response?.data?.message || "Failed to delete message");
    }
  },

  // Remove message only from current user's view
  deleteForMe: (messageId) => {
    const { messages } = get();
    const updated = (messages || []).filter((m) => m._id !== messageId);
    set({ messages: updated });
    toast.success("Message removed from your view");
  },

  // Group Chat Actions
  groups: [],
  selectedGroup: null,
  isGroupsLoading: false,

  setSelectedGroup: (selectedGroup) => {
      set({ selectedGroup, selectedUser: null }); // Deselect user when selecting group
  },

  createGroup: async (groupData) => {
      try {
          const res = await axiosInstance.post("/groups", groupData);
          set({ groups: [res.data, ...get().groups] });
          toast.success("Group created successfully");
          return true; // Success
      } catch (error) {
          toast.error(error.response?.data?.error || "Failed to create group");
          return false;
      }
  },

  getGroups: async () => {
      set({ isGroupsLoading: true });
      try {
          const res = await axiosInstance.get("/groups");
          set({ groups: res.data });
      } catch (error) {
          toast.error("Failed to fetch groups");
      } finally {
          set({ isGroupsLoading: false });
      }
  },

  getGroupMessages: async (groupId) => {
      set({ isMessagesLoading: true });
      try {
          const res = await axiosInstance.get(`/groups/${groupId}/messages`);
          set({ messages: res.data });
          
          // Join socket room
          const socket = useAuthStore.getState().socket;
          if (socket) {
               socket.emit("joinGroup", groupId);
          }
      } catch (error) {
          toast.error("Failed to load group messages");
      } finally {
          set({ isMessagesLoading: false });
      }
  },

  addMemberToGroup: async (groupId, userId) => {
      try {
          const res = await axiosInstance.post(`/groups/${groupId}/add-member`, { userId });
          
          // Update groups list and selectedGroup
          const updatedGroup = res.data;
          
          // Update in groups array
          const updatedGroups = get().groups.map(g => g._id === groupId ? updatedGroup : g);
          
          set({ 
              groups: updatedGroups,
              selectedGroup: updatedGroup // Update current view to show new member count immediately
          });
          
          toast.success("Member added successfully");
          return true;
      } catch (error) {
          toast.error(error.response?.data?.error || "Failed to add member");
          return false;
      }
  },

  // Override or update sendMessage to handle groups
  sendMessage: async (messageData) => {
    const { selectedUser, selectedGroup, messages, encryptionEnabled } = get();
    const authUser = useAuthStore.getState().authUser;

    if (!selectedUser && !selectedGroup) {
      toast.error("Please select a user or group");
      return;
    }

    const recipientId = selectedUser ? selectedUser._id : selectedGroup._id;
    const isGroup = !!selectedGroup;

    try {
      let payload = {};

      if (!isGroup && encryptionEnabled && messageData.text) {
        // ... (E2EE for P2P - same as before)
        const encrypted = await encryptSimple(
          authUser._id,
          selectedUser._id,
          messageData.text
        );
         payload = {
          ciphertext: encrypted.ciphertext,
          iv: encrypted.iv,
          text: null,
          image: messageData.image,
        };
      } else {
        // Groups currently Unencrypted for MVP (managing shared keys is complex)
        // Or simple text for now
        payload = {
          text: messageData.text,
          image: messageData.image,
        };
      }

      // Add disappearing duration if set (maybe disable for groups initially?)
      const { disappearingDuration } = get();
      if (disappearingDuration > 0) {
          payload.duration = disappearingDuration;
      }

      const res = await axiosInstance.post(
        `/messages/send/${recipientId}`,
        payload
      );

      // Add to local state
      const localMessage = {
        ...res.data,
        // If group, we need sender info. The backend response might not populate it immediately or return just ID?
        // Let's ensure consistency.
        senderId: authUser, // Populate locally for instant display
        decryptedText: messageData.text || "",
        isEncrypted: !isGroup && encryptionEnabled && !!messageData.text,
      };

      set({ messages: [...messages, localMessage] });
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error(error.response?.data?.message || "Failed to send message");
    }
  },
}));
