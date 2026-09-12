import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { ContentService } from '../services/ContentService';
import { ContentGenerationService } from '../services/ContentGenerationService';
import { ValidationError } from '../../../../packages/core/src/errors';
import { ContentStatus } from '../../../../packages/database/src/models/Content';

const contentService = new ContentService();
const generationService = new ContentGenerationService();

export async function createDraft(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const draft = await contentService.createDraft(req.context!, req.body);
    res.status(201).json({ data: draft });
  } catch (err) {
    next(err);
  }
}

export async function listContent(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const status = req.query.status as ContentStatus | undefined;
    const items = await contentService.listContent(req.context!, status);
    res.status(200).json({
      data: items,
      meta: {
        total: items.length,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getContent(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const item = await contentService.getContent(req.context!, req.params.id);
    if (!item) {
      throw new ValidationError(`Content not found with ID: ${req.params.id}`);
    }
    res.status(200).json({ data: item });
  } catch (err) {
    next(err);
  }
}

export async function updateContent(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const item = await contentService.updateContent(req.context!, req.params.id, req.body);
    if (!item) {
      throw new ValidationError(`Content not found with ID: ${req.params.id}`);
    }
    res.status(200).json({ data: item });
  } catch (err) {
    next(err);
  }
}

export async function approveContent(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const item = await contentService.approveContent(req.context!, req.params.id);
    res.status(200).json({ data: item });
  } catch (err) {
    next(err);
  }
}

export async function rejectContent(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const item = await contentService.rejectContent(req.context!, req.params.id);
    res.status(200).json({ data: item });
  } catch (err) {
    next(err);
  }
}

export async function generateContent(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const draft = await generationService.generateAndSaveDraft(req.context!, req.body);
    res.status(201).json({ data: draft });
  } catch (err) {
    next(err);
  }
}
