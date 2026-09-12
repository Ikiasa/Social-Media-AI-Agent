import { Router, Request, Response } from 'express';
import { InstagramAuditService } from '../services/InstagramAuditService';

const router = Router();

// POST /api/v1/instagram/audit
router.post('/audit', async (req: Request, res: Response) => {
  try {
    const { handle } = req.body;
    const auditData = await InstagramAuditService.auditAccount(handle || '@acme_brand');
    res.json({
      success: true,
      data: auditData,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

export default router;
