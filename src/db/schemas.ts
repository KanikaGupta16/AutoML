import { ObjectId } from 'mongodb';

export interface DiscoveryChain {
  original_prompt: string;
  generated_queries: string[];
  discovery_date: Date;
}

export interface Source {
  url: string;
  firecrawl_id?: string;
  relevance_score?: number;
  source_type?: 'API' | 'Dataset' | 'Article' | 'Irrelevant' | 'government' | 'api' | 'dataset' | 'news';
  features_found?: string[];
  status: 'pending_validation' | 'validated' | 'crawling' | 'cleaned' | 'failed' | 'rate_limited' | 'rejected';
  raw_data_sample?: any;
  last_crawled?: Date;
  credibility_tier?: 'high' | 'medium' | 'low';
  quality_rating?: number;
  retry_after?: Date;
}

export interface DiscoveryProject {
  _id?: ObjectId;
  project_id: ObjectId;
  discovery_chain: DiscoveryChain;
  sources: Source[];
}

export interface RelevanceCache {
  _id?: ObjectId;
  url: string;
  relevance_score: number;
  source_type: string;
  expiresAt: Date;
}

export interface ParsedIntent {
  target_variable: string;
  feature_requirements: string[];
  search_queries: string[];
}

export interface RelevanceScoreResult {
  relevance_score: number;
  source_type: string;
}

export interface SchemaDetectionResult {
  features_found: string[];
  quality_rating?: number;
}
