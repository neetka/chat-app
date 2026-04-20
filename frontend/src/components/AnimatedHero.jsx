import React from "react";
import { motion } from "framer-motion";
import { MessageSquare, Lock, Video } from "lucide-react";

const fakeMessages = [
  {
    id: 1,
    text: "Hey! Did you check out Yapp?",
    sender: "other",
    time: "10:00 AM",
  },
  {
    id: 2,
    text: "Yes! The real-time messaging is insane. 🚀",
    sender: "me",
    time: "10:01 AM",
  },
  {
    id: 3,
    text: "Right?! And fully encrypted too.",
    sender: "other",
    time: "10:02 AM",
  },
];

const AnimatedHero = () => {
  return (
    <div className="relative flex-1 hidden lg:flex items-center justify-center overflow-hidden bg-transparent">
      {/* Background Glowing Ambient Orbs */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/30 rounded-full blur-[100px] pointer-events-none"
      />
      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
        className="absolute bottom-1/4 right-1/4 w-[28rem] h-[28rem] bg-secondary/20 rounded-full blur-[120px] pointer-events-none"
      />

      {/* Main Hero Container */}
      <div className="relative w-full max-w-lg z-10">
        
        {/* Floating Feature Badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="absolute -top-12 -left-8 bg-base-200/50 backdrop-blur-xl border border-base-content/10 px-4 py-2 rounded-2xl flex items-center gap-3 shadow-2xl"
        >
          <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center">
            <MessageSquare className="size-4 text-primary" />
          </div>
          <span className="text-sm font-medium text-base-content/90">Real-time Chat</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="absolute top-32 -right-12 bg-base-200/50 backdrop-blur-xl border border-base-content/10 px-4 py-2 rounded-2xl flex items-center gap-3 shadow-2xl z-20"
        >
          <div className="size-8 rounded-full bg-secondary/20 flex items-center justify-center">
            <Lock className="size-4 text-secondary" />
          </div>
          <span className="text-sm font-medium text-base-content/90">End-to-End Encrypted</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="absolute -bottom-6 left-8 bg-base-200/50 backdrop-blur-xl border border-base-content/10 px-4 py-2 rounded-2xl flex items-center gap-3 shadow-2xl z-20"
        >
          <div className="size-8 rounded-full bg-accent/20 flex items-center justify-center">
            <Video className="size-4 text-accent" />
          </div>
          <span className="text-sm font-medium text-base-content/90">Seamless Video Calls</span>
        </motion.div>

        {/* Mock Chat Interface */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-full bg-base-200/80 backdrop-blur-2xl border border-base-content/5 rounded-3xl overflow-hidden shadow-2xl relative"
        >
          {/* Chat Header */}
          <div className="h-16 border-b border-base-content/5 flex items-center px-6 gap-4 bg-base-content/5">
            <div className="relative">
              <div className="size-10 rounded-full bg-gradient-to-tr from-primary to-secondary p-[2px]">
                <div className="w-full h-full bg-base-300 rounded-full flex items-center justify-center overflow-hidden">
                   <img src="/avatar.png" alt="User" className="w-full h-full object-cover opacity-80" />
                </div>
              </div>
              <div className="absolute bottom-0 right-0 size-3 rounded-full bg-success border-2 border-base-200"></div>
            </div>
            <div>
              <h3 className="font-semibold text-base-content/90 text-sm">Cipher Team</h3>
              <p className="text-xs text-base-content/40">Online</p>
            </div>
          </div>

          {/* Chat Body */}
          <div className="p-6 space-y-6 min-h-[320px] flex flex-col justify-end">
            {fakeMessages.map((msg, idx) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4, delay: 1 + idx * 0.8 }}
                className={`flex flex-col ${
                  msg.sender === "me" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm shadow-md ${
                    msg.sender === "me"
                      ? "bg-primary text-primary-content rounded-br-sm"
                      : "bg-base-300 text-base-content border border-base-content/5 rounded-bl-sm"
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[10px] text-base-content/30 mt-1.5 px-1 font-medium">
                  {msg.time}
                </span>
              </motion.div>
            ))}

            {/* Typing Indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 2, delay: 3.5, repeat: Infinity }}
              className="flex items-start"
            >
              <div className="bg-base-300 px-4 py-3 rounded-2xl rounded-bl-sm border border-base-content/5 flex items-center gap-1.5 shadow-md">
                <span className="size-1.5 rounded-full bg-base-content/40 animate-bounce" style={{ animationDelay: "0ms" }}></span>
                <span className="size-1.5 rounded-full bg-base-content/40 animate-bounce" style={{ animationDelay: "150ms" }}></span>
                <span className="size-1.5 rounded-full bg-base-content/40 animate-bounce" style={{ animationDelay: "300ms" }}></span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AnimatedHero;
