import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Zap, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

interface Message {
  id: string;
  role: "user" | "ai";
  content: string;
  timestamp: Date;
  suggestions?: string[];
  showProgress?: boolean;
  progressSteps?: { label: string; done: boolean }[];
}

const initialMessage: Message = {
  id: "1",
  role: "ai",
  content: "What would you like to predict?",
  timestamp: new Date(),
  suggestions: [
    "Customer churn",
    "Sales forecast",
    "Sentiment analysis",
    "Anomaly detection",
  ],
};

export default function AIInterview() {
  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [inputValue, setInputValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
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
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: getAIResponse(content),
        timestamp: new Date(),
        suggestions: getFollowUpSuggestions(content),
        showProgress: shouldShowProgress(content),
        progressSteps: getProgressSteps(content),
      };

      setMessages((prev) => [...prev, aiResponse]);
      setIsProcessing(false);
    }, 1000);
  };

  const getAIResponse = (input: string): string => {
    const lower = input.toLowerCase();
    if (lower.includes("churn")) {
      return "I'll build a customer churn model. What data do you have available?";
    }
    if (lower.includes("sales") || lower.includes("forecast")) {
      return "Sales forecasting - got it. How far ahead should I predict?";
    }
    if (lower.includes("sentiment") || lower.includes("review")) {
      return "Sentiment classification coming up. This will categorize text automatically.";
    }
    if (lower.includes("anomal") || lower.includes("detect") || lower.includes("fraud")) {
      return "Anomaly detection is crucial. I'll build an unsupervised model for this.";
    }
    return "Got it! Let me configure the right ML pipeline.";
  };

  const getFollowUpSuggestions = (input: string): string[] => {
    const lower = input.toLowerCase();
    if (lower.includes("churn")) {
      return ["Connect database", "Use sample data", "Show examples"];
    }
    if (lower.includes("sales")) {
      return ["Import CSV", "30-day forecast", "Include seasonality"];
    }
    return ["Connect data", "See demo", "Configure"];
  };

  const shouldShowProgress = (input: string): boolean => {
    const lower = input.toLowerCase();
    return lower.includes("connect") || lower.includes("start") || lower.includes("build");
  };

  const getProgressSteps = (_input: string): { label: string; done: boolean }[] => {
    return [
      { label: "Analyzing requirements", done: true },
      { label: "Identifying data sources", done: true },
      { label: "Configuring pipeline", done: false },
      { label: "Training model", done: false },
    ];
  };

  return (
    <div className="min-h-screen bg-background dot-grid flex flex-col">
      {/* Simple header */}
      <header className="h-16 border-b-2 border-border bg-background flex items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="font-semibold">Back</span>
        </Link>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-black tracking-tight">AutoML</span>
        </div>

        <div className="w-20" />
      </header>

      {/* Main content - centered */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-32">
        <div className="w-full max-w-2xl">
          {/* Hero text */}
          <AnimatePresence>
            {!hasStarted && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center mb-12"
              >
                <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-6">
                  <Zap className="w-8 h-8 text-primary-foreground" />
                </div>
                <h1 className="display-hero mb-4">
                  What do you want
                  <br />
                  <span className="text-primary">to predict?</span>
                </h1>
                <p className="text-xl text-muted-foreground font-medium">
                  Describe your goal. We'll handle the rest.
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

                      {/* Progress steps */}
                      {message.showProgress && message.progressSteps && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.3 }}
                          className="ml-12 p-4 card-bordered"
                        >
                          <div className="space-y-3">
                            {message.progressSteps.map((step, i) => (
                              <div key={i} className="flex items-center gap-3">
                                <div
                                  className={`w-5 h-5 rounded-md flex items-center justify-center border-2 ${
                                    step.done
                                      ? "bg-foreground border-foreground"
                                      : "border-border"
                                  }`}
                                >
                                  {step.done && (
                                    <svg className="w-3 h-3 text-background" fill="currentColor" viewBox="0 0 20 20">
                                      <path
                                        fillRule="evenodd"
                                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                  )}
                                </div>
                                <span
                                  className={`text-sm font-medium ${
                                    step.done ? "text-foreground" : "text-muted-foreground"
                                  }`}
                                >
                                  {step.label}
                                </span>
                                {!step.done && i === message.progressSteps!.findIndex((s) => !s.done) && (
                                  <div className="w-4 h-4 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
                                )}
                              </div>
                            ))}
                          </div>
                        </motion.div>
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

          {/* Input */}
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
