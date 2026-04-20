import React, { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import AuthImagePattern from "../components/AuthImagePattern";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Zap,
} from "lucide-react";

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const { login, isLoggingIn } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    login(formData);
  };

  return (
    <div className="min-h-screen bg-base-100 flex relative overflow-hidden text-base-content font-sans">
      {/* Absolute Ambient Background (Radial gradients) */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-secondary/10 rounded-full blur-[150px]" />
      </div>

      <div className="w-full min-h-screen grid lg:grid-cols-2 z-10 relative">
        {/* LEFT SIDE: Login Form */}
        <div className="flex flex-col justify-center items-center p-6 sm:p-12 relative">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="w-full max-w-md"
          >
            {/* Glassmorphism Card */}
            <div className="bg-base-200/30 backdrop-blur-2xl border border-base-content/10 p-8 sm:p-10 rounded-3xl shadow-2xl relative overflow-hidden">
              {/* Subtle top glare */}
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-base-content/20 to-transparent"></div>

              {/* Header */}
              <div className="text-center mb-10">
                <motion.div
                  whileHover={{ scale: 1.05, rotate: 2 }}
                  className="inline-flex flex-col items-center gap-3 cursor-pointer"
                >
                  <div className="size-14 rounded-2xl bg-gradient-to-tr from-primary to-secondary p-[1px] shadow-lg">
                    <div className="w-full h-full bg-base-100 rounded-2xl flex items-center justify-center">
                      <Zap className="size-7 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-br from-base-content to-base-content/60 bg-clip-text text-transparent">
                      Yapp
                    </h1>
                    <p className="text-sm font-medium text-base-content/50 mt-1">
                      Private. Fast. Real-time conversations.
                    </p>
                  </div>
                </motion.div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-base-content/70 mb-2 ml-1">
                    Email Address
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="size-5 text-base-content/40 group-focus-within:text-primary transition-colors" />
                    </div>
                    <input
                      type="email"
                      className="w-full bg-base-200/50 border border-base-content/10 rounded-xl py-3.5 pl-12 pr-4 text-base-content placeholder-base-content/20 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all shadow-inner"
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-base-content/70 mb-2 ml-1">
                    Password
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="size-5 text-base-content/40 group-focus-within:text-primary transition-colors" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      className="w-full bg-base-200/50 border border-base-content/10 rounded-xl py-3.5 pl-12 pr-12 text-base-content placeholder-base-content/20 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all shadow-inner"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      required
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-4 flex items-center hover:text-base-content text-base-content/40 transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="size-5" />
                      ) : (
                        <Eye className="size-5" />
                      )}
                    </button>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isLoggingIn}
                  className="btn btn-primary w-full py-3.5 h-auto rounded-xl shadow-lg border-none flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isLoggingIn ? (
                    <>
                      <Loader2 className="size-5 animate-spin mr-2" />
                      Authenticating...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </motion.button>
              </form>

              {/* Footer */}
              <div className="mt-8 text-center">
                <p className="text-base-content/50 text-sm">
                  Don't have an account?{" "}
                  <Link
                    to="/signup"
                    className="text-primary hover:text-primary-focus font-medium hover:underline transition-colors ml-1"
                  >
                    Create account
                  </Link>
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* RIGHT SIDE: Static Image Setup */}
        <AuthImagePattern
          title={"Welcome back!"}
          subtitle={"Sign in to continue your conversations and catch up with your messages."}
        />
      </div>
    </div>
  );
};

export default LoginPage;
