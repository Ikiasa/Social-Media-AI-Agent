import { Router } from 'express';
import { createBrand, getBrand, updateBrand } from '../controllers/brandController';
import { validate } from '../middleware/validation';
import { createBrandSchema, updateBrandSchema } from '../schemas/apiSchemas';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.post('/brands', validate(createBrandSchema), createBrand);
router.get('/brands/:id', getBrand);
router.patch('/brands/:id', validate(updateBrandSchema), updateBrand);

router.post('/brands/:id/accounts/login-platform', async (req, res) => {
  try {
    const { platform, username, password, sessionCookieJson } = req.body;
    const { SocialAuthManager } = await import('../../../../src/platforms/socialAuthManager');
    const result = await SocialAuthManager.loginAndCaptureSession({
      platform,
      username,
      password,
      sessionCookieJson,
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: { message: err.message } });
  }
});

router.post('/brands/:id/accounts/verify-session', async (req, res) => {
  try {
    const { platform, username } = req.body;
    const { SocialAuthManager } = await import('../../../../src/platforms/socialAuthManager');
    const result = SocialAuthManager.verifySessionStatus(platform, username);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: { message: err.message } });
  }
});

router.post('/brands/:id/accounts/delete', async (req, res) => {
  try {
    const { platform, username } = req.body;
    const { SocialAuthManager } = await import('../../../../src/platforms/socialAuthManager');
    const result = SocialAuthManager.deleteSession(platform, username);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// Multi-Tenant Brand Isolation & Proxy Endpoints
router.get('/brands/:id/proxy', async (req, res) => {
  try {
    const { ProxyManagerService } = await import('../services/ProxyManagerService');
    const proxy = ProxyManagerService.getBrandProxy(req.params.id);
    res.json({ success: true, data: proxy });
  } catch (err: any) {
    res.status(500).json({ error: { message: err.message } });
  }
});

router.post('/brands/:id/proxy/config', async (req, res) => {
  try {
    const { ProxyManagerService } = await import('../services/ProxyManagerService');
    const updated = await ProxyManagerService.configureBrandProxy(req.params.id, req.body);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ error: { message: err.message } });
  }
});

router.post('/brands/:id/proxy/test', async (req, res) => {
  try {
    const { ProxyManagerService } = await import('../services/ProxyManagerService');
    const testResult = await ProxyManagerService.testProxyConnection(req.params.id);
    res.json({ success: true, data: testResult });
  } catch (err: any) {
    res.status(500).json({ error: { message: err.message } });
  }
});

router.post('/brands/:id/proxy/rotate', async (req, res) => {
  try {
    const { ProxyManagerService } = await import('../services/ProxyManagerService');
    const rotated = await ProxyManagerService.rotateBrandProxy(req.params.id);
    res.json({ success: true, data: rotated });
  } catch (err: any) {
    res.status(500).json({ error: { message: err.message } });
  }
});

export default router;


