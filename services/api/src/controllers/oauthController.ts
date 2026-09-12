import { Request, Response, NextFunction } from 'express';
import { ProductionAuthRequest } from '../middleware/productionAuth';
import { getOAuthStateStore } from '../services/OAuthStateStore';
import { defaultOAuthProviderRegistry } from '../services/oauth/OAuthProvider';
import { SocialAccountModel } from '../../../../packages/database/src/models/SocialAccount';
import { encryptToken } from '../../../../packages/core/src/crypto';
import { ValidationError } from '../../../../packages/core/src/errors';
import { SocialPlatform } from '../../../../packages/social/src/publisher';

export async function connectInstagramOAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as unknown as ProductionAuthRequest;
    const workspaceId = authReq.context!.workspaceId;
    const userId = authReq.user!.id;
    const brandId = req.query.brandId as string | undefined;

    const nonceStore = getOAuthStateStore();
    const { state } = await nonceStore.createNonce(userId, workspaceId, brandId);

    const redirectUri = process.env.INSTAGRAM_REDIRECT_URI || 'http://localhost:3000/api/oauth/instagram/callback';
    const provider = defaultOAuthProviderRegistry.get('instagram');
    const authUrl = provider.getAuthorizationUrl(state, redirectUri);

    res.status(200).json({ data: { authUrl, state } });
  } catch (err) {
    next(err);
  }
}

export async function instagramOAuthCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as unknown as ProductionAuthRequest;
    const code = req.query.code;
    const state = req.query.state;
    const initiatingUserId = authReq.user?.id;

    if (!code || typeof code !== 'string') {
      throw new ValidationError('Missing OAuth authorization code.');
    }

    const nonceStore = getOAuthStateStore();
    const validatedState = await nonceStore.consumeAndValidateState(state as string, initiatingUserId);

    const workspaceId = validatedState.workspaceId;
    const brandId = validatedState.brandId;
    const redirectUri = process.env.INSTAGRAM_REDIRECT_URI || 'http://localhost:3000/api/oauth/instagram/callback';

    // Delegate exchange to platform OAuthProvider
    const provider = defaultOAuthProviderRegistry.get('instagram');
    const oauthAccount = await provider.exchangeCodeForAccount(code, redirectUri);

    // Encrypt token before persisting at rest
    const encryptedAccessToken = encryptToken(oauthAccount.accessToken);

    if (!oauthAccount.platformAccountId) {
      throw new ValidationError('OAuth provider response did not return a valid platformAccountId.');
    }

    const account = await SocialAccountModel.findOneAndUpdate(
      { workspaceId, platform: 'instagram', username: oauthAccount.username },
      {
        $set: {
          workspaceId,
          brandId,
          platform: 'instagram',
          platformAccountId: oauthAccount.platformAccountId,
          username: oauthAccount.username,
          encryptedAccessToken,
          tokenExpiresAt: oauthAccount.tokenExpiresAt || new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
          status: 'CONNECTED',
          connectedAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    res.status(200).json({
      data: {
        status: 'CONNECTED',
        account: {
          id: String(account._id),
          workspaceId: account.workspaceId,
          username: account.username,
          platform: account.platform,
          status: account.status,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}
