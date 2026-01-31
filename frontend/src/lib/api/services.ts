// API Services - uses demo data when useRealApi is false

import { API_CONFIG, getApiUrl } from "./config";
import {
  DEMO_DATA_SOURCES,
  DEMO_TRAINING_HISTORY,
  DEMO_TRAINING_CONFIG,
  DEMO_FEATURE_IMPORTANCE,
  DEMO_CONFUSION_MATRIX,
  DEMO_PIPELINE_LOGS,
  DEMO_CRAWLED_DATA,
  DEMO_KAGGLE_DATASETS,
  generateDemoResponse,
  type DataSource,
  type TrainingMetrics,
  type TrainingConfig,
  type PipelineLog,
} from "./demo-data";

// Simulate network delay for demo mode
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ============== AI Interview / Questions ==============

export async function generateQuestions(context: string) {
  if (!API_CONFIG.useRealApi) {
    await delay(800);
    return generateDemoResponse(context);
  }
  
  const response = await fetch(getApiUrl("generateQuestions"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ context }),
  });
  return response.json();
}

export async function submitAnswer(questionId: string, answer: string) {
  if (!API_CONFIG.useRealApi) {
    await delay(600);
    return generateDemoResponse(answer);
  }
  
  const response = await fetch(getApiUrl("submitAnswer"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ questionId, answer }),
  });
  return response.json();
}

// ============== Data Sources / Firecrawl ==============

export async function getDataSources(): Promise<DataSource[]> {
  if (!API_CONFIG.useRealApi) {
    await delay(500);
    return DEMO_DATA_SOURCES;
  }
  
  const response = await fetch(getApiUrl("getSources"));
  return response.json();
}

export async function searchSources(query: string): Promise<DataSource[]> {
  if (!API_CONFIG.useRealApi) {
    await delay(1200);
    // Filter demo sources based on query
    const filtered = DEMO_DATA_SOURCES.filter(
      s => s.name.toLowerCase().includes(query.toLowerCase()) ||
           s.url.toLowerCase().includes(query.toLowerCase())
    );
    return filtered.length > 0 ? filtered : DEMO_DATA_SOURCES.slice(0, 3);
  }
  
  const response = await fetch(getApiUrl("searchSources"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  return response.json();
}

export async function crawlSource(sourceId: string) {
  if (!API_CONFIG.useRealApi) {
    await delay(2000);
    return {
      success: true,
      recordCount: Math.floor(Math.random() * 5000) + 500,
      data: DEMO_CRAWLED_DATA,
    };
  }
  
  const response = await fetch(getApiUrl("crawlSource"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sourceId }),
  });
  return response.json();
}

// ============== Training Pipeline ==============

export async function getTrainingStatus() {
  if (!API_CONFIG.useRealApi) {
    await delay(300);
    return {
      isRunning: true,
      currentEpoch: 23,
      totalEpochs: DEMO_TRAINING_CONFIG.epochs,
      progress: 46,
      config: DEMO_TRAINING_CONFIG,
    };
  }
  
  const response = await fetch(getApiUrl("getTrainingStatus"));
  return response.json();
}

export async function getTrainingMetrics(): Promise<TrainingMetrics[]> {
  if (!API_CONFIG.useRealApi) {
    await delay(400);
    return DEMO_TRAINING_HISTORY;
  }
  
  const response = await fetch(getApiUrl("getTrainingMetrics"));
  return response.json();
}

export async function getTrainingConfig(): Promise<TrainingConfig> {
  if (!API_CONFIG.useRealApi) {
    await delay(200);
    return DEMO_TRAINING_CONFIG;
  }
  
  const response = await fetch(getApiUrl("getTrainingStatus"));
  const data = await response.json();
  return data.config;
}

export async function startTraining(config: Partial<TrainingConfig>) {
  if (!API_CONFIG.useRealApi) {
    await delay(1000);
    return { success: true, trainingId: "demo-training-1" };
  }
  
  const response = await fetch(getApiUrl("startTraining"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  return response.json();
}

export async function stopTraining(trainingId: string) {
  if (!API_CONFIG.useRealApi) {
    await delay(500);
    return { success: true };
  }
  
  const response = await fetch(getApiUrl("stopTraining"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trainingId }),
  });
  return response.json();
}

// ============== Model Insights ==============

export async function getFeatureImportance() {
  if (!API_CONFIG.useRealApi) {
    await delay(400);
    return DEMO_FEATURE_IMPORTANCE;
  }
  
  const response = await fetch(getApiUrl("getTrainingMetrics"));
  const data = await response.json();
  return data.featureImportance;
}

export async function getConfusionMatrix() {
  if (!API_CONFIG.useRealApi) {
    await delay(400);
    return DEMO_CONFUSION_MATRIX;
  }
  
  const response = await fetch(getApiUrl("getTrainingMetrics"));
  const data = await response.json();
  return data.confusionMatrix;
}

// ============== Pipeline Logs ==============

export async function getPipelineLogs(): Promise<PipelineLog[]> {
  if (!API_CONFIG.useRealApi) {
    await delay(300);
    return DEMO_PIPELINE_LOGS;
  }
  
  // Real implementation would use WebSocket or SSE for real-time logs
  const response = await fetch(getApiUrl("getTrainingStatus"));
  const data = await response.json();
  return data.logs;
}

// ============== MongoDB / Vector Search ==============

export async function vectorSearch(query: string, topK: number = 10) {
  if (!API_CONFIG.useRealApi) {
    await delay(800);
    return {
      results: DEMO_CRAWLED_DATA.slice(0, topK),
      totalMatches: 2847,
      queryEmbedding: "[float32 array]",
    };
  }
  
  const response = await fetch(getApiUrl("vectorSearch"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, topK }),
  });
  return response.json();
}

// ============== Kaggle ==============

export async function searchKaggle(query: string) {
  if (!API_CONFIG.useRealApi) {
    await delay(1000);
    return {
      datasets: DEMO_KAGGLE_DATASETS,
      totalResults: 3,
    };
  }
  
  const response = await fetch(getApiUrl("searchKaggle"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  return response.json();
}

export async function downloadKaggleDataset(datasetId: string) {
  if (!API_CONFIG.useRealApi) {
    await delay(3000);
    return {
      success: true,
      filePath: `/data/kaggle/${datasetId}`,
      size: "1.2 GB",
      recordCount: 50000,
    };
  }
  
  const response = await fetch(getApiUrl("downloadDataset"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ datasetId }),
  });
  return response.json();
}
