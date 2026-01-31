import { Agenda, Job } from 'agenda';
import { ObjectId } from 'mongodb';
import { openRouterService } from '../services/openrouter';
import { mongodb } from '../db/mongodb';

interface IntentParserJobData {
  project_id: string;
  prompt: string;
}

export function defineIntentParserJob(agenda: Agenda) {
  agenda.define('intent-parse', async (job: Job<IntentParserJobData>) => {
    const { project_id, prompt } = job.attrs.data as IntentParserJobData;

    console.log(`🔍 [Intent Parser] Processing for project ${project_id}`);

    try {
      // Call OpenRouter to parse intent
      const parsedIntent = await openRouterService.parseIntent(prompt);

      console.log(`✅ [Intent Parser] Parsed intent:`, {
        target: parsedIntent.target_variable,
        features: parsedIntent.feature_requirements.length,
        queries: parsedIntent.search_queries.length,
      });

      // Update or create discovery project document
      const projectOid = new ObjectId(project_id);
      
      await mongodb.discoveryProjects.updateOne(
        { project_id: projectOid },
        {
          $set: {
            discovery_chain: {
              original_prompt: prompt,
              generated_queries: parsedIntent.search_queries,
              discovery_date: new Date(),
            },
          },
        },
        { upsert: true }
      );

      // Schedule discovery-crawl job
      await agenda.schedule('in 5 seconds', 'discovery-crawl', {
        project_id,
        queries: parsedIntent.search_queries,
        parsed_intent: parsedIntent,
      });

      console.log(`✅ [Intent Parser] Scheduled discovery-crawl job`);
    } catch (error) {
      console.error(`❌ [Intent Parser] Error:`, error);
      throw error;
    }
  });
}
