import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Zap, Send, ArrowRight, Sparkles, TrendingUp, Shield, MessageSquare } from "lucide-react";
import { sendChat } from "../api";

const quickActions = [
  { label: "Predict customer churn", icon: TrendingUp },
  { label: "Forecast sales", icon: Sparkles },
  { label: "Classify reviews", icon: MessageSquare },
  { label: "Detect fraud", icon: Shield },
];

const stats = [
  { value: "10x", label: "Faster than manual" },
  { value: "95%", label: "Accuracy rate" },
  { value: "Zero", label: "Code required" },
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
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'var(--color-bg)' }}>
      {/* Background Effects */}
      <div className="absolute inset-0 grid-pattern" />
      <div className="absolute inset-0 noise-overlay" />

      {/* Gradient orbs */}
      <div
        className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-30 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(250, 204, 21, 0.15) 0%, transparent 70%)' }}
      />
      <div
        className="absolute bottom-[-30%] right-[-10%] w-[800px] h-[800px] rounded-full opacity-20 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(250, 204, 21, 0.1) 0%, transparent 70%)' }}
      />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-5 animate-fade-in">
        <Link to="/" className="flex items-center gap-3 group">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-105 glow-accent"
            style={{ background: 'var(--color-accent)' }}
          >
            <Zap className="w-5 h-5" style={{ color: 'var(--color-bg)' }} />
          </div>
          <span className="text-xl font-semibold tracking-tight" style={{ color: 'var(--color-text)' }}>
            AutoML
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            to="/crawler"
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
            style={{ color: 'var(--color-text-muted)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--color-text)';
              e.currentTarget.style.background = 'var(--color-bg-elevated)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--color-text-muted)';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            Crawler
          </Link>
          <Link
            to="/training"
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
            style={{ color: 'var(--color-text-muted)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--color-text)';
              e.currentTarget.style.background = 'var(--color-bg-elevated)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--color-text-muted)';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            Training
          </Link>
          <div className="w-px h-5 mx-2" style={{ background: 'var(--color-border)' }} />
          <button
            className="px-4 py-2 rounded-lg text-sm font-medium btn-primary"
          >
            Get Started
          </button>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center px-8 pt-20 pb-16">
        {/* Badge */}
        <div
          className="animate-fade-in-up inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8"
          style={{
            background: 'var(--color-accent-muted)',
            border: '1px solid rgba(250, 204, 21, 0.2)'
          }}
        >
          <Sparkles className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--color-accent)' }}>
            AI-Powered Machine Learning
          </span>
        </div>

        {/* Headline */}
        <h1
          className="animate-fade-in-up animation-delay-100 text-5xl md:text-7xl font-bold text-center mb-6 tracking-tight"
          style={{ color: 'var(--color-text)', lineHeight: 1.1 }}
        >
          Build ML models
          <br />
          <span className="gradient-text">instantly.</span>
        </h1>

        {/* Subheadline */}
        <p
          className="animate-fade-in-up animation-delay-200 text-xl md:text-2xl text-center mb-12 max-w-2xl"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Describe what you want to predict. We handle the data, training, and deployment.
        </p>

        {/* Input Container */}
        <div
          className="animate-fade-in-up animation-delay-300 w-full max-w-2xl relative mb-8"
        >
          <div
            className={`relative rounded-2xl transition-all duration-300 ${focused ? 'glow-subtle' : ''}`}
            style={{
              background: 'var(--color-bg-elevated)',
              border: `1px solid ${focused ? 'var(--color-accent)' : 'var(--color-border)'}`,
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Describe what you want to predict..."
              disabled={loading}
              className="w-full px-6 py-5 text-lg bg-transparent outline-none disabled:opacity-50"
              style={{
                color: 'var(--color-text)',
                fontFamily: 'var(--font-sans)',
              }}
            />
            <button
              onClick={() => handleSubmit()}
              disabled={!input.trim() || loading}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-3 rounded-xl transition-all duration-200 disabled:opacity-30"
              style={{
                background: input.trim() ? 'var(--color-accent)' : 'var(--color-bg-subtle)',
                color: input.trim() ? 'var(--color-bg)' : 'var(--color-text-subtle)',
              }}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="animate-fade-in-up animation-delay-400 flex flex-wrap justify-center gap-3 mb-16">
          <span className="text-sm mr-2 self-center" style={{ color: 'var(--color-text-subtle)' }}>
            Try:
          </span>
          {quickActions.map((action, index) => (
            <button
              key={action.label}
              onClick={() => handleSubmit(action.label)}
              disabled={loading}
              className={`chip px-4 py-2.5 rounded-full text-sm font-medium flex items-center gap-2 disabled:opacity-50 animate-fade-in animation-delay-${(index + 5) * 100}`}
            >
              <action.icon className="w-4 h-4" />
              {action.label}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="animate-fade-in-up animation-delay-600 flex flex-wrap justify-center gap-12 md:gap-20">
          {stats.map((stat, index) => (
            <div key={stat.label} className={`text-center animate-fade-in animation-delay-${(index + 7) * 100}`}>
              <div
                className="text-3xl md:text-4xl font-bold mb-1"
                style={{ color: 'var(--color-accent)' }}
              >
                {stat.value}
              </div>
              <div
                className="text-sm"
                style={{ color: 'var(--color-text-subtle)' }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="animate-fade-in-up animation-delay-700 mt-20 flex flex-col items-center">
          <div
            className="glass rounded-2xl p-8 max-w-xl text-center"
          >
            <h3
              className="text-xl font-semibold mb-3"
              style={{ color: 'var(--color-text)' }}
            >
              Ready to automate your ML workflow?
            </h3>
            <p
              className="mb-6"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Start building production-ready models in minutes, not months.
            </p>
            <button
              onClick={() => document.querySelector('input')?.focus()}
              className="btn-primary px-6 py-3 rounded-xl font-medium inline-flex items-center gap-2"
            >
              Start Building
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>

      {/* Footer accent line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent, var(--color-accent), transparent)'
        }}
      />
    </div>
  );
}
