import { Router, Response, NextFunction } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { ApprovalWorkflowService } from '../services/ApprovalWorkflowService';
import { ContentService } from '../services/ContentService';

const router = Router();
const approvalService = new ApprovalWorkflowService();
const contentService = new ContentService();

router.use(authMiddleware);

// Get pending approval items for current workspace/brand
router.get('/pending', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const role = (req.query.role as string) || 'all';
    const statusFilter =
      role === 'strategist'
        ? 'PENDING_STRATEGIST_REVIEW'
        : role === 'client'
        ? 'PENDING_CLIENT_REVIEW'
        : undefined;

    const items = await contentService.listContent(req.context!, statusFilter as any);
    res.status(200).json({ data: items, meta: { total: items.length, filterRole: role } });
  } catch (err) {
    next(err);
  }
});

// Submit content for strategist review (Writer -> Strategist)
router.post('/:id/submit', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { notes } = req.body;
    const item = await approvalService.submitForStrategistReview(req.context!, req.params.id, notes);
    res.status(200).json({ data: item, message: 'Content submitted for strategist review successfully.' });
  } catch (err) {
    next(err);
  }
});

// Strategist review decision (Strategist -> Client or Revision)
router.post('/:id/strategist-review', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { action, notes } = req.body; // action: 'approve' | 'request_revision' | 'reject'
    const item = await approvalService.strategistReview(req.context!, req.params.id, action, notes);
    res.status(200).json({ data: item, message: `Strategist review completed: ${action}.` });
  } catch (err) {
    next(err);
  }
});

// Client review decision (Client -> APPROVED or Revision/Reject)
router.post('/:id/client-decision', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { action, clientName, notes } = req.body; // action: 'approve' | 'request_revision' | 'reject'
    const name = clientName || 'Client Reviewer';
    const item = await approvalService.clientDecision(req.context!, req.params.id, action, name, notes);
    res.status(200).json({ data: item, message: `Client decision recorded: ${action}.` });
  } catch (err) {
    next(err);
  }
});

// Add comment/feedback thread to content item
router.post('/:id/comments', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { authorName, authorRole, comment } = req.body;
    const comments = await approvalService.addComment(
      req.context!,
      req.params.id,
      authorName || 'User',
      authorRole || 'client',
      comment
    );
    res.status(200).json({ data: comments, message: 'Comment added successfully.' });
  } catch (err) {
    next(err);
  }
});

export default router;
