import { MessageSquare, Users, ArrowLeft } from "lucide-react";

const NoChatSelected = () => {
  return (
    <div className="w-full flex flex-1 flex-col items-center justify-center p-8 bg-gradient-to-br from-base-100 to-base-200">
      <div className="max-w-md text-center space-y-8">
        {/* Animated Icon */}
        <div className="relative">
          <div className="w-24 h-24 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <MessageSquare className="w-12 h-12 text-primary animate-pulse" />
          </div>
          {/* Decorative circles */}
          <div
            className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-secondary/20 animate-bounce"
            style={{ animationDelay: "0.1s" }}
          />
          <div
            className="absolute -bottom-1 -left-3 w-6 h-6 rounded-full bg-accent/20 animate-bounce"
            style={{ animationDelay: "0.3s" }}
          />
        </div>

        {/* Welcome Text */}
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Welcome to Chatty!
          </h2>
          <p className="text-base-content/60 mt-3 text-lg">
            Connect with friends and start conversations
          </p>
        </div>

        {/* Instructions */}
        <div className="flex items-center justify-center gap-3 text-base-content/50">
          <ArrowLeft className="w-5 h-5 animate-pulse" />
          <span>Select a chat from the sidebar to begin</span>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 gap-4 pt-4">
          <div className="p-4 bg-base-100 rounded-xl shadow-sm border border-base-300">
            <Users className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="text-sm font-medium">Real-time Chat</p>
          </div>
          <div className="p-4 bg-base-100 rounded-xl shadow-sm border border-base-300">
            <MessageSquare className="w-8 h-8 text-secondary mx-auto mb-2" />
            <p className="text-sm font-medium">Instant Messages</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoChatSelected;
