import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { ContentModel } from '../../../../packages/database/src/models/Content';
import { KnowledgeDocumentModel } from '../../../../packages/database/src/models/KnowledgeDocument';
import { ScheduledPostModel } from '../../../../packages/database/src/models/ScheduledPost';
import { AgentExecutionModel } from '../../../../packages/database/src/models/AgentExecution';
import { BrandModel } from '../../../../packages/database/src/models/Brand';

export async function getDashboardStats(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const workspaceId = req.context!.workspaceId;

    const [
      totalContent,
      draftContent,
      pendingApproval,
      scheduledContent,
      publishedContent,
      knowledgeDocs,
      recentExecutions,
      upcomingScheduled,
      brands,
    ] = await Promise.all([
      ContentModel.countDocuments({ workspaceId }),
      ContentModel.countDocuments({ workspaceId, status: 'DRAFT' }),
      ContentModel.countDocuments({ workspaceId, status: 'REVIEW' }),
      ScheduledPostModel.countDocuments({ workspaceId, status: 'SCHEDULED' }),
      ContentModel.countDocuments({ workspaceId, status: 'PUBLISHED' }),
      KnowledgeDocumentModel.countDocuments({ workspaceId, status: { $ne: 'DELETED' } }),
      AgentExecutionModel.find({ workspaceId }).sort({ createdAt: -1 }).limit(5).exec(),
      ScheduledPostModel.find({ workspaceId, status: 'SCHEDULED' }).sort({ scheduledAt: 1 }).limit(5).exec(),
      BrandModel.find({ workspaceId }).exec(),
    ]);

    res.status(200).json({
      data: {
        workspaceId,
        metrics: {
          totalContent,
          draftContent,
          pendingApproval,
          scheduledContent,
          publishedContent,
          knowledgeDocs,
          totalBrands: brands.length,
        },
        brands,
        recentExecutions,
        upcomingScheduled,
      },
    });
  } catch (err) {
    next(err);
  }
}
