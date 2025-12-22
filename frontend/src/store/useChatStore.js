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
    const { selectedUser, messages, encryptionEnabled } = get();
    const authUser = useAuthStore.getState().authUser;

    if (!selectedUser) {
      toast.error("Please select a user to send a message");
      return;
    }

    if (!authUser?._id) {
      toast.error("Not authenticated");
      return;
    }

    try {
      let payload = {};

      if (encryptionEnabled && messageData.text) {
        // Encrypt the message using simple AES-256-GCM
        const encrypted = await encryptSimple(
          authUser._id,
          selectedUser._id,
          messageData.text
        );

        payload = {
          ciphertext: encrypted.ciphertext,
          iv: encrypted.iv,
          // Don't send plaintext for encrypted messages
          text: null,
          image: messageData.image,
        };
      } else {
        // Fallback: send unencrypted (for images only or if encryption disabled)
        payload = {
          text: messageData.text,
          image: messageData.image,
        };
      }

      const res = await axiosInstance.post(
        `/messages/send/${selectedUser._id}`,
        payload
      );

      // Add the decrypted version to local state
      const localMessage = {
        ...res.data,
        decryptedText: messageData.text || "",
        isEncrypted: encryptionEnabled && !!messageData.text,
        decryptionFailed: false,
      };

      set({ messages: [...messages, localMessage] });

      // Move this user to top of sidebar (most recent chat)
      get().moveUserToTop(selectedUser._id);
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error(error.response?.data?.message || "Failed to send message");
    }
  },

  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;
    const authUser = useAuthStore.getState().authUser;

    socket.on("newMessage", async (newMessage) => {
      const isMessageSentFromSelectedUser =
        newMessage.senderId === selectedUser._id;
      if (!isMessageSentFromSelectedUser) return;

      // Decrypt the incoming message
      const decryptedMessage = await decryptMessageContent(
        newMessage,
        authUser._id,
        selectedUser._id
      );

      set({ messages: [...get().messages, decryptedMessage] });

      // Move sender to top of sidebar (most recent chat)
      get().moveUserToTop(newMessage.senderId);
    });
    
    // Handle remote deletion events
    socket.on("deleteMessage", ({ messageId }) => {
      const currentMessages = get().messages || [];
      const updated = currentMessages.filter((m) => m._id !== messageId);
      set({ messages: updated });
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
    socket.off("deleteMessage");
  },

  setSelectedUser: (selectedUser) => set({ selectedUser }),

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
}));
