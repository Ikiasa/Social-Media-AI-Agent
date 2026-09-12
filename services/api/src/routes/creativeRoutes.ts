import { Router, Response, NextFunction } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { CreativeAssetService } from '../services/CreativeAssetService';
import { MediaProcessingWorker } from '../services/MediaProcessingWorker';
import { CreativeWorkflowService } from '../services/CreativeWorkflowService';
import { CapacityPlanningService } from '../services/CapacityPlanningService';
import { SLAService } from '../services/SLAService';
import { ClientReportService } from '../services/ClientReportService';
import {
  CreativeAssetModel,
  CreativeBriefModel,
  CreativeTaskModel,
  ClientReportModel,
} from '../../../../packages/database/src';
import { ValidationError } from '../../../../packages/core/src';

const router = Router();
const assetService = new CreativeAssetService();
const mediaWorker = new MediaProcessingWorker();
const workflowService = new CreativeWorkflowService();
const capacityService = new CapacityPlanningService();
const slaService = new SLAService();
const reportService = new ClientReportService();

// Require Authentication for all endpoints
router.use(authMiddleware);

// 1. Creative Asset Upload / Create
router.post('/assets', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await assetService.createAsset(req.context!, req.body);
    res.status(201).json({ data: result, message: 'Creative asset created successfully.' });
  } catch (err) {
    next(err);
  }
});

// 2. Add Asset Version (triggers approval invalidation on linked approved content)
router.post('/assets/:id/versions', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await assetService.createNewVersion(req.context!, req.params.id, req.body);
    res.status(201).json({ data: result, message: 'New asset version created. Content approval invalidated if linked.' });
  } catch (err) {
    next(err);
  }
});

// 3. List Creative Assets
router.get('/assets', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const brandId = req.query.brandId as string | undefined;
    const query: Record<string, unknown> = { workspaceId: req.context!.workspaceId };
    if (brandId) query.brandId = brandId;

    const assets = await CreativeAssetModel.find(query).sort({ createdAt: -1 }).exec();
    res.status(200).json({ data: assets, meta: { total: assets.length } });
  } catch (err) {
    next(err);
  }
});

// 4. Generate Signed Download URL
router.get('/assets/:id/download-url', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const versionNum = req.query.version ? parseInt(req.query.version as string, 10) : undefined;
    const result = await assetService.generateSignedDownloadUrl(req.context!, req.params.id, versionNum);
    res.status(200).json({ data: result, message: 'Signed download URL generated.' });
  } catch (err) {
    next(err);
  }
});

// 5. Trigger Non-Destructive Derivative Processing
router.post('/assets/:id/process-derivatives', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const versionNum = req.body.version || 1;
    const result = await mediaWorker.processAssetDerivatives(req.context!, req.params.id, versionNum);
    res.status(200).json({ data: result, message: 'Platform derivatives processed successfully.' });
  } catch (err) {
    next(err);
  }
});

// 6. Create Creative Brief
router.post('/briefs', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const brief = await workflowService.createBrief(req.context!, req.body);
    res.status(201).json({ data: brief, message: 'Creative brief created successfully.' });
  } catch (err) {
    next(err);
  }
});

// 7. List Creative Briefs
router.get('/briefs', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const brandId = req.query.brandId as string | undefined;
    const query: Record<string, unknown> = { workspaceId: req.context!.workspaceId };
    if (brandId) query.brandId = brandId;

    const briefs = await CreativeBriefModel.find(query).sort({ createdAt: -1 }).exec();
    res.status(200).json({ data: briefs, meta: { total: briefs.length } });
  } catch (err) {
    next(err);
  }
});

// 8. Create Creative Task (with Cross-Tenant Assignee Guard)
router.post('/tasks', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const task = await workflowService.createTask(req.context!, req.body);
    res.status(201).json({ data: task, message: 'Creative task created and assigned successfully.' });
  } catch (err) {
    next(err);
  }
});

// 9. Update Task Status
router.post('/tasks/:id/status', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { status, actualMinutes } = req.body;
    const task = await workflowService.updateTaskStatus(req.context!, req.params.id, status, actualMinutes);
    res.status(200).json({ data: task, message: 'Creative task status updated.' });
  } catch (err) {
    next(err);
  }
});

// 10. Capacity & Workload Summary
router.get('/capacity/summary', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const brandId = req.query.brandId as string | undefined;
    const summary = await capacityService.getWorkspaceCapacitySummary(req.context!, brandId);
    res.status(200).json({ data: summary });
  } catch (err) {
    next(err);
  }
});

// 11. Set SLA Policy
router.post('/sla/policy', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const policy = await slaService.setSLAPolicy(req.context!, req.body);
    res.status(200).json({ data: policy, message: 'SLA policy saved successfully.' });
  } catch (err) {
    next(err);
  }
});

// 12. Start SLA Event
router.post('/sla/start-event', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { brandId, targetType, targetId, assigneeId } = req.body;
    const event = await slaService.startSLAEvent(req.context!, brandId, targetType, targetId, assigneeId);
    res.status(201).json({ data: event, message: 'SLA tracking started.' });
  } catch (err) {
    next(err);
  }
});

// 13. Generate White-Label Client Report Draft
router.post('/reports/drafts', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const report = await reportService.generateReportDraft(req.context!, req.body);
    res.status(201).json({ data: report, message: 'Client report draft generated successfully.' });
  } catch (err) {
    next(err);
  }
});

// 14. Export Client Report
router.post('/reports/:id/export', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await reportService.exportReport(req.context!, req.params.id);
    res.status(200).json({ data: result, message: 'Report exported with secure URL.' });
  } catch (err) {
    next(err);
  }
});

export default router;
