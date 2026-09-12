import { Router } from 'express';
import {
  createDraft,
  listContent,
  getContent,
  updateContent,
  approveContent,
  rejectContent,
  generateContent,
} from '../controllers/contentController';
import { validate } from '../middleware/validation';
import { createDraftSchema, updateContentSchema, generateContentSchema } from '../schemas/apiSchemas';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.post('/content', validate(createDraftSchema), createDraft);
router.get('/content', listContent);
router.get('/content/:id', getContent);
router.patch('/content/:id', validate(updateContentSchema), updateContent);
router.post('/content/:id/approve', approveContent);
router.post('/content/:id/reject', rejectContent);
router.post('/content/generate', validate(generateContentSchema), generateContent);

export default router;
