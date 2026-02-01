// API service - connects to Python backend

const API_BASE = "http://localhost:8000";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  message: string;
  suggestions: string[];
  should_start_discovery: boolean;
  task_description: string;
}

export interface HighQualitySource {
  url: string;
  relevance_score?: number;
  source_type?: string;
  features_found: string[];
  quality_rating?: number;
  credibility_tier?: string;
}

export interface DiscoveryProject {
  project_id: string;
  stats: {
    total_sources: number;
    pending_validation: number;
    validated: number;
    rejected: number;
    crawling: number;
    rate_limited: number;
    failed: number;
    selected: number;
    backup: number;
  };
  selected_source?: HighQualitySource;
  backup_sources: HighQualitySource[];
  high_quality_sources: HighQualitySource[];
}

export interface TrainingJob {
  job_id: string;
  status: "pending" | "running" | "completed" | "failed";
  task: string;
  started_at: string;
  completed_at?: string;
  result?: {
    success: boolean;
    dataset?: { ref: string; title: string };
    architecture?: { name: string; epochs: number; learning_rate: number };
    training?: {
      model_filename: string;
      accuracy: number;
      class_names: string[];
      num_classes: number;
      training_time_s: number;
    };
    benchmark?: {
      local_accuracy: number;
      api_accuracy: number;
      speedup: number;
      cost_savings_1m: number;
    };
  };
  error?: string;
}

// Chat with AI
export async function sendChat(message: string, history: ChatMessage[] = []): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/chat/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history }),
  });
  if (!res.ok) throw new Error(`Chat failed: ${res.statusText}`);
  return res.json();
}

// Start discovery pipeline
export async function startDiscovery(prompt: string): Promise<{ project_id: string }> {
  const res = await fetch(`${API_BASE}/discovery/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) throw new Error(`Discovery failed: ${res.statusText}`);
  return res.json();
}

// Get discovery status
export async function getDiscoveryStatus(projectId: string): Promise<DiscoveryProject> {
  const res = await fetch(`${API_BASE}/discovery/${projectId}/status`);
  if (!res.ok) throw new Error(`Status failed: ${res.statusText}`);
  return res.json();
}

// Start training
export async function startTraining(task: string, projectId?: string): Promise<{ job_id: string }> {
  const res = await fetch(`${API_BASE}/training/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      task,
      priority: "balanced",
      skip_benchmark: false,
      project_id: projectId,  // Pass discovery project ID to use pre-selected dataset
    }),
  });
  if (!res.ok) throw new Error(`Training failed: ${res.statusText}`);
  return res.json();
}

// Get training status
export async function getTrainingStatus(jobId: string): Promise<TrainingJob> {
  const res = await fetch(`${API_BASE}/training/${jobId}`);
  if (!res.ok) throw new Error(`Status failed: ${res.statusText}`);
  return res.json();
}

// Health check
export async function checkHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}
