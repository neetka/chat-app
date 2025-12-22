import { useRef, useState, useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { Image, Send, X, Smile, Paperclip } from "lucide-react";
import toast from "react-hot-toast";
import EmojiPicker from "emoji-picker-react";

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [isFocused, setIsFocused] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const { 
    sendTypingEvent, 
    sendStopTypingEvent 
  } = useChatStore();
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const inputRef = useRef(null);
  const { sendMessage } = useChatStore();

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target)
      ) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleEmojiClick = (emojiData) => {
    setText((prev) => prev + emojiData.emoji);
    inputRef.current?.focus();
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file?.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };
  
  const { selectedUser } = useChatStore();

  const handleInputChange = (e) => {
    setText(e.target.value);
    
    // Typing indicator logic (P2P only for now)
    if (!selectedUser) return;
    
    sendTypingEvent(selectedUser._id);
    
    // Clear existing timeout
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    // Set new timeout to stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
        sendStopTypingEvent(selectedUser._id);
    }, 2000);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview) return;

    try {
      await sendMessage({
        text: text.trim(),
        image: imagePreview,
      });

      // Clear typing indicator immediately upon sending (P2P only)
      if (selectedUser) {
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          sendStopTypingEvent(selectedUser._id);
      }

      // Clear form
      setText("");
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  return (
    <div className="p-4 bg-base-100 border-t border-base-300">
      {/* Image Preview */}
      {imagePreview && (
        <div className="mb-3 p-2 bg-base-200 rounded-lg inline-block">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="max-w-[200px] max-h-[150px] object-cover rounded-lg"
            />
            <button
              onClick={removeImage}
              className="absolute -top-2 -right-2 btn btn-circle btn-xs btn-error shadow-md"
              type="button"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSendMessage} className="flex items-end gap-3">
        {/* Attachment Button */}
        <div className="flex gap-1">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageChange}
          />
          <button
            type="button"
            className={`btn btn-ghost btn-circle btn-sm hover:bg-primary/10 ${
              imagePreview ? "text-primary" : "text-base-content/60"
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip size={20} />
          </button>
        </div>

        {/* Text Input */}
        <div
          className={`flex-1 relative transition-all duration-200 ${
            isFocused ? "scale-[1.01]" : ""
          }`}
        >
          <input
            type="text"
            ref={inputRef}
            className="w-full input input-bordered rounded-full pr-12 bg-base-200/50 
                       focus:bg-base-100 focus:border-primary/50 transition-all duration-200
                       placeholder:text-base-content/40"
            placeholder="Type a message..."
            value={text}
            onChange={handleInputChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />

          {/* Emoji Picker Button & Container */}
          <div
            className="absolute right-3 top-1/2 -translate-y-1/2"
            ref={emojiPickerRef}
          >
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`text-base-content/40 hover:text-base-content/70 transition-colors ${
                showEmojiPicker ? "text-primary" : ""
              }`}
            >
              <Smile size={20} />
            </button>

            {/* Emoji Picker Dropdown */}
            {showEmojiPicker && (
              <div className="absolute bottom-10 right-0 z-50">
                <EmojiPicker
                  onEmojiClick={handleEmojiClick}
                  width={300}
                  height={400}
                  searchPlaceHolder="Search emoji..."
                  previewConfig={{ showPreview: false }}
                  skinTonesDisabled
                  lazyLoadEmojis
                />
              </div>
            )}
          </div>
        </div>

        {/* Send Button */}
        <button
          type="submit"
          className={`btn btn-circle btn-primary shadow-lg transition-all duration-200 ${
            text.trim() || imagePreview
              ? "scale-100 opacity-100"
              : "scale-90 opacity-60"
          }`}
          disabled={!text.trim() && !imagePreview}
        >
          <Send
            size={20}
            className={text.trim() || imagePreview ? "translate-x-0.5" : ""}
          />
        </button>
      </form>
    </div>
  );
};
export default MessageInput;
