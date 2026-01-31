import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  OPENROUTER_API_KEY: z.string().min(1, 'OpenRouter API key is required'),
  OPENROUTER_MODEL_INTENT: z.string().default('anthropic/claude-3.5-sonnet'),
  OPENROUTER_MODEL_SCORE: z.string().default('meta-llama/llama-3.1-70b-instruct'),
  FIRECRAWL_API_KEY: z.string().min(1, 'Firecrawl API key is required'),
  FIRECRAWL_WEBHOOK_SECRET: z.string().optional(),
  MONGODB_URI: z.string().min(1, 'MongoDB URI is required'),
  MONGODB_DATABASE: z.string().default('automl_discovery'),
  PORT: z.string().default('3000'),
  BASE_URL: z.string().default('http://localhost:3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type Config = z.infer<typeof envSchema>;

function validateEnv(): Config {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      console.error('❌ Invalid environment variables:');
      missingVars.forEach((v) => console.error(`  - ${v}`));
      process.exit(1);
    }
    throw error;
  }
}

export const config = validateEnv();
