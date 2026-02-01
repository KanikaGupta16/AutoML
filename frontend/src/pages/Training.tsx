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
          <Link to="/crawler" className="text-gray-600 hover:text-black transition">Crawler</Link>
          <Link to="/training" className="text-black font-medium">Training</Link>
        </nav>
      </header>

      <main className="max-w-3xl mx-auto px-8 py-12">
        <h1 className="text-3xl font-bold mb-2">Model Training</h1>
        <p className="text-gray-500 mb-8">Train your ML model on GPU</p>

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
                className="flex-1 px-5 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-gray-400"
              />
              <button
                onClick={handleStart}
                className="px-6 py-3 bg-black text-white rounded-xl font-medium flex items-center gap-2 hover:bg-gray-800 transition"
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
          <div className={`mb-8 p-6 rounded-xl border-2 ${isComplete ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {isComplete ? (
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                ) : (
                  <Loader2 className="w-6 h-6 text-yellow-500 animate-spin" />
                )}
                <span className="font-medium">
                  {isComplete ? "Training Complete!" : `Training: ${input}`}
                </span>
              </div>
              <span className="text-2xl font-bold">{progress}%</span>
            </div>
            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${isComplete ? "bg-green-500" : "bg-yellow-500"}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            {job?.result?.architecture && (
              <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Architecture:</span>
                  <span className="ml-2 font-medium">{job.result.architecture.name}</span>
                </div>
                <div>
                  <span className="text-gray-500">Epochs:</span>
                  <span className="ml-2 font-medium">{job.result.architecture.epochs}</span>
                </div>
                <div>
                  <span className="text-gray-500">Learning Rate:</span>
                  <span className="ml-2 font-medium">{job.result.architecture.learning_rate}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {isComplete && job?.result?.training && (
          <div className="space-y-6">
            <div className="grid grid-cols-4 gap-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-500">Accuracy</p>
                <p className="text-2xl font-bold">{job.result.training.accuracy.toFixed(1)}%</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-500">Classes</p>
                <p className="text-2xl font-bold">{job.result.training.num_classes}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-500">Training Time</p>
                <p className="text-2xl font-bold">{job.result.training.training_time_s.toFixed(1)}s</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-500">Model</p>
                <p className="text-lg font-bold truncate">{job.result.training.model_filename}</p>
              </div>
            </div>

            {/* Benchmark Results */}
            {job.result.benchmark && (
              <div className="p-6 bg-blue-50 border-2 border-blue-200 rounded-xl">
                <h3 className="font-bold text-lg mb-4">Benchmark: Your Model vs Cloud API</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div className="p-3 bg-white rounded-lg">
                    <p className="text-sm text-gray-500">Your Model</p>
                    <p className="text-xl font-bold text-green-600">{job.result.benchmark.local_accuracy.toFixed(1)}%</p>
                  </div>
                  <div className="p-3 bg-white rounded-lg">
                    <p className="text-sm text-gray-500">Cloud API</p>
                    <p className="text-xl font-bold text-blue-600">{job.result.benchmark.api_accuracy.toFixed(1)}%</p>
                  </div>
                  <div className="p-3 bg-white rounded-lg">
                    <p className="text-sm text-gray-500">Speed</p>
                    <p className="text-xl font-bold">{job.result.benchmark.speedup.toFixed(0)}x faster</p>
                  </div>
                  <div className="p-3 bg-white rounded-lg">
                    <p className="text-sm text-gray-500">Cost Savings (1M images)</p>
                    <p className="text-xl font-bold text-green-600">${job.result.benchmark.cost_savings_1m.toFixed(0)}</p>
                  </div>
                </div>
              </div>
            )}

            {job.result.training.class_names && (
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-500 mb-2">Classes</p>
                <div className="flex flex-wrap gap-2">
                  {job.result.training.class_names.map((name) => (
                    <span key={name} className="px-3 py-1 bg-white border border-gray-200 rounded-full text-sm">
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={handleDownload}
                className="flex-1 px-6 py-3 bg-black text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-gray-800 transition"
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
                className="px-6 py-3 border-2 border-gray-200 rounded-xl font-medium hover:border-gray-400 transition"
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
