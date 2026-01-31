import { Agenda, Job } from 'agenda';
import { ObjectId } from 'mongodb';
import { openRouterService } from '../services/openrouter';
import { firecrawlService } from '../services/firecrawl';
import { mongodb } from '../db/mongodb';
import { ParsedIntent } from '../db/schemas';

interface ValidationEnrichJobData {
  project_id: string;
  url: string;
  parsed_intent: ParsedIntent;
}

export function defineValidationEnrichJob(agenda: Agenda) {
  agenda.define('validation-enrich', async (job: Job<ValidationEnrichJobData>) => {
    const { project_id, url, parsed_intent } = job.attrs.data as ValidationEnrichJobData;

    console.log(`🔬 [Validation Enrich] Processing ${url} for project ${project_id}`);

    try {
      const projectOid = new ObjectId(project_id);

      // Mark as crawling
      await mongodb.discoveryProjects.updateOne(
        {
          project_id: projectOid,
          'sources.url': url,
        },
        {
          $set: {
            'sources.$.status': 'crawling',
          },
        }
      );

      // Scrape with Firecrawl (v2 API; sync response only, no webhook in request)
      const scrapeResult = await firecrawlService.scrape(url);

      if (!scrapeResult.success) {
        // Handle rate limiting
        if (scrapeResult.rate_limited) {
          console.warn(`  ⚠️ Rate limited: ${url}`);
          
          const retryAfter = scrapeResult.retry_after 
            ? new Date(Date.now() + scrapeResult.retry_after * 1000)
            : new Date(Date.now() + 3600 * 1000); // Default 1 hour

          await mongodb.discoveryProjects.updateOne(
            {
              project_id: projectOid,
              'sources.url': url,
            },
            {
              $set: {
                'sources.$.status': 'rate_limited',
                'sources.$.retry_after': retryAfter,
              },
            }
          );

          // Reschedule for later
          await agenda.schedule(retryAfter, 'validation-enrich', {
            project_id,
            url,
            parsed_intent,
          });

          return;
        }

        // Other failures
        await mongodb.discoveryProjects.updateOne(
          {
            project_id: projectOid,
            'sources.url': url,
          },
          {
            $set: {
              'sources.$.status': 'failed',
            },
          }
        );

        console.error(`  ❌ Failed to scrape: ${scrapeResult.error}`);
        return;
      }

      // Extract sample content
      const sampleContent = scrapeResult.data?.markdown || scrapeResult.data?.content || '';
      
      if (!sampleContent) {
        console.warn(`  ⚠️ No content extracted from ${url}`);
        await mongodb.discoveryProjects.updateOne(
          {
            project_id: projectOid,
            'sources.url': url,
          },
          {
            $set: {
              'sources.$.status': 'failed',
            },
          }
        );
        return;
      }

      // Detect schema with OpenRouter
      const schemaResult = await openRouterService.detectSchema(
        {
          target: parsed_intent.target_variable,
          features: parsed_intent.feature_requirements,
        },
        sampleContent
      );

      // Determine credibility tier based on domain
      let credibilityTier: 'high' | 'medium' | 'low' = 'medium';
      try {
        const urlObj = new URL(url);
        const domain = urlObj.hostname.toLowerCase();
        
        if (domain.endsWith('.gov') || domain.endsWith('.edu')) {
          credibilityTier = 'high';
        } else if (domain.includes('github.com') || domain.includes('kaggle.com')) {
          credibilityTier = 'high';
        }
      } catch (e) {
        // Invalid URL, keep medium
      }

      // Update source with enriched data
      await mongodb.discoveryProjects.updateOne(
        {
          project_id: projectOid,
          'sources.url': url,
        },
        {
          $set: {
            'sources.$.status': 'validated',
            'sources.$.features_found': schemaResult.features_found,
            'sources.$.quality_rating': schemaResult.quality_rating,
            'sources.$.credibility_tier': credibilityTier,
            'sources.$.raw_data_sample': {
              markdown: sampleContent.substring(0, 5000), // Store first 5k chars
              metadata: scrapeResult.data?.metadata,
            },
            'sources.$.last_crawled': new Date(),
          },
        }
      );

      console.log(`✅ [Validation Enrich] Completed ${url}`, {
        features: schemaResult.features_found.length,
        quality: schemaResult.quality_rating,
        credibility: credibilityTier,
      });
    } catch (error) {
      console.error(`❌ [Validation Enrich] Error:`, error);
      
      // Mark as failed
      await mongodb.discoveryProjects.updateOne(
        {
          project_id: new ObjectId(project_id),
          'sources.url': url,
        },
        {
          $set: {
            'sources.$.status': 'failed',
          },
        }
      );
      
      throw error;
    }
  });
}
