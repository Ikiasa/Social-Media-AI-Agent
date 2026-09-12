import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { KnowledgeService } from '../services/KnowledgeService';
import { ValidationError } from '../../../../packages/core/src/errors';

const knowledgeService = new KnowledgeService();

export async function ingestKnowledge(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { sourceType, sourceUriOrBuffer, title } = req.body;
    const doc = await knowledgeService.ingest(req.context!, {
      sourceType,
      sourceUriOrBuffer,
      title,
    });
    res.status(201).json({ data: doc });
  } catch (err) {
    next(err);
  }
}

export async function listKnowledge(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const docs = await knowledgeService.listDocuments(req.context!);
    res.status(200).json({
      data: docs,
      meta: {
        total: docs.length,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getKnowledge(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const doc = await knowledgeService.getDocument(req.context!, req.params.id);
    if (!doc) {
      throw new ValidationError(`Knowledge document not found with ID: ${req.params.id}`);
    }
    res.status(200).json({ data: doc });
  } catch (err) {
    next(err);
  }
}

export async function deleteKnowledge(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const success = await knowledgeService.deleteDocument(req.context!, req.params.id);
    if (!success) {
      throw new ValidationError(`Knowledge document not found with ID: ${req.params.id}`);
    }
    res.status(200).json({ data: { success: true } });
  } catch (err) {
    next(err);
  }
}
