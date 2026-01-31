import { motion } from "framer-motion";
import { Brain, User, Paperclip, Send } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChatMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  timestamp: Date;
  quickReplies?: string[];
}

interface ChatBubbleProps {
  message: ChatMessage;
  onQuickReply?: (reply: string) => void;
  isLatest?: boolean;
}

export function ChatBubble({ message, onQuickReply, isLatest }: ChatBubbleProps) {
  const isAI = message.role === "ai";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn("flex gap-3 max-w-[85%]", isAI ? "self-start" : "self-end flex-row-reverse")}
    >
      {/* Avatar */}
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
          isAI ? "gradient-primary" : "bg-muted"
        )}
      >
        {isAI ? (
          <Brain className="w-4 h-4 text-primary-foreground" />
        ) : (
          <User className="w-4 h-4 text-muted-foreground" />
        )}
      </div>

      <div className="flex flex-col gap-2">
        {/* Message bubble */}
        <div
          className={cn(
            "px-4 py-3 text-sm leading-relaxed",
            isAI ? "chat-bubble-ai" : "chat-bubble-user border border-border"
          )}
        >
          {message.content}
        </div>

        {/* Quick replies */}
        {isAI && message.quickReplies && isLatest && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap gap-2"
          >
            {message.quickReplies.map((reply) => (
              <button
                key={reply}
                onClick={() => onQuickReply?.(reply)}
                className="px-3 py-1.5 text-xs font-medium rounded-full border border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                {reply}
              </button>
            ))}
          </motion.div>
        )}

        {/* Timestamp */}
        <span className={cn("text-[10px] text-muted-foreground", !isAI && "text-right")}>
          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </motion.div>
  );
}

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onAttach?: () => void;
  disabled?: boolean;
}

export function ChatInput({ value, onChange, onSend, onAttach, disabled }: ChatInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="flex items-end gap-3 p-4 bg-card border-t border-border">
      <button
        onClick={onAttach}
        className="p-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <Paperclip className="w-5 h-5" />
      </button>

      <div className="flex-1 relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe your ML requirements..."
          disabled={disabled}
          rows={1}
          className="w-full px-4 py-3 rounded-xl border border-border bg-muted/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
        />
      </div>

      <button
        onClick={onSend}
        disabled={!value.trim() || disabled}
        className={cn(
          "p-2.5 rounded-lg transition-colors",
          value.trim()
            ? "gradient-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        )}
      >
        <Send className="w-5 h-5" />
      </button>
    </div>
  );
}
