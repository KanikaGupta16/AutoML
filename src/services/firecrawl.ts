import axios, { AxiosInstance } from 'axios';
import { config } from '../config';

export interface FirecrawlSearchResult {
  url: string;
  title: string;
  description?: string;
  snippet?: string;
  favicon?: string;
}

export interface FirecrawlScrapeResult {
  success: boolean;
  data?: {
    content?: string;
    markdown?: string;
    html?: string;
    metadata?: any;
  };
  rate_limited?: boolean;
  retry_after?: number;
  error?: string;
}

class FirecrawlService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: 'https://api.firecrawl.dev/v2',
      headers: {
        'Authorization': `Bearer ${config.FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Search for URLs matching a query
   */
  async search(query: string, limit: number = 10): Promise<FirecrawlSearchResult[]> {
    try {
      const response = await this.client.post('/search', {
        query,
        limit,
      });

      const data = response.data?.data;
      const results = data?.web ?? data ?? response.data?.results ?? [];
      
      return (Array.isArray(results) ? results : []).map((item: any) => ({
        url: item.url || item.link,
        title: item.title || '',
        description: item.description || item.snippet || '',
        snippet: item.snippet || item.description || '',
        favicon: item.favicon,
      }));
    } catch (error: any) {
      console.error('❌ Firecrawl search error:', error.response?.data || error.message);
      
      // Return empty array instead of throwing to handle gracefully
      if (error.response?.status === 429) {
        console.warn('⚠️ Firecrawl rate limited on search');
      }
      
      return [];
    }
  }

  /**
   * Scrape a URL for full content.
   * Uses Firecrawl v2 API: only url, formats, onlyMainContent are sent (no webhook in body).
   */
  async scrape(url: string): Promise<FirecrawlScrapeResult> {
    try {
      const payload = {
        url,
        formats: ['markdown', 'html'] as const,
        onlyMainContent: true,
      };

      const response = await this.client.post('/scrape', payload);

      const data = response.data?.data ?? response.data;
      const metadata = response.data?.metadata ?? data?.metadata;
      return {
        success: true,
        data: {
          content: data?.content ?? data?.markdown,
          markdown: data?.markdown,
          html: data?.html,
          metadata,
        },
      };
    } catch (error: any) {
      console.error('❌ Firecrawl scrape error for', url, ':', error.response?.data || error.message);

      const status = error.response?.status;
      
      if (status === 403 || status === 401) {
        return {
          success: false,
          rate_limited: true,
          error: 'Access denied or authentication failed',
        };
      }

      if (status === 429) {
        const retryAfter = error.response?.headers['retry-after'];
        return {
          success: false,
          rate_limited: true,
          retry_after: retryAfter ? parseInt(retryAfter) : 3600, // Default 1 hour
          error: 'Rate limited',
        };
      }

      if (status === 504 || status === 408) {
        return {
          success: false,
          rate_limited: true,
          retry_after: 1800, // 30 minutes
          error: 'Timeout',
        };
      }

      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * Normalize URL for cache key
   */
  normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      // Remove trailing slash, www, and convert to lowercase
      return parsed.href
        .toLowerCase()
        .replace(/\/$/, '')
        .replace(/^https?:\/\/www\./, 'https://');
    } catch {
      return url.toLowerCase().replace(/\/$/, '');
    }
  }
}

export const firecrawlService = new FirecrawlService();
