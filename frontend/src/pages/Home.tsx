import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Zap, Send, Sparkles } from "lucide-react";
import { sendChat } from "../api";

const quickActions = [
  "Predict churn",
  "Forecast sales",
  "Classify sentiment",
  "Detect anomalies",
];

export default function Home() {
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

  const handleSubmit = async (text?: string) => {
    const message = text || input;
    if (!message.trim() || loading) return;

    setLoading(true);
    try {
      const response = await sendChat(message, []);
      navigate("/chat", {
        state: {
          initialMessage: message,
          initialResponse: response
        }
      });
    } catch (error) {
      console.error("Chat error:", error);
      navigate("/chat", { state: { initialMessage: message } });
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-bg)' }}>
      {/* Subtle gradient backdrop */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(250, 204, 21, 0.08), transparent)'
        }}
      />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-12 py-6">
        <Link to="/" className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--color-accent)' }}
          >
            <Zap className="w-5 h-5" style={{ color: 'var(--color-bg)' }} />
          </div>
          <span className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
            AutoML
          </span>
        </Link>

        <nav className="flex items-center gap-8">
          <Link
            to="/crawler"
            className="text-sm transition-colors duration-200"
            style={{ color: 'var(--color-text-muted)' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-text)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
          >
            Crawler
          </Link>
          <Link
            to="/training"
            className="text-sm transition-colors duration-200"
            style={{ color: 'var(--color-text-muted)' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-text)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
          >
            Training
          </Link>
        </nav>
      </header>

      {/* Hero - centered vertically */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-12 pb-24">
        {/* Badge */}
        <div
          className="animate-fade-in inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-10"
          style={{
            background: 'rgba(250, 204, 21, 0.08)',
            border: '1px solid rgba(250, 204, 21, 0.15)'
          }}
        >
          <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--color-accent)' }} />
          <span className="text-xs font-medium tracking-wide" style={{ color: 'var(--color-accent)' }}>
            AI-POWERED
          </span>
        </div>

        {/* Headline */}
        <h1
          className="animate-fade-in-up animation-delay-100 text-6xl font-semibold text-center mb-5 tracking-tight"
          style={{ color: 'var(--color-text)', lineHeight: 1.15 }}
        >
          Build ML models,
          <br />
          <span className="gradient-text">instantly.</span>
        </h1>

        {/* Subheadline */}
        <p
          className="animate-fade-in-up animation-delay-200 text-lg text-center mb-16 max-w-md"
          style={{ color: 'var(--color-text-muted)', lineHeight: 1.6 }}
        >
          Describe what you want to predict and we'll handle the rest.
        </p>

        {/* Input */}
        <div className="animate-fade-in-up animation-delay-300 w-full max-w-xl mb-10">
          <div
            className="relative rounded-xl transition-all duration-200"
            style={{
              background: 'var(--color-bg-elevated)',
              border: `1px solid ${focused ? 'var(--color-border-hover)' : 'var(--color-border)'}`,
              boxShadow: focused ? '0 0 0 3px rgba(250, 204, 21, 0.08)' : 'none'
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="What do you want to predict?"
              disabled={loading}
              className="w-full px-5 py-4 bg-transparent outline-none disabled:opacity-50"
              style={{
                color: 'var(--color-text)',
                fontSize: '15px',
              }}
            />
            <button
              onClick={() => handleSubmit()}
              disabled={!input.trim() || loading}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2.5 rounded-lg transition-all duration-200 disabled:opacity-20"
              style={{
                background: input.trim() ? 'var(--color-accent)' : 'transparent',
                color: input.trim() ? 'var(--color-bg)' : 'var(--color-text-subtle)',
              }}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="animate-fade-in-up animation-delay-400 flex flex-wrap justify-center gap-2">
          {quickActions.map((action) => (
            <button
              key={action}
              onClick={() => handleSubmit(action)}
              disabled={loading}
              className="px-4 py-2 rounded-lg text-sm transition-all duration-200 disabled:opacity-50"
              style={{
                background: 'transparent',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-muted)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border-hover)';
                e.currentTarget.style.color = 'var(--color-text)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border)';
                e.currentTarget.style.color = 'var(--color-text-muted)';
              }}
            >
              {action}
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}