import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Zap, Search, Database, Brain, CheckCircle2, Loader2, ArrowRight, Play, AlertCircle } from "lucide-react";
import { startDiscovery, getDiscoveryStatus } from "../api";
import type { DiscoveryProject } from "../api";

interface Step {
  id: string;
  title: string;
  status: "pending" | "running" | "completed" | "error";
  detail?: string;
}

const initialSteps: Step[] = [
  { id: "search", title: "Searching for data sources", status: "pending" },
  { id: "crawl", title: "Crawling and validating", status: "pending" },
  { id: "process", title: "Processing content", status: "pending" },
  { id: "ready", title: "Data ready for training", status: "pending" },
];

export default function Crawler() {
  const navigate = useNavigate();
  const location = useLocation();
  const [steps, setSteps] = useState<Step[]>(initialSteps);
  const [input, setInput] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [data, setData] = useState<DiscoveryProject | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Handle incoming state from chat
  useEffect(() => {
    const state = location.state as { projectId?: string; task?: string } | null;
    if (state?.projectId) {
      setProjectId(state.projectId);
      setIsRunning(true);
      setSteps((s) => s.map((step) => (step.id === "search" ? { ...step, status: "running" } : step)));
      startPolling(state.projectId);
    }
    if (state?.task) {
      setInput(state.task);
    }
    window.history.replaceState({}, document.title);
  }, [location.state]);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const startPolling = (pid: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      try {
        const status = await getDiscoveryStatus(pid);
        setData(status);
        updateStepsFromStatus(status);
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 2000);
  };

  const updateStepsFromStatus = (status: DiscoveryProject) => {
    const { total_sources, validated, crawling, pending_validation, rejected, rate_limited, selected, backup } = status.stats;

    // Count all "good" sources (validated + selected + backup)
    const goodSources = validated + selected + backup;

    const newSteps = [...initialSteps];

    // Search completed when we have sources
    if (total_sources > 0) {
      newSteps[0] = { ...newSteps[0], status: "completed", detail: `${total_sources} sources found` };
    }

    // Crawling in progress or done
    if (crawling > 0 || goodSources > 0) {
      newSteps[1] = {
        ...newSteps[1],
        status: crawling > 0 ? "running" : "completed",
        detail: `${goodSources} validated, ${crawling} crawling`,
      };
    }

    // Processing done - we have a selected source
    if (selected > 0 || (goodSources > 0 && pending_validation === 0 && crawling === 0)) {
      const highQuality = status.high_quality_sources?.length || 0;
      newSteps[2] = { ...newSteps[2], status: "completed", detail: `${highQuality} high quality, ${rejected} rejected` };
    }

    // All done - we have a selected source and no more crawling
    if (selected > 0 && crawling === 0) {
      newSteps[3] = { ...newSteps[3], status: "completed", detail: status.selected_source ? `Selected: ${new URL(status.selected_source.url).hostname}` : undefined };
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      setIsRunning(false);
      setIsComplete(true);
    }

    setSteps(newSteps);
  };

  const handleStart = async () => {
    if (!input.trim()) {
      setError("Please enter a search query");
      return;
    }

    setError(null);
    setIsRunning(true);
    setIsComplete(false);
    setSteps(initialSteps.map((s) => ({ ...s, status: s.id === "search" ? "running" : "pending" })));

    try {
      const result = await startDiscovery(input);
      setProjectId(result.project_id);
      startPolling(result.project_id);
    } catch (err) {
      setError(`Failed to start: ${err}`);
      setIsRunning(false);
      setSteps(initialSteps);
    }
  };

  const getIcon = (status: Step["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-6 h-6 text-green-500" />;
      case "running":
        return <Loader2 className="w-6 h-6 text-yellow-500 animate-spin" />;
      case "error":
        return <AlertCircle className="w-6 h-6 text-red-500" />;
      default:
        return <div className="w-6 h-6 rounded-full border-2 border-gray-300" />;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-gray-100">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center">
            <Zap className="w-5 h-5 text-black" />
          </div>
          <span className="text-xl font-bold">AutoML</span>
        </Link>
        <nav className="flex items-center gap-6">
          <Link to="/crawler" className="text-black font-medium">Crawler</Link>
          <Link to="/training" className="text-gray-600 hover:text-black transition">Training</Link>
        </nav>
      </header>

      <main className="max-w-3xl mx-auto px-8 py-12">
        <h1 className="text-3xl font-bold mb-2">Data Pipeline</h1>
        <p className="text-gray-500 mb-8">Search, crawl, and prepare your training data</p>

        {/* Input */}
        {!isRunning && !isComplete && (
          <div className="mb-8 space-y-4">
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleStart()}
                placeholder="Describe what data you need..."
                className="flex-1 px-5 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-gray-400"
              />
              <button
                onClick={handleStart}
                className="px-6 py-3 bg-black text-white rounded-xl font-medium flex items-center gap-2 hover:bg-gray-800 transition"
              >
                <Play className="w-5 h-5" />
                Start
              </button>
            </div>
            {error && (
              <div className="flex items-center gap-2 text-red-500 text-sm">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
          </div>
        )}

        {/* Pipeline Steps */}
        <div className="space-y-4">
          {steps.map((step, idx) => (
            <div
              key={step.id}
              className={`flex items-center gap-4 p-4 rounded-xl border-2 ${
                step.status === "completed"
                  ? "border-green-200 bg-green-50"
                  : step.status === "running"
                  ? "border-yellow-200 bg-yellow-50"
                  : "border-gray-100 bg-gray-50"
              }`}
            >
              {getIcon(step.status)}
              <div className="flex-1">
                <p className="font-medium">{step.title}</p>
                {step.detail && <p className="text-sm text-gray-500">{step.detail}</p>}
              </div>
            </div>
          ))}
        </div>

        {/* Stats */}
        {data && (
          <div className="mt-8 grid grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-500">Sources</p>
              <p className="text-2xl font-bold">{data.stats.total_sources}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-500">Validated</p>
              <p className="text-2xl font-bold">{data.stats.validated}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-500">High Quality</p>
              <p className="text-2xl font-bold">{data.high_quality_sources?.length || 0}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-500">Rejected</p>
              <p className="text-2xl font-bold">{data.stats.rejected}</p>
            </div>
          </div>
        )}

        {/* Complete */}
        {isComplete && (
          <div className="mt-8 p-6 bg-green-50 border-2 border-green-200 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold">Data Ready!</h3>
                  <p className="text-gray-600">
                    {data?.stats.validated} sources validated. Ready to train your model.
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate("/training", { state: { task: input, projectId } })}
                className="px-6 py-3 bg-black text-white rounded-xl font-medium flex items-center gap-2 hover:bg-gray-800 transition"
              >
                Continue to Training
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
