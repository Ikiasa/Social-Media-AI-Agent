import { Router } from 'express';
import {
  ingestKnowledge,
  listKnowledge,
  getKnowledge,
  deleteKnowledge,
} from '../controllers/knowledgeController';
import { validate } from '../middleware/validation';
import { ingestKnowledgeSchema } from '../schemas/apiSchemas';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.post('/knowledge', validate(ingestKnowledgeSchema), ingestKnowledge);
router.get('/knowledge', listKnowledge);
router.get('/knowledge/:id', getKnowledge);
router.delete('/knowledge/:id', deleteKnowledge);

export default router;
