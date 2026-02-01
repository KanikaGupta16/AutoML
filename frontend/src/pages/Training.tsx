import { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "react-router-dom";
import { Zap, Play, Loader2, CheckCircle2, Download, AlertCircle } from "lucide-react";
import { startTraining, getTrainingStatus } from "../api";
import type { TrainingJob } from "../api";

export default function Training() {
  const location = useLocation();
  const [input, setInput] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<TrainingJob | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isTraining, setIsTraining] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const state = location.state as { task?: string; projectId?: string } | null;
    if (state?.task) {
      setInput(state.task);
    }
    if (state?.projectId) {
      setProjectId(state.projectId);
    }
    window.history.replaceState({}, document.title);
  }, [location.state]);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const startPolling = (jid: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      try {
        const status = await getTrainingStatus(jid);
        setJob(status);

        if (status.status === "pending") {
          setProgress(10);
        } else if (status.status === "running") {
          setProgress((prev) => Math.min(prev + 5, 90));
        } else if (status.status === "completed") {
          setProgress(100);
          setIsComplete(true);
          setIsTraining(false);
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        } else if (status.status === "failed") {
          setError(status.error || "Training failed");
          setIsTraining(false);
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 3000);
  };

  const handleStart = async () => {
    if (!input.trim()) {
      setError("Please enter a task description");
      return;
    }

    setError(null);
    setIsTraining(true);
    setIsComplete(false);
    setProgress(5);

    try {
      const result = await startTraining(input, projectId || undefined);
      setJobId(result.job_id);
      startPolling(result.job_id);
    } catch (err) {
      setError(`Failed to start: ${err}`);
      setIsTraining(false);
      setProgress(0);
    }
  };

  const handleDownload = () => {
    if (!job?.result?.training) return;
    const data = JSON.stringify(job.result, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = job.result.training.model_filename || "model.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <Link to="/" className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--color-accent)' }}>
            <Zap className="w-5 h-5" style={{ color: 'var(--color-bg)' }} />
          </div>
          <span className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>AutoML</span>
        </Link>
        <nav className="flex items-center gap-6">
          <Link to="/crawler" className="transition" style={{ color: 'var(--color-text-muted)' }}>Crawler</Link>
          <Link to="/training" className="font-medium" style={{ color: 'var(--color-text)' }}>Training</Link>
        </nav>
      </header>

      <main className="max-w-3xl mx-auto px-8 py-12">
        <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>Model Training</h1>
        <p className="mb-8" style={{ color: 'var(--color-text-muted)' }}>Train your ML model on GPU</p>

        {/* Input */}
        {!isTraining && !isComplete && (
          <div className="mb-8 space-y-4">
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleStart()}
                placeholder="Describe what you want to predict..."
                className="flex-1 px-5 py-3 rounded-xl focus:outline-none"
                style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
              />
              <button
                onClick={handleStart}
                className="px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition"
                style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
              >
                <Play className="w-5 h-5" />
                Start Training
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

        {/* Progress */}
        {(isTraining || isComplete) && (
          <div
            className="mb-8 p-6 rounded-xl"
            style={{
              background: isComplete ? 'rgba(34, 197, 94, 0.1)' : 'rgba(250, 204, 21, 0.1)',
              border: `1px solid ${isComplete ? 'rgba(34, 197, 94, 0.3)' : 'rgba(250, 204, 21, 0.3)'}`
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {isComplete ? (
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                ) : (
                  <Loader2 className="w-6 h-6 text-yellow-500 animate-spin" />
                )}
                <span className="font-medium" style={{ color: 'var(--color-text)' }}>
                  {isComplete ? "Training Complete!" : `Training: ${input}`}
                </span>
              </div>
              <span className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{progress}%</span>
            </div>
            <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: 'var(--color-bg-elevated)' }}>
              <div
                className={`h-full transition-all duration-500 ${isComplete ? "bg-green-500" : "bg-yellow-500"}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            {job?.result?.architecture && (
              <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span style={{ color: 'var(--color-text-muted)' }}>Architecture:</span>
                  <span className="ml-2 font-medium" style={{ color: 'var(--color-text)' }}>{job.result.architecture.name}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-muted)' }}>Epochs:</span>
                  <span className="ml-2 font-medium" style={{ color: 'var(--color-text)' }}>{job.result.architecture.epochs}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-muted)' }}>Learning Rate:</span>
                  <span className="ml-2 font-medium" style={{ color: 'var(--color-text)' }}>{job.result.architecture.learning_rate}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {isComplete && job?.result?.training && (
          <div className="space-y-6">
            <div className="grid grid-cols-4 gap-4">
              <div className="p-4 rounded-xl" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Accuracy</p>
                <p className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{job.result.training.accuracy.toFixed(1)}%</p>
              </div>
              <div className="p-4 rounded-xl" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Classes</p>
                <p className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{job.result.training.num_classes}</p>
              </div>
              <div className="p-4 rounded-xl" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Training Time</p>
                <p className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{job.result.training.training_time_s.toFixed(1)}s</p>
              </div>
              <div className="p-4 rounded-xl" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Model</p>
                <p className="text-lg font-bold truncate" style={{ color: 'var(--color-text)' }}>{job.result.training.model_filename}</p>
              </div>
            </div>

            {/* Benchmark Results */}
            {job.result.benchmark && (
              <div className="p-6 rounded-xl" style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                <h3 className="font-bold text-lg mb-4" style={{ color: 'var(--color-text)' }}>Benchmark: Your Model vs Cloud API</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div className="p-3 rounded-lg" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Your Model</p>
                    <p className="text-xl font-bold text-green-500">{job.result.benchmark.local_accuracy.toFixed(1)}%</p>
                  </div>
                  <div className="p-3 rounded-lg" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Cloud API</p>
                    <p className="text-xl font-bold text-blue-500">{job.result.benchmark.api_accuracy.toFixed(1)}%</p>
                  </div>
                  <div className="p-3 rounded-lg" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Speed</p>
                    <p className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>{job.result.benchmark.speedup.toFixed(0)}x faster</p>
                  </div>
                  <div className="p-3 rounded-lg" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Cost Savings (1M images)</p>
                    <p className="text-xl font-bold text-green-500">${job.result.benchmark.cost_savings_1m.toFixed(0)}</p>
                  </div>
                </div>
              </div>
            )}

            {job.result.training.class_names && (
              <div className="p-4 rounded-xl" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
                <p className="text-sm mb-2" style={{ color: 'var(--color-text-muted)' }}>Classes</p>
                <div className="flex flex-wrap gap-2">
                  {job.result.training.class_names.map((name) => (
                    <span key={name} className="px-3 py-1 rounded-full text-sm" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={handleDownload}
                className="flex-1 px-6 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition"
                style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
              >
                <Download className="w-5 h-5" />
                Download Model
              </button>
              <button
                onClick={() => {
                  setIsComplete(false);
                  setIsTraining(false);
                  setJob(null);
                  setProgress(0);
                }}
                className="px-6 py-3 rounded-xl font-medium transition"
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
              >
                Train Another
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
