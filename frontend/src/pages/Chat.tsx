import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Zap, Send, ArrowLeft } from "lucide-react";
import { sendChat, startDiscovery } from "../api";
import type { ChatMessage, ChatResponse } from "../api";

interface Message {
  id: string;
  role: "user" | "ai";
  content: string;
  suggestions?: string[];
}

export default function Chat() {
  const navigate = useNavigate();
  const location = useLocation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle initial message from Home page
  useEffect(() => {
    const state = location.state as { initialMessage?: string; initialResponse?: ChatResponse } | null;
    if (state?.initialMessage) {
      const userMsg: Message = {
        id: "1",
        role: "user",
        content: state.initialMessage,
      };
      setMessages([userMsg]);
      setHistory([{ role: "user", content: state.initialMessage }]);

      if (state.initialResponse) {
        const aiMsg: Message = {
          id: "2",
          role: "ai",
          content: state.initialResponse.message,
          suggestions: state.initialResponse.suggestions,
        };
        setMessages([userMsg, aiMsg]);
        setHistory([
          { role: "user", content: state.initialMessage },
          { role: "assistant", content: state.initialResponse.message },
        ]);

        // Check if should start discovery
        if (state.initialResponse.should_start_discovery && state.initialResponse.task_description) {
          handleStartDiscovery(state.initialResponse.task_description);
        }
      }
      // Clear the state to prevent re-processing on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleStartDiscovery = async (taskDescription: string) => {
    try {
      const result = await startDiscovery(taskDescription);
      navigate("/crawler", { state: { projectId: result.project_id, task: taskDescription } });
    } catch (error) {
      console.error("Failed to start discovery:", error);
    }
  };

  const handleSend = async (text?: string) => {
    const message = text || input;
    if (!message.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: message,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const newHistory: ChatMessage[] = [...history, { role: "user", content: message }];

    try {
      const response = await sendChat(message, history);

      // Check if should start discovery
      if (response.should_start_discovery && response.task_description) {
        await handleStartDiscovery(response.task_description);
        return;
      }

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: response.message,
        suggestions: response.suggestions,
      };
      setMessages((prev) => [...prev, aiMsg]);
      setHistory([...newHistory, { role: "assistant", content: response.message }]);
    } catch (error) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: `Connection error: ${error}. Make sure the backend is running on http://localhost:8000`,
        suggestions: ["Try again"],
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-gray-100">
        <Link to="/" className="flex items-center gap-2 text-gray-500 hover:text-black transition">
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back</span>
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center">
            <Zap className="w-5 h-5 text-black" />
          </div>
          <span className="text-xl font-bold">AutoML</span>
        </div>
        <div className="w-20" />
      </header>

      {/* Chat Area */}
      <main className="flex-1 flex flex-col items-center px-8 py-8 overflow-auto">
        <div className="w-full max-w-2xl space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-yellow-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Zap className="w-8 h-8 text-black" />
              </div>
              <h1 className="text-4xl font-bold mb-2">What do you want to predict?</h1>
              <p className="text-gray-500">Describe your goal. We'll handle the rest.</p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "user" ? (
                <div className="bg-black text-white px-5 py-3 rounded-2xl rounded-br-md max-w-md">
                  {msg.content}
                </div>
              ) : (
                <div className="space-y-3 max-w-lg">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-black rounded-xl flex items-center justify-center shrink-0">
                      <Zap className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-gray-100 px-5 py-3 rounded-2xl rounded-bl-md">
                      {msg.content}
                    </div>
                  </div>
                  {msg.suggestions && idx === messages.length - 1 && !loading && (
                    <div className="flex flex-wrap gap-2 ml-12">
                      {msg.suggestions.map((s) => (
                        <button
                          key={s}
                          onClick={() => handleSend(s)}
                          className="px-4 py-2 bg-white border-2 border-gray-200 rounded-full text-sm font-medium hover:border-gray-400 transition"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-black rounded-xl flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div className="bg-gray-100 px-5 py-4 rounded-2xl rounded-bl-md">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input */}
      <div className="border-t border-gray-100 px-8 py-4">
        <div className="max-w-2xl mx-auto relative">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Describe what you want to predict..."
            disabled={loading}
            className="w-full px-6 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-gray-400 disabled:opacity-50"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-3 rounded-xl bg-black text-white disabled:bg-gray-200 disabled:text-gray-400 transition"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
