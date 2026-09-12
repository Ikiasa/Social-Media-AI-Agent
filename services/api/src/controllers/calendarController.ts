import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { ScheduledPostModel } from '../../../../packages/database/src/models/ScheduledPost';
import { ContentModel } from '../../../../packages/database/src/models/Content';
import { ValidationError } from '../../../../packages/core/src/errors';

export async function listCalendarItems(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const workspaceId = req.context!.workspaceId;
    const scheduledPosts = await ScheduledPostModel.find({ workspaceId }).sort({ scheduledAt: 1 }).exec();
    const contents = await ContentModel.find({ workspaceId }).exec();

    res.status(200).json({
      data: {
        scheduledPosts,
        contents,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function scheduleContent(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const workspaceId = req.context!.workspaceId;
    const { contentId, scheduledAt, timezone, platform, brandId } = req.body;

    const content = await ContentModel.findOne({ _id: contentId, workspaceId });
    if (!content) {
      throw new ValidationError(`Content not found with ID: ${contentId}`);
    }

    const scheduledDate = new Date(scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      throw new ValidationError('Invalid scheduledAt timestamp.');
    }

    const post = await ScheduledPostModel.create({
      workspaceId,
      brandId: brandId || content.brandId || req.context!.brandId,
      contentId: String(content._id),
      platform: platform || content.platform || 'instagram',
      scheduledAt: scheduledDate,
      timezone: timezone || 'UTC',
      status: 'SCHEDULED',
      createdBy: req.context!.userId,
    });

    content.status = 'SCHEDULED';
    await content.save();

    res.status(201).json({ data: post });
  } catch (err) {
    next(err);
  }
}

export async function updateSchedule(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const workspaceId = req.context!.workspaceId;
    const { id } = req.params;
    const { scheduledAt, timezone, status } = req.body;

    const post = await ScheduledPostModel.findOne({ _id: id, workspaceId });
    if (!post) {
      throw new ValidationError(`Scheduled post not found with ID: ${id}`);
    }

    if (scheduledAt) {
      const scheduledDate = new Date(scheduledAt);
      if (isNaN(scheduledDate.getTime())) {
        throw new ValidationError('Invalid scheduledAt timestamp.');
      }
      post.scheduledAt = scheduledDate;
    }
    if (timezone) post.timezone = timezone;
    if (status) post.status = status;

    await post.save();
    res.status(200).json({ data: post });
  } catch (err) {
    next(err);
  }
}

export async function cancelSchedule(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const workspaceId = req.context!.workspaceId;
    const { id } = req.params;

    const post = await ScheduledPostModel.findOne({ _id: id, workspaceId });
    if (!post) {
      throw new ValidationError(`Scheduled post not found with ID: ${id}`);
    }

    post.status = 'CANCELLED';
    await post.save();

    await ContentModel.updateOne(
      { _id: post.contentId, workspaceId },
      { $set: { status: 'APPROVED' } }
    );

    res.status(200).json({ data: { id, status: 'CANCELLED' } });
  } catch (err) {
    next(err);
  }
}
