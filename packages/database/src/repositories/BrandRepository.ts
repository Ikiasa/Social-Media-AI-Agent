import { BrandModel, IBrand } from '../models/Brand';

export class BrandRepository {
  async create(data: Partial<IBrand>): Promise<IBrand> {
    const brand = new BrandModel(data);
    return await brand.save();
  }

  async findById(id: string, workspaceId: string): Promise<IBrand | null> {
    return await BrandModel.findOne({ _id: id, workspaceId });
  }

  async update(id: string, workspaceId: string, updates: Partial<IBrand>): Promise<IBrand | null> {
    return await BrandModel.findOneAndUpdate({ _id: id, workspaceId }, { $set: updates }, { new: true });
  }

  async list(workspaceId: string): Promise<IBrand[]> {
    return await BrandModel.find({ workspaceId }).sort({ createdAt: -1 });
  }
}
