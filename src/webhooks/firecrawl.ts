import { Router, Request, Response } from 'express';
import { config } from '../config';

export const firecrawlWebhookRouter = Router();

/**
 * POST /webhooks/firecrawl
 * Handle Firecrawl webhook callbacks
 */
firecrawlWebhookRouter.post('/firecrawl', async (req: Request, res: Response) => {
  try {
    // Verify webhook signature if secret is configured
    if (config.FIRECRAWL_WEBHOOK_SECRET) {
      const signature = req.headers['x-firecrawl-signature'];
      
      // TODO: Implement signature verification
      // For now, just check if signature exists
      if (!signature) {
        console.warn('⚠️ Webhook received without signature');
      }
    }

    const payload = req.body;
    console.log('📥 Firecrawl webhook received:', {
      url: payload.url,
      status: payload.status,
    });

    // The validation-enrich job already handles the scraping
    // This webhook is mainly for async scrape completion notifications
    // For now, we just acknowledge receipt
    
    // In a production system, you might:
    // 1. Look up the job by firecrawl_id
    // 2. Process the webhook data
    // 3. Update the source in MongoDB
    // 4. Mark the job as complete

    return res.status(200).json({ 
      success: true,
      message: 'Webhook received' 
    });
  } catch (error: any) {
    console.error('❌ Error processing Firecrawl webhook:', error);
    return res.status(500).json({ error: error.message });
  }
});
