import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Zap, Search, Play } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface Message {
  id: string;
  role: "user" | "ai";
  content: string;
  timestamp: Date;
  suggestions?: string[];
  showActions?: boolean;
}

const initialMessage: Message = {
  id: "1",
  role: "ai",
  content: "What would you like to build?",
  timestamp: new Date(),
  suggestions: [
    "Predict customer churn",
    "Forecast sales",
    "Classify reviews",
    "Detect fraud",
  ],
};

export default function Index() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [inputValue, setInputValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleSend = (message?: string) => {
    const content = message || inputValue;
    if (!content.trim() || isProcessing) return;

    setHasStarted(true);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsProcessing(true);

    setTimeout(() => {
      const newCount = questionCount + 1;
      setQuestionCount(newCount);
      
      // After 3 questions, show action buttons
      const shouldShowActions = newCount >= 3;
      
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: shouldShowActions 
          ? "Perfect! I have enough context now. Ready to search for data sources and start training your model."
          : getAIResponse(content),
        timestamp: new Date(),
        suggestions: shouldShowActions ? undefined : getFollowUpSuggestions(content),
        showActions: shouldShowActions,
      };

      setMessages((prev) => [...prev, aiResponse]);
      setIsProcessing(false);
    }, 1000);
  };

  const getAIResponse = (input: string): string => {
    const lower = input.toLowerCase();
    if (lower.includes("churn")) {
      return "Great! I'll build a customer churn prediction model. What data do you have?";
    }
    if (lower.includes("sales") || lower.includes("forecast")) {
      return "I'll set up sales forecasting for you. How far ahead do you want to predict?";
    }
    if (lower.includes("classify") || lower.includes("review")) {
      return "Sentiment analysis coming up. I'll categorize text as positive, negative, or neutral.";
    }
    if (lower.includes("fraud") || lower.includes("detect")) {
      return "Fraud detection is crucial. I'll build an anomaly detection model for you.";
    }
    return "Got it! Let me set up the right ML pipeline for this.";
  };

  const getFollowUpSuggestions = (input: string): string[] => {
    const lower = input.toLowerCase();
    if (lower.includes("churn")) {
      return ["Connect my database", "Use sample data", "Show examples"];
    }
    if (lower.includes("sales")) {
      return ["30 days ahead", "90 days ahead", "Import CSV"];
    }
    return ["Connect data", "See demo", "Configure"];
  };

  return (
    <div className="min-h-screen bg-background dot-grid flex flex-col">
      {/* Simple header */}
      <header className="h-16 border-b-2 border-border bg-background flex items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-black tracking-tight">AutoML</span>
        </Link>

        <nav className="flex items-center gap-6">
          <Link to="/crawler" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
            Crawler
          </Link>
          <Link to="/training" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
            Training
          </Link>
          <Link to="/settings" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
            Settings
          </Link>
        </nav>
      </header>

      {/* Main content - centered like Lovable */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-32">
        <div className="w-full max-w-2xl">
          {/* Hero text - only show before conversation starts */}
          <AnimatePresence>
            {!hasStarted && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center mb-12"
              >
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4">
                  Lovable for Machine Learning
                </p>
                <h1 className="display-hero mb-6">
                  Build ML models
                  <br />
                  <span className="text-primary">instantly.</span>
                </h1>
                <p className="text-xl text-muted-foreground font-medium">
                  Just describe what you want to predict. We'll handle the rest.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Messages */}
          <div className="space-y-4 mb-8">
            <AnimatePresence mode="popLayout">
              {messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {message.role === "user" ? (
                    <div className="chat-bubble-user px-5 py-3 max-w-md">
                      <p>{message.content}</p>
                    </div>
                  ) : (
                    <div className="max-w-lg space-y-3">
                      {index > 0 && (
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-foreground flex items-center justify-center shrink-0">
                            <Zap className="w-4 h-4 text-background" />
                          </div>
                          <div className="chat-bubble-ai px-5 py-3">
                            <p className="font-medium">{message.content}</p>
                          </div>
                        </div>
                      )}

                      {/* Suggestions */}
                      {message.suggestions && index === messages.length - 1 && !isProcessing && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.2 }}
                          className={`flex flex-wrap gap-2 ${index > 0 ? "ml-12" : ""}`}
                        >
                          {message.suggestions.map((suggestion) => (
                            <button
                              key={suggestion}
                              onClick={() => handleSend(suggestion)}
                              className="suggestion-chip"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </motion.div>
                      )}

                      {/* Action buttons after questions are done */}
                      {message.showActions && index === messages.length - 1 && !isProcessing && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                          className="ml-12 flex gap-3"
                        >
                          <Button
                            onClick={() => navigate("/crawler")}
                            className="gap-2"
                            size="lg"
                          >
                            <Search className="w-4 h-4" />
                            Start Search
                          </Button>
                          <Button
                            onClick={() => navigate("/training")}
                            variant="outline"
                            className="gap-2"
                            size="lg"
                          >
                            <Play className="w-4 h-4" />
                            Start Training
                          </Button>
                        </motion.div>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Typing indicator */}
            {isProcessing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-start gap-3"
              >
                <div className="w-9 h-9 rounded-xl bg-foreground flex items-center justify-center">
                  <Zap className="w-4 h-4 text-background" />
                </div>
                <div className="chat-bubble-ai px-5 py-4">
                  <div className="flex gap-1">
                    <motion.span
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="w-2 h-2 rounded-full bg-foreground"
                    />
                    <motion.span
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                      className="w-2 h-2 rounded-full bg-foreground"
                    />
                    <motion.span
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                      className="w-2 h-2 rounded-full bg-foreground"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input - always visible and centered */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Describe what you want to predict..."
              disabled={isProcessing}
              className="hero-input pr-14"
            />
            <button
              onClick={() => handleSend()}
              disabled={!inputValue.trim() || isProcessing}
              className={`absolute right-3 top-1/2 -translate-y-1/2 p-3 rounded-xl font-bold transition-all ${
                inputValue.trim()
                  ? "bg-foreground text-background"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              <Send className="w-5 h-5" />
            </button>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
