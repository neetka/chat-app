import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef, useState } from "react";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { useFriendStore } from "../store/useFriendStore";
import { formatMessageTime } from "../lib/utils";
import { Lock, LockOpen, AlertCircle, ChevronDown, Check, CheckCheck, Timer, Smile, Plus, Reply, UserPlus, Clock, UserCheck, ShieldX } from "lucide-react";

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
    setReplyingTo,
    isTyping,
    groupTyping,
  } = useChatStore();
  const { authUser } = useAuthStore();
  const { sendRequest, acceptRequest, rejectRequest } = useFriendStore();
  const { getUsers } = useChatStore();
  const [openMenuFor, setOpenMenuFor] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState("");
  const [isSendingRequest, setIsSendingRequest] = useState(false);

  // Determine friendship status for the selected P2P user
  const isGroup = !!selectedGroup;
  const isFriend = isGroup || selectedUser?.friendshipStatus === "accepted";
  const friendshipStatus = selectedUser?.friendshipStatus || "none";
  const friendRequestDirection = selectedUser?.friendRequestDirection || null;
  const friendRequestId = selectedUser?.friendRequestId || null;

  const handleSendFriendRequest = async () => {
    if (!selectedUser) return;
    setIsSendingRequest(true);
    const result = await sendRequest(selectedUser._id);
    if (result) await getUsers();
    setIsSendingRequest(false);
  };

  const handleAcceptFriendRequest = async () => {
    if (!friendRequestId) return;
    setIsSendingRequest(true);
    const success = await acceptRequest(friendRequestId);
    if (success) await getUsers();
    setIsSendingRequest(false);
  };

  const handleRejectFriendRequest = async () => {
    if (!friendRequestId) return;
    setIsSendingRequest(true);
    const success = await rejectRequest(friendRequestId);
    if (success) await getUsers();
    setIsSendingRequest(false);
  };

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
        {/* Friend request prompt — shown when not friends */}
        {!isFriend && !isGroup && (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="bg-base-200/80 backdrop-blur-sm rounded-2xl p-8 max-w-sm text-center shadow-lg border border-base-300">
              {friendshipStatus === "none" && (
                <>
                  <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <UserPlus className="size-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">Send a friend request</h3>
                  <p className="text-sm text-base-content/60 mb-5">
                    You need to be friends with <span className="font-medium text-base-content">{selectedUser?.fullName}</span> before you can start chatting.
                  </p>
                  <button
                    onClick={handleSendFriendRequest}
                    disabled={isSendingRequest}
                    className="btn btn-primary gap-2 shadow-md"
                  >
                    {isSendingRequest ? (
                      <span className="loading loading-spinner loading-sm" />
                    ) : (
                      <UserPlus size={18} />
                    )}
                    Send Friend Request
                  </button>
                </>
              )}

              {friendshipStatus === "pending" && friendRequestDirection === "sent" && (
                <>
                  <div className="size-16 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-4">
                    <Clock className="size-8 text-warning" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">Request pending</h3>
                  <p className="text-sm text-base-content/60">
                    You've sent a friend request to <span className="font-medium text-base-content">{selectedUser?.fullName}</span>. Waiting for them to accept.
                  </p>
                  <div className="mt-4 flex items-center justify-center gap-2 text-xs text-warning">
                    <span className="loading loading-dots loading-xs" />
                    Waiting for response…
                  </div>
                </>
              )}

              {friendshipStatus === "pending" && friendRequestDirection === "received" && (
                <>
                  <div className="size-16 rounded-full bg-info/10 flex items-center justify-center mx-auto mb-4">
                    <UserPlus className="size-8 text-info" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">Friend request received</h3>
                  <p className="text-sm text-base-content/60 mb-5">
                    <span className="font-medium text-base-content">{selectedUser?.fullName}</span> wants to connect with you. Accept to start chatting.
                  </p>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={handleAcceptFriendRequest}
                      disabled={isSendingRequest}
                      className="btn btn-success gap-2"
                    >
                      <UserCheck size={18} /> Accept
                    </button>
                    <button
                      onClick={handleRejectFriendRequest}
                      disabled={isSendingRequest}
                      className="btn btn-ghost gap-2"
                    >
                      <ShieldX size={18} /> Decline
                    </button>
                  </div>
                </>
              )}

              {friendshipStatus === "rejected" && (
                <>
                  <div className="size-16 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-4">
                    <ShieldX className="size-8 text-error/60" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">Request declined</h3>
                  <p className="text-sm text-base-content/60">
                    The friend request was declined.
                  </p>
                  {friendRequestDirection === "sent" && (
                    <button
                      onClick={handleSendFriendRequest}
                      disabled={isSendingRequest}
                      className="btn btn-outline btn-sm gap-2 mt-4"
                    >
                      <UserPlus size={14} /> Try Again
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Normal empty state for friends */}
        {isFriend && messages.length === 0 && (
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
                        
                        <button
                          className="w-full text-left px-3 py-2 hover:bg-base-200"
                          onClick={() => {
                            setReplyingTo(message);
                            setOpenMenuFor(null);
                          }}
                        >
                          Reply
                        </button>
                        
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

                {/* Replied Message Display */}
                {message.replyTo && (
                  <div className={`mb-2 p-2 rounded border-l-2 ${
                    isOwnMessage
                      ? "border-primary/50 bg-primary/10"
                      : "border-base-300 bg-base-300/30"
                  }`}>
                    <div className="flex items-start gap-2">
                      <Reply className="size-3 mt-0.5 flex-shrink-0 opacity-50" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium opacity-70">
                          {message.replyTo?.senderId?.fullName || "User"}
                        </p>
                        <p className="text-xs opacity-60 break-words whitespace-pre-wrap line-clamp-2">
                          {message.replyTo?.decryptedText || message.replyTo?.text || "Image attachment"}
                        </p>
                      </div>
                    </div>
                  </div>
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

        {/* P2P Typing Indicator */}
        {selectedUser && isTyping && (
          <div className="chat chat-start mt-4">
            <div className="chat-image avatar">
              <div className="size-9 rounded-full ring-2 ring-offset-2 ring-offset-base-100 ring-secondary/30">
                <img
                  src={selectedUser?.profilePic || "/avatar.png"}
                  alt="profile pic"
                  className="object-cover"
                />
              </div>
            </div>
            <div className="chat-bubble bg-base-200 text-base-content">
              <span className="inline-flex gap-1">
                <span className="inline-block w-2 h-2 bg-base-content/40 rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
                <span className="inline-block w-2 h-2 bg-base-content/40 rounded-full animate-bounce" style={{ animationDelay: "0.15s" }} />
                <span className="inline-block w-2 h-2 bg-base-content/40 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }} />
              </span>
            </div>
          </div>
        )}

        {/* Group Typing Indicator */}
        {selectedGroup && Object.keys(groupTyping).length > 0 && (
          <div className="chat chat-start mt-4">
            <div className="chat-bubble bg-base-200 text-base-content text-xs">
              <div className="flex items-center gap-2">
                <span className="inline-flex gap-1">
                  <span className="inline-block w-1.5 h-1.5 bg-base-content/40 rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
                  <span className="inline-block w-1.5 h-1.5 bg-base-content/40 rounded-full animate-bounce" style={{ animationDelay: "0.15s" }} />
                  <span className="inline-block w-1.5 h-1.5 bg-base-content/40 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }} />
                </span>
                <span className="opacity-70">
                  {Object.values(groupTyping)
                    .map(u => u.name)
                    .join(", ")} {Object.keys(groupTyping).length === 1 ? "is" : "are"} typing...
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messageEndRef} />
      </div>

      {/* Only show message input for friends or groups */}
      {isFriend && <MessageInput />}

      {/* Non-friend bottom bar */}
      {!isFriend && !isGroup && (
        <div className="p-4 bg-base-200/50 border-t border-base-300 text-center">
          <p className="text-sm text-base-content/50">
            🔒 You must be friends to send messages
          </p>
        </div>
      )}
    </div>
  );
};

export default ChatContainer;
