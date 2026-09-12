import { Router } from 'express';
import { runAgent, listExecutions, getExecutionTrace, approveExecution } from '../controllers/agentController';
import { validate } from '../middleware/validation';
import { z } from 'zod';

const router = Router();

const agentRunSchema = z.object({
  message: z.string().min(1, 'Agent request message is required'),
  brandId: z.string().optional(),
  conversationId: z.string().optional(),
});

router.post('/run', validate(agentRunSchema), runAgent);
router.get('/executions', listExecutions);
router.get('/executions/:id', getExecutionTrace);
router.post('/executions/:id/approve', approveExecution);

export default router;
