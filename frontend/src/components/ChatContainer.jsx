import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef, useState } from "react";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";
import { Lock, LockOpen, AlertCircle, ChevronDown, Check, CheckCheck, Timer, Smile, Plus } from "lucide-react";

// Encryption status indicator component
const EncryptionBadge = ({ message }) => {
  if (!message.isEncrypted) {
    return (
      <span className="tooltip tooltip-left" data-tip="Unencrypted message">
        <LockOpen className="size-3 text-warning/70" />
      </span>
    );
  }

  if (message.decryptionFailed) {
    return (
      <span className="tooltip tooltip-left" data-tip="Decryption failed">
        <AlertCircle className="size-3 text-error/70" />
      </span>
    );
  }

  return (
    <span className="tooltip tooltip-left" data-tip="AES-256-GCM encrypted">
      <Lock className="size-3 text-success/70" />
    </span>
  );
};

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    getGroupMessages,
    isMessagesLoading,
    selectedUser,
    selectedGroup,
    subscribeToMessages,
    unsubscribeFromMessages,
    encryptionEnabled,
    deleteMessage,
    deleteForMe,
    editMessage,
    markMessagesAsSeen,
    cleanupExpiredMessages,
    addReaction,
  } = useChatStore();
  const { authUser } = useAuthStore();
  const [openMenuFor, setOpenMenuFor] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState("");

  const startEditing = (message) => {
    setEditingMessageId(message._id);
    setEditText(message.decryptedText || message.text || "");
  };

  const cancelEditing = () => {
    setEditingMessageId(null);
    setEditText("");
  };

  const handleSaveEdit = async (messageId) => {
    if (!editText.trim()) return;
    await editMessage(messageId, editText);
    setEditingMessageId(null);
    setEditText("");
  };
  
  const messageEndRef = useRef(null);

  useEffect(() => {
    if (selectedUser) {
        getMessages(selectedUser._id);
    } else if (selectedGroup) {
        getGroupMessages(selectedGroup._id);
    }
    
    subscribeToMessages();
    return () => unsubscribeFromMessages();
  }, [
    selectedUser?._id,
    selectedGroup?._id,
    getMessages,
    getGroupMessages,
    subscribeToMessages,
    unsubscribeFromMessages,
  ]);

  useEffect(() => {
    if (messageEndRef.current && messages) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
    
    // Mark messages as seen when we open the chat or receive new messages
    if (selectedUser && messages.length > 0) {
        // Find last message from other user that is not seen
        const unseenMessages = messages.some(m => m.senderId === selectedUser._id && m.status !== "seen");
        if (unseenMessages) {
            markMessagesAsSeen(selectedUser._id);
        }
    }
  }, [messages, selectedUser, markMessagesAsSeen]);

  // Cleanup expired messages every second
  useEffect(() => {
    const interval = setInterval(() => {
        cleanupExpiredMessages();
    }, 1000);
    return () => clearInterval(interval);
  }, [cleanupExpiredMessages]);

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto bg-base-100">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto bg-base-100">
      <ChatHeader />

      {/* Chat Messages Area */}
      <div
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-1"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-base-content/50">
            <div className="text-6xl mb-4">💬</div>
            <p className="text-lg font-medium">No messages yet</p>
            <p className="text-sm">Send a message to start the conversation!</p>
          </div>
        )}

        {messages.map((message, index) => {
          const isOwnMessage = message.senderId === authUser._id || message.senderId._id === authUser._id;
          const showAvatar =
            index === 0 || messages[index - 1]?.senderId !== message.senderId;
            
          // Helper to get sender profile
          const senderProfile = isOwnMessage ? authUser : (selectedGroup 
                ? (typeof message.senderId === 'object' ? message.senderId : selectedGroup.members.find(m => m._id === message.senderId))
                : selectedUser);
          
          return (
            <div
              key={message._id}
              className={`chat ${isOwnMessage ? "chat-end" : "chat-start"} ${
                !showAvatar ? "mt-0.5" : "mt-4"
              }`}
            >
              {/* Avatar */}
              <div className="chat-image avatar">
                <div
                  className={`size-9 rounded-full ring-2 ring-offset-2 ring-offset-base-100 ${
                    isOwnMessage ? "ring-primary/30" : "ring-secondary/30"
                  } ${!showAvatar ? "invisible" : ""}`}
                >
                  <img
                    src={senderProfile?.profilePic || "/avatar.png"}
                    alt="profile pic"
                    className="object-cover"
                  />
                </div>
              </div>

              {/* Message Header - only show for first message in group */}
              {showAvatar && (
                <div className="chat-header mb-1 flex items-center gap-2">
                  <span className="font-medium text-sm">
                    {senderProfile?.fullName || "User"}
                  </span>
                  <time className="text-xs text-base-content/50">
                    {formatMessageTime(message.createdAt)}
                  </time>
                </div>
              )}

              {/* Message Bubble */}
              <div
                className={`chat-bubble max-w-[85%] sm:max-w-[70%] shadow-sm group ${
                  isOwnMessage
                    ? "bg-primary text-primary-content"
                    : "bg-base-200 text-base-content"
                } ${message.decryptionFailed ? "opacity-60" : ""}`}
                style={{ position: "relative" }}
              >
                <div className="absolute top-1 right-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() =>
                        setOpenMenuFor(openMenuFor === message._id ? null : message._id)
                      }
                      className="p-1 rounded hover:bg-base-300/60"
                      aria-label="Message menu"
                      title="Options"
                    >
                      <ChevronDown className="size-4 text-base-content/60" />
                    </button>

                    {openMenuFor === message._id && (
                      <div className="mt-2 bg-base-100 border rounded shadow-md text-sm right-0 absolute w-60 z-30">
                        <div className="p-2 border-b border-base-200 flex flex-wrap gap-1 justify-center">
                            {["👍", "❤️", "😂", "😮", "😢", "😡", "🔥", "🎉", "👀", "💯", "👎", "🚀"].map((emoji) => (
                                <button
                                    key={emoji}
                                    onClick={() => {
                                        addReaction(message._id, emoji);
                                        setOpenMenuFor(null);
                                    }}
                                    className={`p-1.5 rounded-full hover:bg-base-200 transition-colors text-lg
                                        ${message.reactions?.some(r => r.fromId === authUser._id && r.emoji === emoji) ? 'bg-primary/10' : ''}
                                    `}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                        
                        {isOwnMessage && (
                            <button
                              className="w-full text-left px-3 py-2 hover:bg-base-200"
                              onClick={() => {
                                startEditing(message);
                                setOpenMenuFor(null);
                              }}
                            >
                              Edit message
                            </button>
                        )}
                        
                        <button
                          className="w-full text-left px-3 py-2 hover:bg-base-200"
                          onClick={() => {
                            deleteForMe(message._id);
                            setOpenMenuFor(null);
                          }}
                        >
                          Delete for me
                        </button>
                        
                        {isOwnMessage && (
                            <button
                              className="w-full text-left px-3 py-2 hover:bg-base-200 text-error"
                              onClick={() => {
                                deleteMessage(message._id);
                                setOpenMenuFor(null);
                              }}
                            >
                              Delete for everyone
                            </button>
                        )}
                      </div>
                    )}
                  </div>
                
                {message.image && (
                  <img
                    src={message.image}
                    alt="Attachment"
                    className="max-w-[250px] rounded-lg mb-2 cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => window.open(message.image, "_blank")}
                  />
                )}
                
                {/* Editing Mode */}
                {editingMessageId === message._id ? (
                    <div className="min-w-[200px]">
                        <textarea
                            className="w-full p-2 text-base-content bg-base-100 rounded border border-base-300 focus:outline-none focus:ring-1 focus:ring-primary mb-2"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            rows={2}
                        />
                        <div className="flex justify-end gap-2">
                            <button 
                                className="btn btn-xs btn-ghost"
                                onClick={cancelEditing}
                            >
                                Cancel
                            </button>
                            <button 
                                className="btn btn-xs btn-primary"
                                onClick={() => handleSaveEdit(message._id)}
                            >
                                Save
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Display decrypted text or fallback to original text */
                    (message.decryptedText || message.text) && (
                      <div className="flex flex-col">
                        <p
                          className={`text-[15px] leading-relaxed break-words whitespace-pre-wrap ${
                            message.decryptionFailed ? "italic" : ""
                          }`}
                        >
                           {message.decryptedText ?? message.text}
                           {message.isEdited && <span className="text-[10px] opacity-50 ml-1">(edited)</span>}
                        </p>
                        
                      {/* Reactions Display */}
                      {message.reactions && message.reactions.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5 -mb-2 relative z-10">
                            {Object.entries(
                                message.reactions.reduce((acc, curr) => {
                                    acc[curr.emoji] = (acc[curr.emoji] || 0) + 1;
                                    return acc;
                                }, {})
                            ).map(([emoji, count]) => {
                                const hasReacted = message.reactions.some(r => r.fromId === authUser._id && r.emoji === emoji);
                                return (
                                    <button
                                        key={emoji}
                                        onClick={() => addReaction(message._id, emoji)}
                                        className={`badge badge-sm gap-1 border-none shadow-sm text-xs h-5 px-1.5 
                                            ${hasReacted 
                                                ? 'bg-primary/20 text-primary hover:bg-primary/30' 
                                                : 'bg-base-200 text-base-content/70 hover:bg-base-300'}`}
                                    >
                                        <span>{emoji}</span>
                                        <span className="text-[10px] opacity-70">{count}</span>
                                    </button>
                                );
                            })}
                        </div>
                      )}

                      {message.expiresAt && (
                          <div className="text-[10px] opacity-50 flex items-center gap-1 mt-1">
                              <Timer className="size-3" />
                              <span>Expiring</span>
                          </div>
                        )}
                      </div>
                    )
                )}
              </div>

              {/* Time for non-first messages with encryption indicator */}
              {!showAvatar && (
                <div className="chat-footer text-xs text-base-content/40 mt-0.5 flex items-center gap-1">
                  {formatMessageTime(message.createdAt)}
                  <EncryptionBadge message={message} />
                  {isOwnMessage && (
                      <span className="ml-1">
                          {message.status === "seen" ? (
                              <CheckCheck className="size-3 text-blue-500" />
                          ) : message.status === "delivered" ? (
                              <CheckCheck className="size-3" />
                          ) : (
                              <Check className="size-3" />
                          )}
                      </span>
                  )}
                </div>
              )}

              {/* Encryption indicator for first message in group */}
              {showAvatar && (
                <div className="chat-footer mt-0.5 flex items-center gap-1">
                  <EncryptionBadge message={message} />
                  {isOwnMessage && (
                      <span className="ml-1">
                          {message.status === "seen" ? (
                              <CheckCheck className="size-3 text-blue-500" />
                          ) : message.status === "delivered" ? (
                              <CheckCheck className="size-3" />
                          ) : (
                              <Check className="size-3" />
                          )}
                      </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
        <div ref={messageEndRef} />
      </div>

      <MessageInput />
    </div>
  );
};

export default ChatContainer;
