import { WorkspaceContext } from '../../../../packages/core/src/context';
import { AuthorizationError, ValidationError } from '../../../../packages/core/src/errors';
import {
  CreativeAssetModel,
  CreativeAssetVersionModel,
  ContentModel,
  ICreativeAsset,
  ICreativeAssetVersion,
  AssetType,
  UsageRights,
} from '../../../../packages/database/src';
import { tenantFeatureFlags } from './TenantFeatureFlagService';
import { eventBus } from './EventBusService';
import { costObservabilityService } from './CostObservabilityService';

export const EMPTY_SHA256_HASH = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

export interface CreateAssetInput {
  brandId: string;
  campaignId?: string;
  name: string;
  assetType: AssetType;
  usageRights?: UsageRights;
  rightsNotes?: string;
  tags?: string[];
  mimeType: string;
  fileSizeBytes: number;
  checksum: string;
  storageReference: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
}

export function verifySignedUrlToken(token: string): { workspaceId: string; targetId: string; version?: number; expiresAt: Date } {
  if (!token) {
    throw new AuthorizationError('Signed URL token is required.');
  }
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const parts = decoded.split(':');
    if (parts.length < 3) {
      throw new AuthorizationError('Invalid signed URL token format.');
    }
    const workspaceId = parts[0];
    const targetId = parts[1];
    const expiresAtMs = parseInt(parts[parts.length - 1], 10);
    const expiresAt = new Date(expiresAtMs);

    if (Date.now() > expiresAtMs) {
      throw new AuthorizationError('Signed export URL has expired.');
    }

    return { workspaceId, targetId, expiresAt };
  } catch (err: any) {
    if (err instanceof AuthorizationError) throw err;
    throw new AuthorizationError('Invalid or expired signed URL token.');
  }
}

export class CreativeAssetService {
  /**
   * Upload / Create a new Creative Asset & Version 1 with Idempotency, Name Ambiguity Guard & Checksum validation
   */
  async createAsset(ctx: WorkspaceContext, input: CreateAssetInput): Promise<{ asset: ICreativeAsset; version: ICreativeAssetVersion }> {
    if (!ctx.workspaceId || !ctx.userId) {
      throw new AuthorizationError('Workspace & User context required.');
    }

    if (!tenantFeatureFlags.isFeatureEnabled(ctx.workspaceId, 'creativeAssetPipeline')) {
      throw new AuthorizationError('Feature "creativeAssetPipeline" is disabled for this tenant.');
    }

    if (!input.brandId || !input.name || !input.checksum || !input.storageReference) {
      throw new ValidationError('brandId, name, checksum, and storageReference are required.');
    }

    // 1. NON-EMPTY FILE EMPTY HASH GUARD: Non-empty file (fileSizeBytes > 0) MUST NOT use empty string SHA-256 hash
    if (input.fileSizeBytes > 0 && input.checksum.toLowerCase() === EMPTY_SHA256_HASH) {
      throw new ValidationError('INVALID_CHECKSUM: Non-empty file cannot use empty payload SHA-256 hash (e3b0c44298fc...).');
    }

    // 2. Idempotency Check via Checksum
    const existingVersion = await CreativeAssetVersionModel.findOne({
      workspaceId: ctx.workspaceId,
      brandId: input.brandId,
      checksum: input.checksum,
    }).exec();

    if (existingVersion) {
      const existingAsset = await CreativeAssetModel.findById(existingVersion.assetId).exec();
      if (existingAsset) {
        return { asset: existingAsset, version: existingVersion };
      }
    }

    // 3. Malware / Dangerous File Sanity Guard
    const dangerousExtensions = ['.exe', '.sh', '.bat', '.cmd', '.dll', '.scr', '.vbs'];
    if (dangerousExtensions.some((ext) => input.name.toLowerCase().endsWith(ext))) {
      throw new ValidationError('File extension is blacklisted due to security policy.');
    }

    // 4. Asset Name Ambiguity Guard: If an asset with exact name already exists in this brand, append new version instead of creating ambiguous duplicate header
    let asset = await CreativeAssetModel.findOne({
      workspaceId: ctx.workspaceId,
      brandId: input.brandId,
      name: input.name,
    }).exec();

    if (asset) {
      return this.createNewVersion(ctx, String(asset._id), {
        campaignId: input.campaignId,
        usageRights: input.usageRights,
        rightsNotes: input.rightsNotes,
        tags: input.tags,
        mimeType: input.mimeType,
        fileSizeBytes: input.fileSizeBytes,
        checksum: input.checksum,
        storageReference: input.storageReference,
        width: input.width,
        height: input.height,
        durationSeconds: input.durationSeconds,
      });
    }

    // Create Asset Header Record
    asset = await CreativeAssetModel.create({
      workspaceId: ctx.workspaceId,
      brandId: input.brandId,
      campaignId: input.campaignId,
      name: input.name,
      assetType: input.assetType,
      status: 'PROCESSING',
      currentVersion: 1,
      tags: input.tags || [],
      usageRights: input.usageRights || 'owned',
      rightsNotes: input.rightsNotes,
      createdBy: ctx.userId,
    });

    // Create Asset Version 1 Record
    const assetVersion = await CreativeAssetVersionModel.create({
      workspaceId: ctx.workspaceId,
      brandId: input.brandId,
      assetId: String(asset._id),
      version: 1,
      storageReference: input.storageReference,
      mimeType: input.mimeType,
      fileSizeBytes: input.fileSizeBytes,
      checksum: input.checksum,
      width: input.width,
      height: input.height,
      durationSeconds: input.durationSeconds,
      processingStatus: 'PENDING',
      derivatives: [],
      createdBy: ctx.userId,
    });

    eventBus.publishEvent('asset.uploaded', {
      workspaceId: ctx.workspaceId,
      brandId: input.brandId,
      assetId: String(asset._id),
      version: 1,
    });

    costObservabilityService.recordUsage(ctx.workspaceId, 'CreativeAssetService', 10, 5, input.brandId);

    return { asset, version: assetVersion };
  }

  /**
   * Add a new version to an existing asset.
   * CRITICAL SECURITY & COMPLIANCE GUARD:
   * If this asset is linked to an approved Content item, updating the asset MUST invalidate the content approval!
   */
  async createNewVersion(
    ctx: WorkspaceContext,
    assetId: string,
    input: Omit<CreateAssetInput, 'brandId' | 'name' | 'assetType'>
  ): Promise<{ asset: ICreativeAsset; version: ICreativeAssetVersion }> {
    if (!ctx.workspaceId || !ctx.userId) {
      throw new AuthorizationError('Workspace & User context required.');
    }

    if (input.fileSizeBytes > 0 && input.checksum.toLowerCase() === EMPTY_SHA256_HASH) {
      throw new ValidationError('INVALID_CHECKSUM: Non-empty file cannot use empty payload SHA-256 hash (e3b0c44298fc...).');
    }

    const asset = await CreativeAssetModel.findOne({
      _id: assetId,
      workspaceId: ctx.workspaceId,
    }).exec();

    if (!asset) {
      throw new ValidationError(`Creative asset ${assetId} not found in current workspace.`);
    }

    const nextVersionNum = asset.currentVersion + 1;

    // Create New Immutable Version Record
    const newVersion = await CreativeAssetVersionModel.create({
      workspaceId: ctx.workspaceId,
      brandId: asset.brandId,
      assetId: String(asset._id),
      version: nextVersionNum,
      storageReference: input.storageReference,
      mimeType: input.mimeType,
      fileSizeBytes: input.fileSizeBytes,
      checksum: input.checksum,
      width: input.width,
      height: input.height,
      durationSeconds: input.durationSeconds,
      processingStatus: 'PENDING',
      derivatives: [],
      createdBy: ctx.userId,
    });

    // Update Asset Current Version & Status
    asset.currentVersion = nextVersionNum;
    asset.status = 'PROCESSING';
    await asset.save();

    // INVALIDATE CONTENT APPROVAL if any approved Content uses this asset
    const linkedContents = await ContentModel.find({
      workspaceId: ctx.workspaceId,
      media: String(asset._id),
      status: 'APPROVED',
    }).exec();

    for (const content of linkedContents) {
      content.status = 'REVISION_REQUESTED';
      content.approvalInvalidatedAt = new Date();
      content.approvalInvalidationReason = `Attached creative asset ${asset.name} was updated to version ${nextVersionNum}. Approval invalidated.`;
      content.approvalSignature = undefined;
      content.contentVersion = content.contentVersion + 1;
      await content.save();

      eventBus.publishEvent('content.approval_invalidated', {
        workspaceId: ctx.workspaceId,
        contentId: String(content._id),
        reason: content.approvalInvalidationReason,
      });
    }

    eventBus.publishEvent('asset.version_created', {
      workspaceId: ctx.workspaceId,
      brandId: asset.brandId,
      assetId: String(asset._id),
      version: nextVersionNum,
    });

    return { asset, version: newVersion };
  }

  /**
   * Generate Short-Lived Signed Download URL with Authorization Checks
   */
  async generateSignedDownloadUrl(ctx: WorkspaceContext, assetId: string, versionNum?: number): Promise<{ downloadUrl: string; expiresAt: Date }> {
    if (!ctx.workspaceId || !ctx.userId) {
      throw new AuthorizationError('Workspace & User context required.');
    }

    const asset = await CreativeAssetModel.findOne({
      _id: assetId,
      workspaceId: ctx.workspaceId,
    }).exec();

    if (!asset) {
      throw new ValidationError(`Creative asset ${assetId} not found.`);
    }

    const targetVersion = versionNum || asset.currentVersion;
    const versionRecord = await CreativeAssetVersionModel.findOne({
      workspaceId: ctx.workspaceId,
      assetId,
      version: targetVersion,
    }).exec();

    if (!versionRecord) {
      throw new ValidationError(`Asset version ${targetVersion} not found.`);
    }

    // Generate simulated secure signed URL expiring in 15 minutes
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const token = Buffer.from(`${ctx.workspaceId}:${assetId}:${targetVersion}:${expiresAt.getTime()}`).toString('base64url');
    const downloadUrl = `https://cdn.riona.ai/assets/${versionRecord.storageReference}?token=${token}`;

    return { downloadUrl, expiresAt };
  }
}
