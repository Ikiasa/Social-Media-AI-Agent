export interface DatabaseAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
}

export interface ContentEntity {
  id: string;
  workspaceId: string;
  brandId?: string;
  title: string;
  caption: string;
  status: 'DRAFT' | 'REVIEW' | 'APPROVED' | 'SCHEDULED' | 'PUBLISHED';
  createdAt: Date;
  updatedAt: Date;
}

export interface IContentRepository {
  findById(id: string, workspaceId: string): Promise<ContentEntity | null>;
  create(content: Partial<ContentEntity>): Promise<ContentEntity>;
  update(id: string, workspaceId: string, updates: Partial<ContentEntity>): Promise<ContentEntity>;
  list(workspaceId: string): Promise<ContentEntity[]>;
}
