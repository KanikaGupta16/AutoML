import { Agenda, Job } from 'agenda';
import { ObjectId } from 'mongodb';
import { openRouterService } from '../services/openrouter';
import { firecrawlService } from '../services/firecrawl';
import { mongodb } from '../db/mongodb';
import { ParsedIntent } from '../db/schemas';

interface RelevanceScorerJobData {
  project_id: string;
  urls: string[];
  parsed_intent: ParsedIntent;
}

export function defineRelevanceScorerJob(agenda: Agenda) {
  agenda.define('relevance-score', async (job: Job<RelevanceScorerJobData>) => {
    const { project_id, urls, parsed_intent } = job.attrs.data as RelevanceScorerJobData;

    console.log(`📊 [Relevance Scorer] Processing ${urls.length} URLs for project ${project_id}`);

    try {
      const projectOid = new ObjectId(project_id);

      for (const url of urls) {
        const normalizedUrl = firecrawlService.normalizeUrl(url);

        // Check MongoDB cache first
        const cached = await mongodb.relevanceCache.findOne({
          url: normalizedUrl,
          expiresAt: { $gt: new Date() },
        });

        let relevanceScore: number;
        let sourceType: string;

        if (cached) {
          console.log(`  💾 Cache hit for ${url}`);
          relevanceScore = cached.relevance_score;
          sourceType = cached.source_type;
        } else {
          // Get source info from discovery project
          const project = await mongodb.discoveryProjects.findOne({
            project_id: projectOid,
            'sources.url': url,
          });

          if (!project) {
            console.warn(`  ⚠️ Source not found: ${url}`);
            continue;
          }

          // For scoring, we'll use URL as title and empty snippet
          // In a real implementation, you might want to fetch metadata first
          const title = url;
          const snippet = '';

          // Score with OpenRouter
          const result = await openRouterService.scoreRelevance(
            {
              target: parsed_intent.target_variable,
              features: parsed_intent.feature_requirements,
            },
            title,
            snippet
          );

          relevanceScore = result.relevance_score;
          sourceType = result.source_type;

          // Cache the result
          await mongodb.relevanceCache.updateOne(
            { url: normalizedUrl },
            {
              $set: {
                url: normalizedUrl,
                relevance_score: relevanceScore,
                source_type: sourceType,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h TTL
              },
            },
            { upsert: true }
          );

          console.log(`  ✅ Scored ${url}: ${relevanceScore}`);
        }

        // Update source in discovery project
        const status = relevanceScore > 70 ? 'validated' : 'rejected';
        
        await mongodb.discoveryProjects.updateOne(
          {
            project_id: projectOid,
            'sources.url': url,
          },
          {
            $set: {
              'sources.$.relevance_score': relevanceScore,
              'sources.$.source_type': sourceType,
              'sources.$.status': status,
            },
          }
        );

        // If score > 70, schedule validation-enrich
        if (relevanceScore > 70) {
          await agenda.schedule('in 15 seconds', 'validation-enrich', {
            project_id,
            url,
            parsed_intent,
          });
          console.log(`  ✅ Scheduled validation-enrich for ${url}`);
        }
      }

      console.log(`✅ [Relevance Scorer] Completed batch`);
    } catch (error) {
      console.error(`❌ [Relevance Scorer] Error:`, error);
      throw error;
    }
  });
}
