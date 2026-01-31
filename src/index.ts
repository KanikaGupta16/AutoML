import express from 'express';
import { config } from './config';
import { mongodb } from './db/mongodb';
import { initAgenda } from './jobs/agenda';
import { discoveryRouter } from './api/discovery';
import { firecrawlWebhookRouter } from './webhooks/firecrawl';

async function startServer() {
  console.log('🚀 Starting AutoML Discovery Pipeline...\n');

  // Initialize Express app
  const app = express();
  
  // Middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Connect to MongoDB
  await mongodb.connect();

  // Initialize Agenda (job scheduler)
  await initAgenda();

  // Register routes
  app.use('/discovery', discoveryRouter);
  app.use('/webhooks', firecrawlWebhookRouter);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('❌ Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  // Start server
  const port = parseInt(config.PORT, 10);
  app.listen(port, '0.0.0.0', () => {
    console.log(`\n✅ Server running on port ${port}`);
    console.log(`📍 Base URL: ${config.BASE_URL}`);
    console.log(`\n📚 API Endpoints:`);
    console.log(`   POST ${config.BASE_URL}/discovery/start`);
    console.log(`   GET  ${config.BASE_URL}/discovery/:projectId/status`);
    console.log(`   POST ${config.BASE_URL}/webhooks/firecrawl`);
    console.log(`\n🔧 Environment: ${config.NODE_ENV}\n`);
  });
}

// Start the server
startServer().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
