import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, Database, Brain, CheckCircle2, Circle, 
  ArrowRight, Zap, Play, Loader2, ExternalLink,
  FileText, Globe, Server
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface PipelineStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: "pending" | "running" | "completed" | "error";
  details?: string[];
  results?: { label: string; value: string }[];
}

interface LogEntry {
  id: string;
  timestamp: string;
  source: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
}

const initialSteps: PipelineStep[] = [
  {
    id: "search",
    title: "Web Search",
    description: "Finding relevant data sources",
    icon: <Search className="w-5 h-5" />,
    status: "pending",
  },
  {
    id: "crawl",
    title: "Data Crawling",
    description: "Extracting content from sources",
    icon: <Globe className="w-5 h-5" />,
    status: "pending",
  },
  {
    id: "process",
    title: "Processing",
    description: "Cleaning and structuring data",
    icon: <FileText className="w-5 h-5" />,
    status: "pending",
  },
  {
    id: "vectorize",
    title: "Vector Storage",
    description: "Creating embeddings for search",
    icon: <Database className="w-5 h-5" />,
    status: "pending",
  },
  {
    id: "ready",
    title: "Ready to Train",
    description: "Data prepared for model training",
    icon: <Brain className="w-5 h-5" />,
    status: "pending",
  },
];

const demoLogs: LogEntry[] = [
  { id: "1", timestamp: "00:01", source: "Firecrawl", message: "Searching for 'customer churn prediction datasets'...", type: "info" },
  { id: "2", timestamp: "00:03", source: "Firecrawl", message: "Found 12 potential data sources", type: "success" },
  { id: "3", timestamp: "00:05", source: "Firecrawl", message: "Crawling kaggle.com/datasets/churn-modelling...", type: "info" },
  { id: "4", timestamp: "00:08", source: "Firecrawl", message: "Extracted 10,000 customer records", type: "success" },
  { id: "5", timestamp: "00:10", source: "Firecrawl", message: "Crawling github.com/datasets/telecom-churn...", type: "info" },
  { id: "6", timestamp: "00:14", source: "Firecrawl", message: "Extracted 7,043 records with 21 features", type: "success" },
  { id: "7", timestamp: "00:16", source: "Processing", message: "Merging datasets...", type: "info" },
  { id: "8", timestamp: "00:18", source: "Processing", message: "Handling missing values (2.3% of data)", type: "warning" },
  { id: "9", timestamp: "00:20", source: "Processing", message: "Data cleaned: 14,203 records ready", type: "success" },
  { id: "10", timestamp: "00:22", source: "MongoDB", message: "Connecting to vector database...", type: "info" },
  { id: "11", timestamp: "00:24", source: "MongoDB", message: "Generating embeddings for 14,203 records", type: "info" },
  { id: "12", timestamp: "00:28", source: "MongoDB", message: "Vector search index created successfully", type: "success" },
  { id: "13", timestamp: "00:30", source: "Pipeline", message: "All data sources processed and ready for training", type: "success" },
];

export default function LiveCrawler() {
  const navigate = useNavigate();
  const [steps, setSteps] = useState<PipelineStep[]>(initialSteps);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [currentLogIndex, setCurrentLogIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);

  const startPipeline = () => {
    setIsRunning(true);
    setLogs([]);
    setCurrentLogIndex(0);
    setSteps(initialSteps.map(s => ({ ...s, status: "pending" })));
    setIsComplete(false);
    setOverallProgress(0);
  };

  // Simulate pipeline progress
  useEffect(() => {
    if (!isRunning) return;

    const logInterval = setInterval(() => {
      setCurrentLogIndex(prev => {
        if (prev >= demoLogs.length) {
          clearInterval(logInterval);
          setIsRunning(false);
          setIsComplete(true);
          return prev;
        }
        setLogs(logs => [...logs, demoLogs[prev]]);
        return prev + 1;
      });
    }, 800);

    return () => clearInterval(logInterval);
  }, [isRunning]);

  // Update step statuses based on log progress
  useEffect(() => {
    const progress = (currentLogIndex / demoLogs.length) * 100;
    setOverallProgress(progress);

    if (currentLogIndex >= 2) {
      setSteps(s => s.map(step => 
        step.id === "search" ? { 
          ...step, 
          status: "completed",
          results: [
            { label: "Sources Found", value: "12" },
            { label: "Relevance Score", value: "94%" },
          ]
        } : step
      ));
    }
    if (currentLogIndex >= 6) {
      setSteps(s => s.map(step => 
        step.id === "crawl" ? { 
          ...step, 
          status: "completed",
          results: [
            { label: "Records Extracted", value: "17,043" },
            { label: "Sources Crawled", value: "2" },
          ]
        } : step
      ));
    }
    if (currentLogIndex >= 9) {
      setSteps(s => s.map(step => 
        step.id === "process" ? { 
          ...step, 
          status: "completed",
          results: [
            { label: "Clean Records", value: "14,203" },
            { label: "Features", value: "21" },
          ]
        } : step
      ));
    }
    if (currentLogIndex >= 12) {
      setSteps(s => s.map(step => 
        step.id === "vectorize" ? { 
          ...step, 
          status: "completed",
          results: [
            { label: "Embeddings", value: "14,203" },
            { label: "Index Size", value: "48 MB" },
          ]
        } : step
      ));
    }
    if (currentLogIndex >= 13) {
      setSteps(s => s.map(step => 
        step.id === "ready" ? { ...step, status: "completed" } : step
      ));
    }

    // Set running status
    if (currentLogIndex < 2) {
      setSteps(s => s.map(step => step.id === "search" ? { ...step, status: "running" } : step));
    } else if (currentLogIndex < 6) {
      setSteps(s => s.map(step => step.id === "crawl" ? { ...step, status: "running" } : step));
    } else if (currentLogIndex < 9) {
      setSteps(s => s.map(step => step.id === "process" ? { ...step, status: "running" } : step));
    } else if (currentLogIndex < 12) {
      setSteps(s => s.map(step => step.id === "vectorize" ? { ...step, status: "running" } : step));
    } else if (currentLogIndex < 13) {
      setSteps(s => s.map(step => step.id === "ready" ? { ...step, status: "running" } : step));
    }
  }, [currentLogIndex]);

  const getStatusIcon = (status: PipelineStep["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-6 h-6 text-primary" />;
      case "running":
        return <Loader2 className="w-6 h-6 text-primary animate-spin" />;
      case "error":
        return <Circle className="w-6 h-6 text-destructive" />;
      default:
        return <Circle className="w-6 h-6 text-muted-foreground/40" />;
    }
  };

  const getLogColor = (type: LogEntry["type"]) => {
    switch (type) {
      case "success": return "text-green-500";
      case "warning": return "text-yellow-500";
      case "error": return "text-red-500";
      default: return "text-muted-foreground";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="h-16 border-b-2 border-border bg-background flex items-center justify-between px-6 sticky top-0 z-50">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-black tracking-tight">AutoML</span>
        </Link>

        <div className="flex items-center gap-4">
          {isComplete && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <Button onClick={() => navigate("/training")} size="lg" className="gap-2">
                Start Training
                <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          )}
        </div>
      </header>

      <div className="flex">
        {/* Main Content - Flowchart */}
        <main className="flex-1 p-8 max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Data Pipeline</h1>
            <p className="text-muted-foreground">
              Searching, crawling, and preparing your training data
            </p>
          </div>

          {/* Start Button */}
          {!isRunning && !isComplete && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <Button onClick={startPipeline} size="lg" className="gap-2">
                <Play className="w-5 h-5" />
                Start Data Search
              </Button>
            </motion.div>
          )}

          {/* Pipeline Flowchart */}
          <div className="space-y-0">
            {steps.map((step, index) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div className="absolute left-7 top-16 w-0.5 h-8 bg-border" />
                )}

                <div className={`flex gap-4 p-4 rounded-xl transition-all ${
                  step.status === "running" ? "bg-primary/5 border-2 border-primary/20" :
                  step.status === "completed" ? "bg-muted/50" : ""
                }`}>
                  {/* Status Icon */}
                  <div className="flex-shrink-0 mt-1">
                    {getStatusIcon(step.status)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <div className={`p-2 rounded-lg ${
                        step.status === "completed" ? "bg-primary/10" :
                        step.status === "running" ? "bg-primary/10" : "bg-muted"
                      }`}>
                        {step.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold">{step.title}</h3>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                      </div>
                      {step.status === "running" && (
                        <Badge variant="secondary" className="ml-auto">
                          Running...
                        </Badge>
                      )}
                      {step.status === "completed" && (
                        <Badge className="ml-auto bg-primary/10 text-primary border-0">
                          Complete
                        </Badge>
                      )}
                    </div>

                    {/* Results */}
                    <AnimatePresence>
                      {step.results && step.status === "completed" && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3 ml-12 flex gap-6"
                        >
                          {step.results.map((result, i) => (
                            <div key={i} className="text-sm">
                              <span className="text-muted-foreground">{result.label}: </span>
                              <span className="font-semibold">{result.value}</span>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Completion Card */}
          <AnimatePresence>
            {isComplete && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8"
              >
                <Card className="p-6 border-primary/20 bg-primary/5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">Data Ready!</h3>
                      <p className="text-muted-foreground">
                        14,203 records prepared with 21 features. Ready to train your model.
                      </p>
                    </div>
                    <Button onClick={() => navigate("/training")} size="lg" className="gap-2">
                      Continue to Training
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Right Sidebar - Live Progress */}
        <aside className="w-96 border-l border-border bg-muted/30 p-6 sticky top-16 h-[calc(100vh-4rem)] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Live Progress</h2>
            {isRunning && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Running
              </div>
            )}
          </div>

          {/* Overall Progress */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Overall</span>
              <span className="font-medium">{Math.round(overallProgress)}%</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
          </div>

          {/* Log Stream */}
          <div className="flex-1 overflow-y-auto space-y-2 font-mono text-xs">
            <AnimatePresence>
              {logs.map((log) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-2 rounded bg-background/50 border border-border/50"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-muted-foreground">{log.timestamp}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {log.source}
                    </Badge>
                  </div>
                  <p className={getLogColor(log.type)}>{log.message}</p>
                </motion.div>
              ))}
            </AnimatePresence>

            {logs.length === 0 && !isRunning && (
              <div className="text-center text-muted-foreground py-8">
                <Server className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Click "Start Data Search" to begin</p>
              </div>
            )}
          </div>

          {/* Quick Stats */}
          {logs.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-lg bg-background/50">
                <p className="text-muted-foreground text-xs">Sources</p>
                <p className="font-semibold">12 found</p>
              </div>
              <div className="p-3 rounded-lg bg-background/50">
                <p className="text-muted-foreground text-xs">Records</p>
                <p className="font-semibold">14,203</p>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
