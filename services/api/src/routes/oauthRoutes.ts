import { Router } from 'express';
import { connectInstagramOAuth, instagramOAuthCallback } from '../controllers/oauthController';

const router = Router();

router.get('/oauth/instagram/connect', connectInstagramOAuth);
router.get('/oauth/instagram/callback', instagramOAuthCallback);

export default router;
