import { ContentModel, IContent, ContentStatus } from '../models/Content';

export class ContentRepository {
  async create(data: Partial<IContent>): Promise<IContent> {
    const content = new ContentModel(data);
    return await content.save();
  }

  async findById(id: string, workspaceId: string): Promise<IContent | null> {
    return await ContentModel.findOne({ _id: id, workspaceId });
  }

  async list(workspaceId: string, filterStatus?: ContentStatus): Promise<IContent[]> {
    const query: Record<string, unknown> = { workspaceId };
    if (filterStatus) {
      query.status = filterStatus;
    }
    return await ContentModel.find(query).sort({ createdAt: -1 });
  }

  async update(id: string, workspaceId: string, updates: Partial<IContent>): Promise<IContent | null> {
    return await ContentModel.findOneAndUpdate({ _id: id, workspaceId }, { $set: updates }, { new: true });
  }

  async updateStatus(id: string, workspaceId: string, status: ContentStatus): Promise<IContent | null> {
    return await ContentModel.findOneAndUpdate({ _id: id, workspaceId }, { $set: { status } }, { new: true });
  }
}
