import axios, { AxiosInstance } from 'axios';
import { config } from '../config';
import { ParsedIntent, RelevanceScoreResult, SchemaDetectionResult } from '../db/schemas';

class OpenRouterService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: 'https://openrouter.ai/api/v1',
      headers: {
        'Authorization': `Bearer ${config.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': config.BASE_URL,
        'X-Title': 'AutoML Discovery Pipeline',
      },
    });
  }

  /**
   * Parse user intent to extract target variable, features, and search queries
   */
  async parseIntent(userPrompt: string): Promise<ParsedIntent> {
    const systemPrompt = `You are an expert data discovery assistant. Extract structured information from the user's request.

Return ONLY valid JSON with this exact structure:
{
  "target_variable": "what the user wants to predict/analyze",
  "feature_requirements": ["list", "of", "required", "data", "points"],
  "search_queries": ["3-5", "specific", "search", "queries", "to", "find", "this", "data"]
}

Generate search queries that target:
- Government APIs and datasets
- Academic/research databases
- Open data portals
- Kaggle datasets
- GitHub repositories with relevant data

Be specific and use terms like "API", "dataset", "CSV", "open data" in queries.`;

    try {
      const response = await this.client.post('/chat/completions', {
        model: config.OPENROUTER_MODEL_INTENT,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
      });

      const content = response.data.choices[0].message.content;
      const parsed = JSON.parse(content);

      return {
        target_variable: parsed.target_variable,
        feature_requirements: parsed.feature_requirements || [],
        search_queries: parsed.search_queries || [],
      };
    } catch (error) {
      console.error('❌ OpenRouter parseIntent error:', error);
      throw new Error(`Failed to parse intent: ${error}`);
    }
  }

  /**
   * Score the relevance of a discovered URL
   */
  async scoreRelevance(
    context: { target: string; features: string[] },
    title: string,
    snippet: string
  ): Promise<RelevanceScoreResult> {
    const systemPrompt = `You are a data source evaluator. Rate how relevant this source is for the user's data needs.

User needs:
- Target: ${context.target}
- Required features: ${context.features.join(', ')}

Return ONLY valid JSON:
{
  "relevance_score": <number 0-100>,
  "source_type": "<API|Dataset|Article|Irrelevant>"
}

Score guidelines:
- 90-100: Perfect match with target and features
- 70-89: Good match, has most required data
- 40-69: Partial match, missing some features
- 0-39: Poor match or irrelevant`;

    try {
      const response = await this.client.post('/chat/completions', {
        model: config.OPENROUTER_MODEL_SCORE,
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: `Title: ${title}\n\nSnippet: ${snippet.substring(0, 1000)}` 
          }
        ],
        response_format: { type: 'json_object' },
      });

      const content = response.data.choices[0].message.content;
      const parsed = JSON.parse(content);

      return {
        relevance_score: parsed.relevance_score || 0,
        source_type: parsed.source_type || 'Irrelevant',
      };
    } catch (error) {
      console.error('❌ OpenRouter scoreRelevance error:', error);
      throw new Error(`Failed to score relevance: ${error}`);
    }
  }

  /**
   * Detect schema and features from scraped data sample
   */
  async detectSchema(
    userIntent: { target: string; features: string[] },
    scrapedSample: string
  ): Promise<SchemaDetectionResult> {
    const systemPrompt = `You are a data schema analyzer. Determine if this scraped content contains the required features.

User needs:
- Target: ${userIntent.target}
- Required features: ${userIntent.features.join(', ')}

Analyze the sample and return ONLY valid JSON:
{
  "features_found": ["list", "of", "matching", "features"],
  "quality_rating": <number 0-100>
}

Quality rating guidelines:
- 90-100: Complete, clean, well-structured data
- 70-89: Good data with minor issues
- 40-69: Usable but requires significant cleaning
- 0-39: Poor quality or incomplete`;

    try {
      const response = await this.client.post('/chat/completions', {
        model: config.OPENROUTER_MODEL_SCORE,
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: `Analyze this data sample:\n\n${scrapedSample.substring(0, 2000)}` 
          }
        ],
        response_format: { type: 'json_object' },
      });

      const content = response.data.choices[0].message.content;
      const parsed = JSON.parse(content);

      return {
        features_found: parsed.features_found || [],
        quality_rating: parsed.quality_rating,
      };
    } catch (error) {
      console.error('❌ OpenRouter detectSchema error:', error);
      throw new Error(`Failed to detect schema: ${error}`);
    }
  }
}

export const openRouterService = new OpenRouterService();
