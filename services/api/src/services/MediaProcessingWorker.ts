import { WorkspaceContext } from '../../../../packages/core/src/context';
import { AuthorizationError, ValidationError } from '../../../../packages/core/src/errors';
import {
  CreativeAssetModel,
  CreativeAssetVersionModel,
  ICreativeAssetVersion,
  AssetDerivative,
} from '../../../../packages/database/src';
import { eventBus } from './EventBusService';

export interface PlatformFormatConfig {
  platform: 'instagram' | 'tiktok' | 'linkedin' | 'x' | 'threads';
  targetAspect: '1:1' | '9:16' | '16:9' | '4:5';
  targetWidth: number;
  targetHeight: number;
}

export class MediaProcessingWorker {
  private platformSpecs: Record<string, PlatformFormatConfig> = {
    'instagram_feed': { platform: 'instagram', targetAspect: '1:1', targetWidth: 1080, targetHeight: 1080 },
    'instagram_story': { platform: 'instagram', targetAspect: '9:16', targetWidth: 1080, targetHeight: 1920 },
    'tiktok_video': { platform: 'tiktok', targetAspect: '9:16', targetWidth: 1080, targetHeight: 1920 },
    'linkedin_post': { platform: 'linkedin', targetAspect: '16:9', targetWidth: 1200, targetHeight: 627 },
    'x_post': { platform: 'x', targetAspect: '16:9', targetWidth: 1200, targetHeight: 675 },
  };

  /**
   * Asynchronously process media asset version into platform derivatives without mutating original file
   */
  async processAssetDerivatives(
    ctx: WorkspaceContext,
    assetId: string,
    versionNum: number
  ): Promise<ICreativeAssetVersion> {
    if (!ctx.workspaceId) {
      throw new AuthorizationError('Workspace context required.');
    }

    const versionRecord = await CreativeAssetVersionModel.findOne({
      workspaceId: ctx.workspaceId,
      assetId,
      version: versionNum,
    }).exec();

    if (!versionRecord) {
      throw new ValidationError(`Asset version ${versionNum} not found.`);
    }

    // Checksum Integrity Check: Reject empty payload hash on non-empty file
    if (versionRecord.fileSizeBytes > 0 && versionRecord.checksum.toLowerCase() === 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855') {
      versionRecord.processingStatus = 'FAILED';
      await versionRecord.save();
      throw new ValidationError('INVALID_WORKER_CHECKSUM: Worker rejected processing for non-empty file with empty string SHA-256 hash.');
    }

    const asset = await CreativeAssetModel.findOne({
      _id: assetId,
      workspaceId: ctx.workspaceId,
    }).exec();

    if (!asset) {
      throw new ValidationError(`Creative asset ${assetId} not found.`);
    }

    versionRecord.processingStatus = 'PROCESSING';
    await versionRecord.save();

    const derivatives: AssetDerivative[] = [];

    // Generate non-destructive derivative presets for configured platforms
    for (const [key, spec] of Object.entries(this.platformSpecs)) {
      const mime = versionRecord.mimeType || 'image/jpeg';
      const storageRef = `derivatives/${versionRecord.assetId}_v${versionRecord.version}_${key}.${mime.split('/')[1] || 'jpg'}`;
      derivatives.push({
        platform: spec.platform,
        width: spec.targetWidth,
        height: spec.targetHeight,
        storageReference: storageRef,
        format: spec.targetAspect,
        altText: `AI Draft Alt Text: ${asset.name} optimized for ${spec.platform} (${spec.targetAspect})`,
        createdAt: new Date(),
      });
    }

    // AI Vision Alt Text Draft for Original Asset
    const aiAltTextDraft = `Visual asset: ${asset.name} featuring ${asset.assetType} content for brand marketing campaign.`;

    versionRecord.derivatives = derivatives;
    versionRecord.altText = aiAltTextDraft;
    versionRecord.processingStatus = 'READY';
    await versionRecord.save();

    // Update Asset Header Status
    asset.status = 'READY';
    await asset.save();

    eventBus.publishEvent('asset.processing_completed', {
      workspaceId: ctx.workspaceId,
      brandId: asset.brandId,
      assetId,
      version: versionNum,
      derivativeCount: derivatives.length,
    });

    return versionRecord;
  }
}
