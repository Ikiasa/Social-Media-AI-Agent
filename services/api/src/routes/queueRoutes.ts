import { Router, Request, Response } from 'express';
import { getQueueStatus, researchQueue, contentQueue, dispatchQueue } from '../queues/QueueManager';

const router = Router();

// GET /api/v1/queues/status
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const status = await getQueueStatus();
    res.json({
      success: true,
      data: status,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// POST /api/v1/queues/dispatch
router.post('/dispatch', async (req: Request, res: Response) => {
  try {
    const { queueName, payload } = req.body;
    let job: any = null;

    if (queueName === 'research') {
      job = await researchQueue.add('research-job', payload || { topic: 'Social Media AI Automation' });
    } else if (queueName === 'content') {
      job = await contentQueue.add('content-job', payload || { topic: 'AI Hook Strategy' });
    } else {
      job = await dispatchQueue.add('dispatch-job', payload || { contentId: `cnt_${Date.now()}` });
    }

    res.json({
      success: true,
      jobId: job.id,
      queueName: queueName || 'dispatch',
      status: 'queued',
      message: `Job #${job.id} dispatched to BullMQ ${queueName || 'dispatch'} queue!`,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

export default router;
