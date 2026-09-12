import { Router, Response, NextFunction } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { CampaignService } from '../services/CampaignService';
import { AttributionService } from '../services/AttributionService';

const router = Router();
const campaignService = new CampaignService();
const attributionService = new AttributionService();

router.use(authMiddleware);

// 1. Create Campaign
router.post('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const campaign = await campaignService.createCampaign(req.context!, req.body);
    res.status(201).json({ data: campaign, message: 'Campaign created successfully.' });
  } catch (err) {
    next(err);
  }
});

// 2. List Campaigns
router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const brandId = req.query.brandId as string | undefined;
    const campaigns = await campaignService.listCampaigns(req.context!, brandId);
    res.status(200).json({ data: campaigns, meta: { total: campaigns.length } });
  } catch (err) {
    next(err);
  }
});

// 3. Get Campaign Details & Actual vs Target KPIs
router.get('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const brandId = req.query.brandId as string | undefined;
    const details = await campaignService.getCampaignDetails(req.context!, req.params.id, brandId);
    res.status(200).json({ data: details });
  } catch (err) {
    next(err);
  }
});

// 4. Strategy Agent AI Planning
router.post('/plan-strategy', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const plan = await campaignService.planCampaignStrategy(req.context!, req.body);
    res.status(201).json({ data: plan, message: 'Campaign strategy and draft contents generated successfully.' });
  } catch (err) {
    next(err);
  }
});

// 5. Ingest Attribution Event
router.post('/events', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const eventRecord = await attributionService.recordEvent(req.context!, req.body);
    res.status(201).json({ data: eventRecord, message: 'Attribution event ingested successfully.' });
  } catch (err) {
    next(err);
  }
});

// 6. Get Performance Attribution Report (Last-Touch Model)
router.get('/:id/attribution-report', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const brandId = req.query.brandId as string;
    const model = (req.query.model as any) || 'last_touch';
    const report = await attributionService.getAttributionReport(req.context!, brandId, req.params.id, model);
    res.status(200).json({ data: report });
  } catch (err) {
    next(err);
  }
});

export default router;
