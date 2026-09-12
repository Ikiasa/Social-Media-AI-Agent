import { KnowledgeDocumentModel, IKnowledgeDocument } from '../models/KnowledgeDocument';

export class KnowledgeRepository {
  async create(data: Partial<IKnowledgeDocument>): Promise<IKnowledgeDocument> {
    const doc = new KnowledgeDocumentModel(data);
    return await doc.save();
  }

  async findById(id: string, workspaceId: string): Promise<IKnowledgeDocument | null> {
    return await KnowledgeDocumentModel.findOne({ _id: id, workspaceId });
  }

  async list(workspaceId: string): Promise<IKnowledgeDocument[]> {
    return await KnowledgeDocumentModel.find({ workspaceId }).sort({ createdAt: -1 });
  }

  async delete(id: string, workspaceId: string): Promise<boolean> {
    const res = await KnowledgeDocumentModel.deleteOne({ _id: id, workspaceId });
    return res.deletedCount > 0;
  }
}
