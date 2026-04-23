import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import { ensureDeviceRegistration } from "../lib/cryptoClient";

const BASE_URL =
  import.meta.env.MODE === "development"
    ? "http://localhost:5001"
    : "https://yapp-ixs5.onrender.com";

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,

  // ── Real-time presence & alerts ───────────────────────────
  lastSeenMap: {},        // { [userId]: ISOString }
  missedCallAlerts: [],   // [{ fromId, fromName, fromPic, callType, at }]
  unreadCounts: {},       // { [userId]: number }

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");

      set({ authUser: res.data });
      await ensureDeviceRegistration(res.data._id);
      get().connectSocket();
    } catch (error) {
      console.log("Error in checkAuth:", error);
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      set({ authUser: res.data });
      toast.success("Account created successfully");
      await ensureDeviceRegistration(res.data._id);
      get().connectSocket();
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      set({ authUser: res.data });
      toast.success("Logged in successfully");

      await ensureDeviceRegistration(res.data._id);
      get().connectSocket();
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      set({ authUser: null });
      toast.success("Logged out successfully");
      get().disconnectSocket();
    } catch (error) {
      toast.error(error.response.data.message);
    }
  },

  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
      toast.success("Profile updated successfully");
      return true;
    } catch (error) {
      console.log("error in update profile:", error);
      toast.error(error.response.data.message);
      return false;
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  // ── Alert helpers ──────────────────────────────────────────
  clearUnreadCount: (userId) => {
    set((state) => {
      const counts = { ...state.unreadCounts };
      delete counts[userId];
      return { unreadCounts: counts };
    });
  },

  addUnreadCount: (userId) => {
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [userId]: (state.unreadCounts[userId] || 0) + 1,
      },
    }));
  },

  clearMissedCallAlert: (fromId) => {
    set((state) => ({
      missedCallAlerts: state.missedCallAlerts.filter((a) => a.fromId !== fromId),
    }));
  },

  clearAllMissedCallAlerts: () => set({ missedCallAlerts: [] }),

  changePassword: async (data) => {
    try {
      await axiosInstance.put("/auth/change-password", data);
      toast.success("Password changed successfully");
      return true;
    } catch (error) {
      console.log("error in change password:", error);
      toast.error(error.response?.data?.message || "Failed to change password");
      return false;
    }
  },

  deleteAccount: async () => {
    try {
      await axiosInstance.delete("/auth/delete-account");
      set({ authUser: null });
      toast.success("Account deleted successfully");
      get().disconnectSocket();
      return true;
    } catch (error) {
      console.log("error in delete account:", error);
      toast.error(error.response?.data?.message || "Failed to delete account");
      return false;
    }
  },

  connectSocket: () => {
    const { authUser } = get();
    if (!authUser || get().socket?.connected) return;

    const socket = io(BASE_URL, {
      query: {
        userId: authUser._id,
      },
    });
    socket.connect();

    set({ socket: socket });

    socket.on("getOnlineUsers", (userIds) => {
      set({ onlineUsers: userIds });
    });

    // ── Last seen ────────────────────────────────────────────
    socket.on("user:lastSeen", ({ userId, lastSeen }) => {
      set((state) => ({
        lastSeenMap: { ...state.lastSeenMap, [userId]: lastSeen },
      }));
    });

    // ── Missed call notifications delivered on connect ───────
    socket.on("call:missed_notifications", (notifications) => {
      set({ missedCallAlerts: notifications });
      notifications.forEach((notif) => {
        const icon = notif.callType === "video" ? "📹" : "📞";
        toast(`Missed ${notif.callType} call from ${notif.fromName}`, {
          icon,
          duration: 8000,
          style: { background: "#1e293b", color: "#f1f5f9" },
        });
      });
    });

    // Setup WebRTC call signaling listeners
    import("./useCallStore").then(({ useCallStore }) => {
      const callStore = useCallStore.getState();
      // Pass a getter for users list so incoming calls can resolve caller info
      const getUsers = () => {
        return import("./useChatStore").then(({ useChatStore }) => {
          return useChatStore.getState().users;
        });
      };
      // We need sync access, so use the chat store directly
      import("./useChatStore").then(({ useChatStore }) => {
        callStore.setupCallListeners(socket, () => useChatStore.getState().users);
      });
    });

    // ── Track unread counts for non-selected chats ───────────
    socket.on("newMessage", (newMessage) => {
      // Dynamically import to avoid circular dependency
      import("./useChatStore").then(({ useChatStore }) => {
        const chatStore = useChatStore.getState();
        const selectedUser = chatStore.selectedUser;

        // Only move to top if this message is NOT from the currently selected user
        // (selected user messages are handled in subscribeToMessages)
        if (!selectedUser || newMessage.senderId !== selectedUser._id) {
          chatStore.moveUserToTop(newMessage.senderId);
          // Increment unread count for that sender
          if (newMessage.senderId) {
            get().addUnreadCount(newMessage.senderId);
          }
        }
      });
    });
  },
  disconnectSocket: () => {
    const socket = get().socket;
    if (socket?.connected) {
      // Cleanup call listeners before disconnecting
      import("./useCallStore").then(({ useCallStore }) => {
        useCallStore.getState().cleanupCallListeners(socket);
      });
      socket.disconnect();
    }
  },
}));
