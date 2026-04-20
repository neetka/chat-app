import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import AnimatedHero from "../components/AnimatedHero";
import { MessageSquare, Lock, Video, Shield } from "lucide-react";

const features = [
  {
    icon: <MessageSquare className="size-6 text-primary" />,
    title: "Real-time messaging",
    description: "Instant delivery with modern chat features to keep your conversations flowing naturally.",
  },
  {
    icon: <Lock className="size-6 text-secondary" />,
    title: "End-to-end encryption",
    description: "Your messages are secured mathematically. Nobody can read them but you and the recipient.",
  },
  {
    icon: <Video className="size-6 text-accent" />,
    title: "Seamless video calls",
    description: "Jump into face-to-face conversations with high-definition, low-latency video calling.",
  },
  {
    icon: <Shield className="size-6 text-info" />,
    title: "Ultimate Privacy",
    description: "We don't track your data. Your communication is yours alone, giving you total peace of mind.",
  },
];

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-base-100 text-base-content font-sans overflow-hidden">
      {/* Absolute Ambient Background */}
      <div className="fixed inset-0 w-full h-full pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-secondary/10 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 container mx-auto px-4 pt-32 pb-20">
        
        {/* Hero Section */}
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[calc(100vh-10rem)] w-full relative z-10">
          {/* Left Text Content */}
          <div className="flex flex-col items-start text-left space-y-8 max-w-2xl">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight bg-gradient-to-br from-base-content to-base-content/60 bg-clip-text text-transparent mb-6 leading-[1.1]">
                Connecting in real time.
              </h1>
              <p className="text-lg md:text-xl text-base-content/60 max-w-lg leading-relaxed">
                Experience the evolution of digital communication. Fast, secure, and beautiful to use. Start talking to the people who matter most.
              </p>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
              className="flex flex-col sm:flex-row items-center gap-4 pt-4 w-full sm:w-auto"
            >
              <Link to="/login" className="w-full sm:w-auto">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 rounded-xl btn btn-primary text-primary-content shadow-lg hover:shadow-xl transition-shadow text-base border-none h-auto w-full sm:w-auto"
                >
                  Start Chatting Now
                </motion.button>
              </Link>
              <a href="#features" className="w-full sm:w-auto">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 rounded-xl bg-base-200/50 backdrop-blur-xl border border-base-content/10 text-base-content/80 font-semibold hover:bg-base-200/80 transition-colors w-full sm:w-auto"
                >
                  Explore Features
                </motion.button>
              </a>
            </motion.div>
          </div>

          {/* Right Visual Image */}
          <div className="hidden lg:flex w-full h-[600px] relative justify-center items-center">
            <AnimatedHero />
          </div>
        </div>

        {/* Features Section */}
        <div id="features" className="mt-40 scroll-mt-24">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent pb-2">
              Why use this app?
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-10 max-w-5xl mx-auto">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ scale: 1.05 }}
                className="bg-base-200/30 backdrop-blur-xl border border-base-content/5 p-10 min-h-[320px] flex flex-col justify-center rounded-3xl hover:bg-primary/10 transition-colors duration-300 shadow-lg cursor-default group"
              >
                <div className="size-14 rounded-xl bg-base-content/5 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-base-content/90 mb-3">
                  {feature.title}
                </h3>
                <p className="text-base-content/60 text-base leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default LandingPage;
