import { Router, Response, NextFunction } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { CompetitorTrendRadarService } from '../services/CompetitorTrendRadarService';
import { CampaignService } from '../services/CampaignService';

const router = Router();
const competitorService = new CompetitorTrendRadarService();
const campaignService = new CampaignService();

router.use(authMiddleware);

// 1. Create Competitor Watchlist Item
router.post('/watchlist', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const item = await competitorService.createWatchlist(req.context!, req.body);
    res.status(201).json({ data: item, message: 'Competitor watchlist item created successfully.' });
  } catch (err) {
    next(err);
  }
});

// 2. List Watchlist Items
router.get('/watchlist', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const brandId = req.query.brandId as string | undefined;
    const items = await competitorService.listWatchlist(req.context!, brandId);
    res.status(200).json({ data: items, meta: { total: items.length } });
  } catch (err) {
    next(err);
  }
});

// 3. Delete Watchlist Item
router.delete('/watchlist/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await competitorService.deleteWatchlist(req.context!, req.params.id);
    res.status(200).json({ message: 'Competitor watchlist item deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

// 4. Ingest Competitor Snapshot
router.post('/snapshots', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const snapshot = await competitorService.recordSnapshot(req.context!, req.body);
    res.status(201).json({ data: snapshot, message: 'Competitor snapshot recorded successfully.' });
  } catch (err) {
    next(err);
  }
});

// 5. List Competitor Snapshots
router.get('/snapshots', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const brandId = req.query.brandId as string | undefined;
    const competitorId = req.query.competitorId as string | undefined;
    const snapshots = await competitorService.listSnapshots(req.context!, brandId, competitorId);
    res.status(200).json({ data: snapshots, meta: { total: snapshots.length } });
  } catch (err) {
    next(err);
  }
});

// 6. List Trend Signals
router.get('/signals', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const brandId = req.query.brandId as string | undefined;
    const platform = req.query.platform as string | undefined;
    const status = req.query.status as string | undefined;
    const signals = await competitorService.listSignals(req.context!, brandId, platform, status);
    res.status(200).json({ data: signals, meta: { total: signals.length } });
  } catch (err) {
    next(err);
  }
});

// 7. Action Signal
router.post('/signals/:id/action', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const signal = await competitorService.actionSignal(req.context!, req.params.id);
    res.status(200).json({ data: signal, message: 'Trend signal marked as actioned.' });
  } catch (err) {
    next(err);
  }
});

// 8. Dismiss Signal
router.post('/signals/:id/dismiss', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const signal = await competitorService.dismissSignal(req.context!, req.params.id);
    res.status(200).json({ data: signal, message: 'Trend signal dismissed.' });
  } catch (err) {
    next(err);
  }
});

// 9. List Active Alerts
router.get('/alerts', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const brandId = req.query.brandId as string | undefined;
    const status = req.query.status as string | undefined;
    const alerts = await competitorService.listAlerts(req.context!, brandId, status);
    res.status(200).json({ data: alerts, meta: { total: alerts.length } });
  } catch (err) {
    next(err);
  }
});

// 10. Acknowledge Alert
router.post('/alerts/:id/acknowledge', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const alert = await competitorService.acknowledgeAlert(req.context!, req.params.id);
    res.status(200).json({ data: alert, message: 'Trend alert acknowledged.' });
  } catch (err) {
    next(err);
  }
});

// 11. Create Strategy Brief Draft based on Selected Trend Signal
// Note: This endpoint creates DRAFT campaign brief and draft content items.
// Does NOT publish any content automatically.
router.post('/strategy-brief', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { brandId, trendSignalId, signalLabel, productOffer, objective, targetAudience, periodDays, brandConstraints } = req.body;

    const plan = await campaignService.planCampaignStrategy(req.context!, {
      brandId,
      objective: objective || 'AWARENESS',
      platforms: ['instagram', 'linkedin', 'x'],
      targetAudience: targetAudience || 'Target Audience',
      periodDays: periodDays || 14,
      productOffer: productOffer || 'Produk Baru berbasis Tren',
      trendSignals: [{ label: signalLabel || 'Selected Trend Signal', topic: signalLabel }],
      brandConstraints,
    });

    res.status(201).json({
      data: plan,
      message: 'Strategy brief and draft contents created successfully (DRAFT status - requires approval).',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
