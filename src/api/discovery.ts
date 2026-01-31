import { Router, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { mongodb } from '../db/mongodb';
import { getAgenda } from '../jobs/agenda';

export const discoveryRouter = Router();

/**
 * POST /discovery/start
 * Start a new discovery pipeline
 */
discoveryRouter.post('/start', async (req: Request, res: Response) => {
  try {
    const { project_id, prompt } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Generate project_id if not provided
    const projectId = project_id || new ObjectId().toString();
    const projectOid = new ObjectId(projectId);

    // Initialize discovery project document
    await mongodb.discoveryProjects.updateOne(
      { project_id: projectOid },
      {
        $setOnInsert: {
          project_id: projectOid,
          sources: [],
        },
      },
      { upsert: true }
    );

    // Schedule intent-parse job
    const agenda = getAgenda();
    const job = await agenda.now('intent-parse', {
      project_id: projectId,
      prompt,
    });

    console.log(`🚀 Started discovery for project ${projectId}`);

    return res.status(200).json({
      project_id: projectId,
      job_id: job.attrs._id?.toString(),
      status: 'started',
      message: 'Discovery pipeline started',
    });
  } catch (error: any) {
    console.error('❌ Error starting discovery:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /discovery/:projectId/status
 * Get discovery status for a project
 */
discoveryRouter.get('/:projectId/status', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    if (!ObjectId.isValid(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    const projectOid = new ObjectId(projectId);
    const project = await mongodb.discoveryProjects.findOne({ project_id: projectOid });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Aggregate statistics
    const stats = {
      total_sources: project.sources.length,
      pending_validation: project.sources.filter(s => s.status === 'pending_validation').length,
      validated: project.sources.filter(s => s.status === 'validated').length,
      rejected: project.sources.filter(s => s.status === 'rejected').length,
      crawling: project.sources.filter(s => s.status === 'crawling').length,
      rate_limited: project.sources.filter(s => s.status === 'rate_limited').length,
      failed: project.sources.filter(s => s.status === 'failed').length,
    };

    // Get high-quality sources (score > 70 and validated)
    const highQualitySources = project.sources
      .filter(s => s.status === 'validated' && (s.relevance_score || 0) > 70)
      .map(s => ({
        url: s.url,
        relevance_score: s.relevance_score,
        source_type: s.source_type,
        features_found: s.features_found,
        quality_rating: s.quality_rating,
        credibility_tier: s.credibility_tier,
        last_crawled: s.last_crawled,
      }));

    // Get rate-limited sources that need attention
    const rateLimitedSources = project.sources
      .filter(s => s.status === 'rate_limited')
      .map(s => ({
        url: s.url,
        retry_after: s.retry_after,
        message: 'Source found but needs manual API key or proxy',
      }));

    return res.status(200).json({
      project_id: projectId,
      discovery_chain: project.discovery_chain,
      stats,
      high_quality_sources: highQualitySources,
      rate_limited_sources: rateLimitedSources,
      all_sources: project.sources,
    });
  } catch (error: any) {
    console.error('❌ Error getting discovery status:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /discovery/:projectId
 * Alias for status endpoint
 */
discoveryRouter.get('/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    if (!ObjectId.isValid(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    const projectOid = new ObjectId(projectId);
    const project = await mongodb.discoveryProjects.findOne({ project_id: projectOid });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Aggregate statistics
    const stats = {
      total_sources: project.sources.length,
      pending_validation: project.sources.filter(s => s.status === 'pending_validation').length,
      validated: project.sources.filter(s => s.status === 'validated').length,
      rejected: project.sources.filter(s => s.status === 'rejected').length,
      crawling: project.sources.filter(s => s.status === 'crawling').length,
      rate_limited: project.sources.filter(s => s.status === 'rate_limited').length,
      failed: project.sources.filter(s => s.status === 'failed').length,
    };

    // Get high-quality sources (score > 70 and validated)
    const highQualitySources = project.sources
      .filter(s => s.status === 'validated' && (s.relevance_score || 0) > 70)
      .map(s => ({
        url: s.url,
        relevance_score: s.relevance_score,
        source_type: s.source_type,
        features_found: s.features_found,
        quality_rating: s.quality_rating,
        credibility_tier: s.credibility_tier,
        last_crawled: s.last_crawled,
      }));

    // Get rate-limited sources that need attention
    const rateLimitedSources = project.sources
      .filter(s => s.status === 'rate_limited')
      .map(s => ({
        url: s.url,
        retry_after: s.retry_after,
        message: 'Source found but needs manual API key or proxy',
      }));

    return res.status(200).json({
      project_id: projectId,
      discovery_chain: project.discovery_chain,
      stats,
      high_quality_sources: highQualitySources,
      rate_limited_sources: rateLimitedSources,
      all_sources: project.sources,
    });
  } catch (error: any) {
    console.error('❌ Error getting discovery status:', error);
    return res.status(500).json({ error: error.message });
  }
});
