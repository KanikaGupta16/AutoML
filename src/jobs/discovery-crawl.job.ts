import { Agenda, Job } from 'agenda';
import { ObjectId } from 'mongodb';
import { firecrawlService } from '../services/firecrawl';
import { mongodb } from '../db/mongodb';
import { ParsedIntent, Source } from '../db/schemas';

interface DiscoveryCrawlJobData {
  project_id: string;
  queries: string[];
  parsed_intent: ParsedIntent;
}

export function defineDiscoveryCrawlJob(agenda: Agenda) {
  agenda.define('discovery-crawl', async (job: Job<DiscoveryCrawlJobData>) => {
    const { project_id, queries, parsed_intent } = job.attrs.data as DiscoveryCrawlJobData;

    console.log(`🌐 [Discovery Crawl] Processing ${queries.length} queries for project ${project_id}`);

    try {
      const allSources: Source[] = [];
      const seenUrls = new Set<string>();

      // Search for each query
      for (const query of queries) {
        console.log(`  🔎 Searching: "${query}"`);
        const results = await firecrawlService.search(query, 10);

        for (const result of results) {
          const normalizedUrl = firecrawlService.normalizeUrl(result.url);
          
          // Skip duplicates
          if (seenUrls.has(normalizedUrl)) {
            continue;
          }
          seenUrls.add(normalizedUrl);

          allSources.push({
            url: result.url,
            status: 'pending_validation',
          });
        }
      }

      console.log(`✅ [Discovery Crawl] Found ${allSources.length} unique URLs`);

      // Save candidates to MongoDB
      if (allSources.length > 0) {
        const projectOid = new ObjectId(project_id);
        
        await mongodb.discoveryProjects.updateOne(
          { project_id: projectOid },
          {
            $push: { sources: { $each: allSources } },
          }
        );

        // Schedule relevance scoring jobs (batched to avoid too many jobs)
        const batchSize = 5;
        for (let i = 0; i < allSources.length; i += batchSize) {
          const batch = allSources.slice(i, i + batchSize);
          const urls = batch.map(s => s.url);

          await agenda.schedule('in 10 seconds', 'relevance-score', {
            project_id,
            urls,
            parsed_intent,
          });
        }

        console.log(`✅ [Discovery Crawl] Scheduled ${Math.ceil(allSources.length / batchSize)} relevance-score jobs`);
      } else {
        console.warn(`⚠️ [Discovery Crawl] No URLs found`);
      }
    } catch (error) {
      console.error(`❌ [Discovery Crawl] Error:`, error);
      throw error;
    }
  });
}
