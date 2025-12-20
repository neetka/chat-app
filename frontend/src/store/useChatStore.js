import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";
import {
  decryptFromPeer,
  encryptForPeer,
  ensurePrekeysAvailable,
} from "../lib/cryptoSession";
import { ensureDeviceRegistration } from "../lib/cryptoClient";

const expiryTimers = {};

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const me = useAuthStore.getState().authUser?._id;
      await ensurePrekeysAvailable(me);
      // Proactively establish/refresh session on chat start
      await encryptForPeer(me, userId, ""); // will fetch bundle and derive keys; empty plaintext not sent
      const res = await axiosInstance.get(`/messages/${userId}`);
      const decrypted = await Promise.all(
        res.data.map(async (m) => {
          try {
            // Validate message has required fields
            if (!m.ciphertext || !m.iv) {
              console.error("[getMessages] Message missing ciphertext or iv:", m._id);
              return { ...m, text: "[invalid message data]" };
            }
            
            console.log("[getMessages] Decrypting message:", {
              messageId: m._id,
              senderId: m.senderId,
              hasHandshake: !!m.handshake,
              handshakeType: m.handshake ? typeof m.handshake : 'none',
            });
            
            const raw = await decryptFromPeer(me, m.senderId, {
              ciphertext: m.ciphertext,
              iv: m.iv,
              handshake: m.handshake,
            });
            let text = raw;
            let expiresAt = null;
            try {
              const parsed = JSON.parse(raw);
              if (parsed && typeof parsed === "object" && "t" in parsed) {
                text = parsed.t;
                expiresAt = parsed.exp || null;
              }
            } catch {
              // legacy non-JSON messages
            }
            const message = { ...m, text, expiresAt };
            if (expiresAt) {
              const delay = Math.max(0, expiresAt - Date.now());
              if (delay === 0) return null;
              if (expiryTimers[m._id]) clearTimeout(expiryTimers[m._id]);
              expiryTimers[m._id] = setTimeout(() => {
                set((state) => ({
                  messages: state.messages.filter((msg) => msg._id !== m._id),
                }));
              }, delay);
            }
            return message;
          } catch (err) {
            console.error("[getMessages] Decrypt failed for message:", m._id, err);
            console.error("[getMessages] Error details:", {
              error: err.message,
              stack: err.stack,
              messageData: {
                hasCiphertext: !!m.ciphertext,
                hasIv: !!m.iv,
                hasHandshake: !!m.handshake,
                handshakeKeys: m.handshake ? Object.keys(m.handshake) : null,
              },
            });
            return { ...m, text: `[decrypt failed: ${err.message}]` };
          }
        })
      );
      set({ messages: decrypted.filter(Boolean) });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isMessagesLoading: false });
    }
  },
  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    const me = useAuthStore.getState().authUser?._id;
    
    if (!selectedUser) {
      toast.error("Please select a user to send a message");
      return;
    }
    
    if (!me) {
      toast.error("You must be logged in to send messages");
      return;
    }

    try {
      // Ensure device is registered
      await ensureDeviceRegistration(me);
      await ensurePrekeysAvailable(me);
      const expiresAt = messageData.expirySeconds
        ? Date.now() + messageData.expirySeconds * 1000
        : null;
      const plaintext = JSON.stringify({
        t: messageData.text || "",
        exp: expiresAt,
      });
      
      const enc = await encryptForPeer(me, selectedUser._id, plaintext);
      const res = await axiosInstance.post(
        `/messages/send/${selectedUser._id}`,
        {
          ciphertext: enc.ciphertext,
          iv: enc.iv,
          handshake: enc.handshake, // carries ratchet header (and x3dh only on first)
        }
      );
      const localMessage = {
        ...res.data,
        text: messageData.text,
        senderId: me,
        expiresAt,
      };
      if (expiresAt) {
        const delay = Math.max(0, expiresAt - Date.now());
        if (expiryTimers[localMessage._id])
          clearTimeout(expiryTimers[localMessage._id]);
        expiryTimers[localMessage._id] = setTimeout(() => {
          const socket = useAuthStore.getState().socket;
          const receiverId = selectedUser._id;
          if (socket) {
            socket.emit("deleteMessage", {
              receiverId,
              messageId: localMessage._id,
            });
          }
          set((state) => ({
            messages: state.messages.filter(
              (msg) => msg._id !== localMessage._id
            ),
          }));
        }, delay);
      }
      set({
        messages: [
          ...messages,
          localMessage,
        ],
      });
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || "Failed to send message";
      toast.error(errorMessage);
    }
  },

  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;

    socket.on("newMessage", (newMessage) => {
      console.log("[Socket] Received newMessage:", {
        senderId: newMessage.senderId,
        selectedUser: selectedUser._id,
        hasCiphertext: !!newMessage.ciphertext,
        hasHandshake: !!newMessage.handshake,
      });
      
      const isMessageSentFromSelectedUser =
        newMessage.senderId === selectedUser._id;
      if (!isMessageSentFromSelectedUser) {
        console.log("[Socket] Message not from selected user, ignoring");
        return;
      }

      const me = useAuthStore.getState().authUser?._id;
      if (!me) {
        console.error("[Socket] No auth user found");
        return;
      }

      decryptFromPeer(me, newMessage.senderId, {
        ciphertext: newMessage.ciphertext,
        iv: newMessage.iv,
        handshake: newMessage.handshake,
      })
        .then((raw) => {
          console.log("[Socket] Decryption successful");
          let text = raw;
          let expiresAt = null;
          try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === "object" && "t" in parsed) {
              text = parsed.t;
              expiresAt = parsed.exp || null;
            }
          } catch {
            // legacy non-JSON messages
          }
          const message = { ...newMessage, text, expiresAt };
          if (expiresAt) {
            const delay = Math.max(0, expiresAt - Date.now());
            if (delay === 0) return;
            if (expiryTimers[newMessage._id])
              clearTimeout(expiryTimers[newMessage._id]);
            expiryTimers[newMessage._id] = setTimeout(() => {
              set((state) => ({
                messages: state.messages.filter(
                  (msg) => msg._id !== newMessage._id
                ),
              }));
            }, delay);
          }
          set({
            messages: [...get().messages, message],
          });
        })
        .catch((error) => {
          console.error("[Socket] Decryption failed:", error);
          console.error("[Socket] Message data:", {
            senderId: newMessage.senderId,
            hasCiphertext: !!newMessage.ciphertext,
            hasIv: !!newMessage.iv,
            hasHandshake: !!newMessage.handshake,
            handshakeKeys: newMessage.handshake ? Object.keys(newMessage.handshake) : null,
          });
      set({
            messages: [
              ...get().messages,
              { ...newMessage, text: `[decrypt failed: ${error.message}]` },
            ],
          });
      });
    });

    socket.on("deleteMessage", ({ messageId }) => {
      if (expiryTimers[messageId]) {
        clearTimeout(expiryTimers[messageId]);
        delete expiryTimers[messageId];
      }
      set((state) => ({
        messages: state.messages.filter((msg) => msg._id !== messageId),
      }));
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
    socket.off("deleteMessage");
  },

  setSelectedUser: (selectedUser) => set({ selectedUser }),
}));
