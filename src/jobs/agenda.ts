import Agenda from 'agenda';
import { config } from '../config';

function buildAgendaUri(uri: string, database: string): string {
  const [base, query] = uri.includes('?') ? uri.split('?', 2) : [uri, ''];
  const baseWithoutPath = base.replace(/\/[^/]*$/, '') || base;
  const q = query ? `?${query}` : '';
  return `${baseWithoutPath}/${database}${q}`;
}

let agendaInstance: Agenda | null = null;

export function getAgenda(): Agenda {
  if (!agendaInstance) {
    throw new Error('Agenda not initialized. Call initAgenda() first.');
  }
  return agendaInstance;
}

export async function initAgenda(): Promise<Agenda> {
  if (agendaInstance) {
    return agendaInstance;
  }

  const agendaUri = buildAgendaUri(config.MONGODB_URI, config.MONGODB_DATABASE);
  agendaInstance = new Agenda({
    db: { address: agendaUri, collection: 'agendaJobs' },
    processEvery: '10 seconds',
    maxConcurrency: 5,
  });

  // Define all job types
  const { defineIntentParserJob } = await import('./intent-parser.job');
  const { defineDiscoveryCrawlJob } = await import('./discovery-crawl.job');
  const { defineRelevanceScorerJob } = await import('./relevance-scorer.job');
  const { defineValidationEnrichJob } = await import('./validation-enrich.job');

  defineIntentParserJob(agendaInstance);
  defineDiscoveryCrawlJob(agendaInstance);
  defineRelevanceScorerJob(agendaInstance);
  defineValidationEnrichJob(agendaInstance);

  // Graceful shutdown
  const gracefulShutdown = async () => {
    console.log('\n⏳ Stopping Agenda...');
    await agendaInstance?.stop();
    console.log('👋 Agenda stopped');
    process.exit(0);
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);

  await agendaInstance.start();
  console.log('✅ Agenda started');

  return agendaInstance;
}
