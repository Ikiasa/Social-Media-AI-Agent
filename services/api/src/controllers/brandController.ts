import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { BrandService } from '../services/BrandService';
import { ValidationError } from '../../../../packages/core/src/errors';

const brandService = new BrandService();

export async function createBrand(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const brand = await brandService.createBrand(req.context!, req.body);
    res.status(201).json({ data: brand });
  } catch (err) {
    next(err);
  }
}

export async function getBrand(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const brand = await brandService.getBrand(req.context!, req.params.id);
    if (!brand) {
      throw new ValidationError(`Brand not found with ID: ${req.params.id}`);
    }
    res.status(200).json({ data: brand });
  } catch (err) {
    next(err);
  }
}

export async function updateBrand(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const brand = await brandService.updateBrand(req.context!, req.params.id, req.body);
    if (!brand) {
      throw new ValidationError(`Brand not found with ID: ${req.params.id}`);
    }
    res.status(200).json({ data: brand });
  } catch (err) {
    next(err);
  }
}
