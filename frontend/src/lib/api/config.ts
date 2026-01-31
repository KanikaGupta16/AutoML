// API Configuration - swap these when connecting to real backend
export const API_CONFIG = {
  // Set to your backend URL when ready (e.g., "http://localhost:3001" or "https://api.yourapp.com")
  baseUrl: "",
  
  // Enable this when your backend is ready
  useRealApi: false,
  
  endpoints: {
    // AI Interview / Question Flow
    generateQuestions: "/api/questions/generate",
    submitAnswer: "/api/questions/answer",
    getConversation: "/api/conversation",
    
    // Data Sources / Firecrawl
    searchSources: "/api/sources/search",
    crawlSource: "/api/sources/crawl",
    getSources: "/api/sources",
    
    // Training Pipeline
    startTraining: "/api/training/start",
    getTrainingStatus: "/api/training/status",
    getTrainingMetrics: "/api/training/metrics",
    stopTraining: "/api/training/stop",
    
    // MongoDB / Vector Search
    vectorSearch: "/api/vectors/search",
    getDatasets: "/api/datasets",
    
    // Kaggle
    searchKaggle: "/api/kaggle/search",
    downloadDataset: "/api/kaggle/download",
  },
};

export function getApiUrl(endpoint: keyof typeof API_CONFIG.endpoints): string {
  return `${API_CONFIG.baseUrl}${API_CONFIG.endpoints[endpoint]}`;
}
