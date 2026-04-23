import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";

export const useProfileStore = create((set) => ({
  viewedProfile: null,
  isLoadingProfile: false,

  fetchProfile: async (userId) => {
    set({ isLoadingProfile: true, viewedProfile: null });
    try {
      const res = await axiosInstance.get(`/profile/${userId}`);
      set({ viewedProfile: res.data });
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      set({ isLoadingProfile: false });
    }
  },

  clearProfile: () => set({ viewedProfile: null }),
}));
