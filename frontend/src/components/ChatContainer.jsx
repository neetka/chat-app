import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef } from "react";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";
import { Lock, LockOpen, AlertCircle } from "lucide-react";

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
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
    encryptionEnabled,
  } = useChatStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);

  useEffect(() => {
    getMessages(selectedUser._id);
    subscribeToMessages();
    return () => unsubscribeFromMessages();
  }, [
    selectedUser._id,
    getMessages,
    subscribeToMessages,
    unsubscribeFromMessages,
  ]);

  useEffect(() => {
    if (messageEndRef.current && messages) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

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
          const isOwnMessage = message.senderId === authUser._id;
          const showAvatar =
            index === 0 || messages[index - 1]?.senderId !== message.senderId;

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
                    src={
                      isOwnMessage
                        ? authUser.profilePic || "/avatar.png"
                        : selectedUser.profilePic || "/avatar.png"
                    }
                    alt="profile pic"
                    className="object-cover"
                  />
                </div>
              </div>

              {/* Message Header - only show for first message in group */}
              {showAvatar && (
                <div className="chat-header mb-1 flex items-center gap-2">
                  <span className="font-medium text-sm">
                    {isOwnMessage ? "You" : selectedUser.fullName}
                  </span>
                  <time className="text-xs text-base-content/50">
                    {formatMessageTime(message.createdAt)}
                  </time>
                </div>
              )}

              {/* Message Bubble */}
              <div
                className={`chat-bubble max-w-[85%] sm:max-w-[70%] shadow-sm ${
                  isOwnMessage
                    ? "bg-primary text-primary-content"
                    : "bg-base-200 text-base-content"
                } ${message.decryptionFailed ? "opacity-60" : ""}`}
              >
                {message.image && (
                  <img
                    src={message.image}
                    alt="Attachment"
                    className="max-w-[250px] rounded-lg mb-2 cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => window.open(message.image, "_blank")}
                  />
                )}
                {/* Display decrypted text or fallback to original text */}
                {(message.decryptedText || message.text) && (
                  <p
                    className={`text-[15px] leading-relaxed break-words whitespace-pre-wrap ${
                      message.decryptionFailed ? "italic" : ""
                    }`}
                  >
                    {message.decryptedText ?? message.text}
                  </p>
                )}
              </div>

              {/* Time for non-first messages with encryption indicator */}
              {!showAvatar && (
                <div className="chat-footer text-xs text-base-content/40 mt-0.5 flex items-center gap-1">
                  {formatMessageTime(message.createdAt)}
                  <EncryptionBadge message={message} />
                </div>
              )}

              {/* Encryption indicator for first message in group */}
              {showAvatar && (
                <div className="chat-footer mt-0.5 flex items-center gap-1">
                  <EncryptionBadge message={message} />
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
