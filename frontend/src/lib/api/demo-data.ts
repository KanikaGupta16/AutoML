// Demo fallback data - replace with real API calls when backend is ready

export interface AIQuestion {
  id: string;
  question: string;
  suggestions: string[];
  context?: string;
}

export interface DataSource {
  id: string;
  name: string;
  url: string;
  type: "web" | "api" | "database" | "file" | "kaggle";
  status: "pending" | "crawling" | "completed" | "error";
  recordCount?: number;
  lastUpdated?: string;
  metadata?: Record<string, unknown>;
}

export interface TrainingMetrics {
  epoch: number;
  loss: number;
  accuracy: number;
  valLoss: number;
  valAccuracy: number;
  timestamp: string;
}

export interface TrainingConfig {
  modelType: string;
  learningRate: number;
  batchSize: number;
  maxDepth: number;
  estimators: number;
  epochs: number;
}

export interface PipelineLog {
  id: string;
  timestamp: string;
  level: "info" | "success" | "warning" | "error" | "debug";
  source: string;
  message: string;
  details?: string;
}

// Demo Questions Flow
export const DEMO_QUESTIONS: Record<string, AIQuestion> = {
  initial: {
    id: "q1",
    question: "What would you like to predict?",
    suggestions: ["Customer churn", "Sales forecast", "Sentiment analysis", "Fraud detection"],
  },
  churn: {
    id: "q2",
    question: "What data do you have about your customers?",
    suggestions: ["CRM database", "Usage logs", "Support tickets", "I'll describe it"],
  },
  sales: {
    id: "q3",
    question: "What time horizon are you forecasting?",
    suggestions: ["7 days", "30 days", "90 days", "Custom range"],
  },
  sentiment: {
    id: "q4",
    question: "What type of text are you analyzing?",
    suggestions: ["Product reviews", "Social media", "Support tickets", "Survey responses"],
  },
  fraud: {
    id: "q5",
    question: "What transactions are you monitoring?",
    suggestions: ["Payment fraud", "Account takeover", "Anomaly detection", "All of the above"],
  },
  dataSource: {
    id: "q6",
    question: "How would you like to provide the data?",
    suggestions: ["Connect database", "Upload CSV", "Use Kaggle dataset", "Web scraping"],
  },
};

// Demo Data Sources
export const DEMO_DATA_SOURCES: DataSource[] = [
  {
    id: "ds1",
    name: "Amazon Products",
    url: "amazon.com/products",
    type: "web",
    status: "crawling",
    recordCount: 847,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: "ds2",
    name: "Customer Reviews API",
    url: "api.reviews.io/v2",
    type: "api",
    status: "completed",
    recordCount: 12453,
    lastUpdated: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "ds3",
    name: "Competitor Pricing",
    url: "competitor-data.com",
    type: "web",
    status: "pending",
  },
  {
    id: "ds4",
    name: "Product Database",
    url: "mongodb://internal-db/products",
    type: "database",
    status: "completed",
    recordCount: 8921,
    lastUpdated: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: "ds5",
    name: "User Behavior Data",
    url: "analytics.company.com",
    type: "api",
    status: "pending",
  },
  {
    id: "ds6",
    name: "Kaggle: E-commerce Dataset",
    url: "kaggle.com/datasets/ecommerce-behavior",
    type: "kaggle",
    status: "completed",
    recordCount: 50000,
    metadata: { kaggleScore: 8.5, downloads: 12000 },
  },
  {
    id: "ds7",
    name: "Social Media Feed",
    url: "social-api.io/feed",
    type: "api",
    status: "error",
  },
  {
    id: "ds8",
    name: "Inventory System",
    url: "erp.company.com/inv",
    type: "database",
    status: "completed",
    recordCount: 2847,
    lastUpdated: new Date(Date.now() - 1800000).toISOString(),
  },
];

// Demo Training Metrics (historical)
export const DEMO_TRAINING_HISTORY: TrainingMetrics[] = Array.from({ length: 25 }, (_, i) => ({
  epoch: i + 1,
  loss: 0.8 - (0.02 * i) + Math.random() * 0.05,
  accuracy: 0.55 + (0.015 * i) + Math.random() * 0.02,
  valLoss: 0.85 - (0.018 * i) + Math.random() * 0.08,
  valAccuracy: 0.52 + (0.014 * i) + Math.random() * 0.03,
  timestamp: new Date(Date.now() - (25 - i) * 60000).toISOString(),
}));

// Demo Training Config
export const DEMO_TRAINING_CONFIG: TrainingConfig = {
  modelType: "XGBoost Classifier",
  learningRate: 0.01,
  batchSize: 64,
  maxDepth: 8,
  estimators: 200,
  epochs: 50,
};

// Demo Feature Importance
export const DEMO_FEATURE_IMPORTANCE = [
  { feature: "purchase_frequency", importance: 0.23, category: "behavior" },
  { feature: "avg_order_value", importance: 0.19, category: "monetary" },
  { feature: "days_since_last_order", importance: 0.17, category: "recency" },
  { feature: "customer_lifetime", importance: 0.12, category: "tenure" },
  { feature: "support_tickets", importance: 0.09, category: "engagement" },
  { feature: "email_open_rate", importance: 0.08, category: "engagement" },
  { feature: "product_returns", importance: 0.07, category: "behavior" },
  { feature: "discount_usage", importance: 0.05, category: "monetary" },
];

// Demo Confusion Matrix
export const DEMO_CONFUSION_MATRIX = {
  labels: ["Not Churned", "Churned"],
  matrix: [
    [847, 52],   // True Negatives, False Positives
    [38, 263],   // False Negatives, True Positives
  ],
  metrics: {
    accuracy: 0.925,
    precision: 0.835,
    recall: 0.874,
    f1Score: 0.854,
  },
};

// Demo Pipeline Logs
export const DEMO_PIPELINE_LOGS: PipelineLog[] = [
  {
    id: "log1",
    timestamp: new Date(Date.now() - 120000).toISOString(),
    level: "info",
    source: "OpenRouter",
    message: "Initializing question generation pipeline",
    details: "Model: anthropic/claude-3.5-sonnet",
  },
  {
    id: "log2",
    timestamp: new Date(Date.now() - 115000).toISOString(),
    level: "success",
    source: "OpenRouter",
    message: "Generated 4 dynamic questions based on context",
  },
  {
    id: "log3",
    timestamp: new Date(Date.now() - 100000).toISOString(),
    level: "info",
    source: "Firecrawl",
    message: "Searching for relevant data sources",
    details: "Query: customer churn prediction datasets",
  },
  {
    id: "log4",
    timestamp: new Date(Date.now() - 95000).toISOString(),
    level: "success",
    source: "Firecrawl",
    message: "Found 8 potential data sources",
  },
  {
    id: "log5",
    timestamp: new Date(Date.now() - 80000).toISOString(),
    level: "info",
    source: "MongoDB",
    message: "Connecting to vector database",
    details: "Collection: embeddings_v2",
  },
  {
    id: "log6",
    timestamp: new Date(Date.now() - 75000).toISOString(),
    level: "success",
    source: "MongoDB",
    message: "Vector search completed: 2,847 similar records found",
  },
  {
    id: "log7",
    timestamp: new Date(Date.now() - 60000).toISOString(),
    level: "info",
    source: "Kaggle",
    message: "Searching for relevant datasets",
    details: "Query: e-commerce customer behavior",
  },
  {
    id: "log8",
    timestamp: new Date(Date.now() - 55000).toISOString(),
    level: "success",
    source: "Kaggle",
    message: "Found 3 matching datasets with high usability score",
  },
  {
    id: "log9",
    timestamp: new Date(Date.now() - 40000).toISOString(),
    level: "info",
    source: "Training",
    message: "Preparing data pipeline",
    details: "14,203 samples loaded",
  },
  {
    id: "log10",
    timestamp: new Date(Date.now() - 35000).toISOString(),
    level: "warning",
    source: "Training",
    message: "Class imbalance detected (23% positive class)",
    details: "Applying SMOTE oversampling",
  },
  {
    id: "log11",
    timestamp: new Date(Date.now() - 20000).toISOString(),
    level: "info",
    source: "Training",
    message: "Starting XGBoost training",
    details: "Config: lr=0.01, depth=8, estimators=200",
  },
  {
    id: "log12",
    timestamp: new Date(Date.now() - 5000).toISOString(),
    level: "success",
    source: "Training",
    message: "Epoch 23/50 completed",
    details: "Loss: 0.342, Accuracy: 0.891",
  },
];

// Demo Crawled Data Preview
export const DEMO_CRAWLED_DATA = [
  { id: 1, product: "Wireless Headphones", price: "$129.99", rating: "4.5", reviews: "2,847", source: "Amazon" },
  { id: 2, product: "Smart Watch Pro", price: "$299.00", rating: "4.7", reviews: "1,293", source: "Amazon" },
  { id: 3, product: "USB-C Hub 7-in-1", price: "$49.99", rating: "4.3", reviews: "892", source: "Amazon" },
  { id: 4, product: "Mechanical Keyboard", price: "$159.00", rating: "4.8", reviews: "3,421", source: "Amazon" },
  { id: 5, product: "4K Webcam", price: "$89.99", rating: "4.2", reviews: "567", source: "Amazon" },
  { id: 6, product: "Noise Canceling Earbuds", price: "$179.99", rating: "4.6", reviews: "1,892", source: "BestBuy" },
  { id: 7, product: "Gaming Mouse", price: "$79.99", rating: "4.4", reviews: "2,103", source: "Newegg" },
  { id: 8, product: "Portable Charger 20000mAh", price: "$39.99", rating: "4.5", reviews: "5,234", source: "Amazon" },
];

// Demo Kaggle Datasets
export const DEMO_KAGGLE_DATASETS = [
  {
    id: "kg1",
    title: "E-commerce Customer Behavior",
    author: "datainsights",
    usabilityScore: 9.1,
    downloads: 45000,
    size: "1.2 GB",
    description: "Customer transaction data with churn labels",
  },
  {
    id: "kg2",
    title: "Retail Sales Dataset",
    author: "mlresearch",
    usabilityScore: 8.7,
    downloads: 32000,
    size: "800 MB",
    description: "5 years of retail sales with seasonality",
  },
  {
    id: "kg3",
    title: "Product Reviews NLP",
    author: "nlpmaster",
    usabilityScore: 8.9,
    downloads: 28000,
    size: "2.1 GB",
    description: "Labeled sentiment analysis dataset",
  },
];

// AI Response Generator (demo)
export function generateDemoResponse(userInput: string): {
  response: string;
  suggestions: string[];
  showProgress: boolean;
  progressSteps?: { label: string; done: boolean }[];
} {
  const lower = userInput.toLowerCase();
  
  if (lower.includes("churn")) {
    return {
      response: "I'll build a customer churn model. What data do you have available?",
      suggestions: ["Connect database", "Use sample data", "Show Kaggle options"],
      showProgress: false,
    };
  }
  
  if (lower.includes("sales") || lower.includes("forecast")) {
    return {
      response: "Sales forecasting - got it. How far ahead should I predict?",
      suggestions: ["7 days", "30 days", "90 days", "Custom range"],
      showProgress: false,
    };
  }
  
  if (lower.includes("sentiment") || lower.includes("review")) {
    return {
      response: "Sentiment classification coming up. This will categorize text automatically.",
      suggestions: ["Connect API", "Upload CSV", "Try demo"],
      showProgress: false,
    };
  }
  
  if (lower.includes("connect") || lower.includes("start") || lower.includes("build")) {
    return {
      response: "Starting the ML pipeline. I'll search for data sources and configure training.",
      suggestions: ["View logs", "Configure model", "Skip to training"],
      showProgress: true,
      progressSteps: [
        { label: "Analyzing requirements", done: true },
        { label: "Searching data sources (Firecrawl)", done: true },
        { label: "Vector search (MongoDB)", done: false },
        { label: "Configuring pipeline", done: false },
        { label: "Starting training", done: false },
      ],
    };
  }
  
  if (lower.includes("kaggle")) {
    return {
      response: "I found 3 relevant datasets on Kaggle. Which would you like to use?",
      suggestions: DEMO_KAGGLE_DATASETS.slice(0, 3).map(d => d.title),
      showProgress: false,
    };
  }
  
  return {
    response: "Got it! Let me configure the right ML pipeline for this.",
    suggestions: ["Connect data", "See demo", "Configure options"],
    showProgress: false,
  };
}
