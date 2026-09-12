import { Router, Response, NextFunction } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { socialListeningGatewayService } from '../services/social-listening/SocialListeningGatewayService';
import { connectorRegistry } from '../services/social-listening/ConnectorRegistry';
import { UserImportConnector } from '../services/social-listening/connectors/UserImportConnector';
import { SandboxFixtureConnector } from '../services/social-listening/connectors/SandboxFixtureConnector';
import { ValidationError, AuthorizationError } from '../../../../packages/core/src/errors';

const router = Router();

// Readiness & Health check (Internal / Public status)
router.get('/health/readiness', async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const connectors = connectorRegistry.listConnectors();
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      registeredConnectorsCount: connectors.length,
      connectors: connectors.map((c) => ({
        provider: c.provider,
        sourceType: c.sourceType,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// Unauthenticated Webhook Receiver with HMAC Signature Verification
router.post('/webhooks/:provider', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const correlationId = `wh_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  try {
    const { provider } = req.params;
    const connector = connectorRegistry.getConnector(provider);
    if (!connector || !connector.ingestWebhook) {
      throw new ValidationError(`Provider ${provider} does not support webhook ingestion.`);
    }

    const secret = process.env.WEBHOOK_SECRET || 'dev_webhook_secret_key';
    const rawBody = req.body instanceof Buffer ? req.body : Buffer.from(JSON.stringify(req.body || {}));
    const headers = (req.headers || {}) as Record<string, string>;

    const isValid = socialListeningGatewayService.verifyWebhookSignature(rawBody, headers, secret);
    if (!isValid) {
      res.status(401).json({
        error: {
          code: 'INVALID_SIGNATURE',
          message: 'Webhook signature verification failed or timestamp expired.',
          correlationId,
        },
      });
      return;
    }

    const records = await connector.ingestWebhook(rawBody, headers);
    let ingestedCount = 0;
    let duplicateCount = 0;

    for (const rec of records) {
      const result = await socialListeningGatewayService.ingestRecord(rec, correlationId);
      if (result.status === 'PROCESSED') ingestedCount++;
      if (result.status === 'DUPLICATE') duplicateCount++;
    }

    res.status(200).json({
      status: 'SUCCESS',
      correlationId,
      ingestedCount,
      duplicateCount,
    });
  } catch (err) {
    next(err);
  }
});

// Require Auth Middleware for management & data retrieval endpoints
router.use(authMiddleware);

// 1. Get Connections
router.get('/connections', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const brandId = req.query.brandId as string | undefined;
    const connections = await socialListeningGatewayService.listConnections(req.context!.workspaceId, brandId);
    res.status(200).json({ data: connections, meta: { total: connections.length } });
  } catch (err) {
    next(err);
  }
});

// 2. Create Connection
router.post('/connections', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const ctx = req.context;
    if (!ctx || !ctx.workspaceId || !ctx.brandId) {
      throw new ValidationError('WorkspaceId and BrandId are required context fields.');
    }
    const connection = await socialListeningGatewayService.createConnection(
      { workspaceId: ctx.workspaceId, brandId: ctx.brandId },
      req.body
    );
    res.status(201).json({ data: connection, message: 'Provider connection created successfully.' });
  } catch (err) {
    next(err);
  }
});

// 3. Health Check
router.get('/connections/:id/health', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const correlationId = (req.headers['x-correlation-id'] as string) || `h_${Date.now()}`;
    const health = await socialListeningGatewayService.checkHealth(req.params.id, {
      workspaceId: req.context!.workspaceId,
      brandId: (req.query.brandId as string) || req.context!.brandId || 'b_default',
      requestedBy: req.context!.userId,
      correlationId,
    });
    res.status(200).json({ data: health });
  } catch (err) {
    next(err);
  }
});

// 4. Manual Sync Trigger
router.post('/connections/:id/sync', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const correlationId = (req.headers['x-correlation-id'] as string) || `sync_${Date.now()}`;
    const brandId = req.body.brandId || req.context!.brandId || 'b_default';

    const result = await socialListeningGatewayService.syncConnection(req.params.id, {
      workspaceId: req.context!.workspaceId,
      brandId,
      requestedBy: req.context!.userId,
      correlationId,
      providerConnectionId: req.params.id,
    });

    res.status(200).json({
      status: 'SUCCESS',
      correlationId,
      syncedCount: result.syncedCount,
      duplicateCount: result.duplicateCount,
    });
  } catch (err) {
    next(err);
  }
});

// 5. List Provider Capabilities
router.get('/capabilities', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const connectors = connectorRegistry.listConnectors(req.context!.workspaceId);
    const capabilities = connectors.map((c) => ({
      provider: c.provider,
      sourceType: c.sourceType,
      hasWebhook: Boolean(c.ingestWebhook),
      hasPosts: Boolean(c.fetchPosts),
    }));

    res.status(200).json({ data: capabilities });
  } catch (err) {
    next(err);
  }
});

// 6. User Data Import (CSV / JSON)
router.post('/import', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const correlationId = (req.headers['x-correlation-id'] as string) || `imp_${Date.now()}`;
    const { brandId, rows, payloadSizeBytes } = req.body;

    if (!brandId) {
      throw new ValidationError('brandId is required for user data import.');
    }

    const connector = connectorRegistry.getConnector('user_import', req.context!.workspaceId) as UserImportConnector;
    if (!connector) {
      throw new ValidationError('User import connector is not available.');
    }

    const records = connector.processImportPayload(
      {
        workspaceId: req.context!.workspaceId,
        brandId,
        requestedBy: req.context!.userId,
        correlationId,
      },
      rows,
      payloadSizeBytes
    );

    let ingestedCount = 0;
    let duplicateCount = 0;

    for (const rec of records) {
      const result = await socialListeningGatewayService.ingestRecord(rec, correlationId);
      if (result.status === 'PROCESSED') ingestedCount++;
      if (result.status === 'DUPLICATE') duplicateCount++;
    }

    res.status(200).json({
      status: 'SUCCESS',
      correlationId,
      importedRecordsCount: records.length,
      ingestedCount,
      duplicateCount,
    });
  } catch (err) {
    next(err);
  }
});

// 7. List Ingestion Records
router.get('/ingestions', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const brandId = req.query.brandId as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

    const records = await socialListeningGatewayService.listIngestions(
      req.context!.workspaceId,
      brandId,
      limit
    );

    res.status(200).json({ data: records, meta: { total: records.length } });
  } catch (err) {
    next(err);
  }
});

// 8. Get Single Ingestion Record
router.get('/ingestions/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const record = await socialListeningGatewayService.getIngestionById(
      req.context!.workspaceId,
      req.params.id
    );

    if (!record) {
      throw new ValidationError(`SocialDataIngestionRecord ${req.params.id} not found.`);
    }

    res.status(200).json({ data: record });
  } catch (err) {
    next(err);
  }
});

// 9. Sandbox Seed (Dev / Test Environment Only)
router.post('/sandbox/seed', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      throw new AuthorizationError('Sandbox seed endpoint is disabled in production environment.');
    }

    const correlationId = (req.headers['x-correlation-id'] as string) || `sb_${Date.now()}`;
    const brandId = req.body.brandId || req.context!.brandId || 'b_sandbox';

    const connector = connectorRegistry.getConnector('sandbox_fixture', req.context!.workspaceId) as SandboxFixtureConnector;
    if (!connector) {
      throw new ValidationError('Sandbox fixture connector not found.');
    }

    const context = {
      workspaceId: req.context!.workspaceId,
      brandId,
      requestedBy: req.context!.userId,
      correlationId,
    };

    const metrics = await connector.fetchMetrics(context, {});
    const posts = await connector.fetchPosts(context, {});
    const records = [...metrics, ...posts];

    let ingestedCount = 0;
    let duplicateCount = 0;

    for (const rec of records) {
      const resVal = await socialListeningGatewayService.ingestRecord(rec, correlationId);
      if (resVal.status === 'PROCESSED') ingestedCount++;
      if (resVal.status === 'DUPLICATE') duplicateCount++;
    }

    res.status(201).json({
      status: 'SUCCESS',
      correlationId,
      source: 'sandbox_fixture',
      seededCount: records.length,
      ingestedCount,
      duplicateCount,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
