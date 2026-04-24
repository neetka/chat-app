import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";

export const useFriendStore = create((set, get) => ({
  pendingRequests: [],   // Incoming requests awaiting action
  sentRequests: [],      // Outgoing requests
  isLoadingPending: false,
  isLoadingSent: false,

  // ── Fetch pending requests received by me ──────────────────
  fetchPending: async () => {
    set({ isLoadingPending: true });
    try {
      const res = await axiosInstance.get("/friends/pending");
      set({ pendingRequests: res.data });
    } catch (error) {
      console.error("Error fetching pending requests:", error);
    } finally {
      set({ isLoadingPending: false });
    }
  },

  // ── Fetch requests I sent ──────────────────────────────────
  fetchSent: async () => {
    set({ isLoadingSent: true });
    try {
      const res = await axiosInstance.get("/friends/sent");
      set({ sentRequests: res.data });
    } catch (error) {
      console.error("Error fetching sent requests:", error);
    } finally {
      set({ isLoadingSent: false });
    }
  },

  // ── Send a friend request ─────────────────────────────────
  sendRequest: async (userId) => {
    try {
      const res = await axiosInstance.post(`/friends/request/${userId}`);
      toast.success(res.data.message || "Friend request sent!");
      // Refresh sent list
      get().fetchSent();
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to send request");
      return null;
    }
  },

  // ── Accept a friend request ────────────────────────────────
  acceptRequest: async (requestId) => {
    try {
      await axiosInstance.put(`/friends/accept/${requestId}`);
      toast.success("Friend request accepted!");
      // Remove from pending list locally
      set((state) => ({
        pendingRequests: state.pendingRequests.filter(
          (r) => r._id !== requestId
        ),
      }));
      return true;
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to accept request");
      return false;
    }
  },

  // ── Reject a friend request ────────────────────────────────
  rejectRequest: async (requestId) => {
    try {
      await axiosInstance.put(`/friends/reject/${requestId}`);
      toast.success("Friend request declined");
      // Remove from pending list locally
      set((state) => ({
        pendingRequests: state.pendingRequests.filter(
          (r) => r._id !== requestId
        ),
      }));
      return true;
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to reject request");
      return false;
    }
  },

  // ── Socket event handlers (called from useAuthStore) ───────
  onRequestReceived: ({ requestId, sender }) => {
    toast(`${sender.fullName} sent you a friend request!`, {
      icon: "👋",
      duration: 5000,
      style: { background: "#1e293b", color: "#f1f5f9" },
    });
    set((state) => ({
      pendingRequests: [
        ...state.pendingRequests,
        {
          _id: requestId,
          senderId: sender,
          status: "pending",
        },
      ],
    }));
  },

  onRequestAccepted: ({ requestId, userId }) => {
    toast.success("Your friend request was accepted!");
    // Remove from sent list
    set((state) => ({
      sentRequests: state.sentRequests.filter((r) => r._id !== requestId),
    }));
  },

  onRequestRejected: ({ requestId, userId }) => {
    // Silently remove from sent list — no toast for rejection
    set((state) => ({
      sentRequests: state.sentRequests.filter((r) => r._id !== requestId),
    }));
  },
}));
