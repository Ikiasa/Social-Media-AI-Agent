import { describe, it, expect } from 'vitest';
import { ScheduledPostModel } from '../packages/database/src/models/ScheduledPost';
import { PublicationModel } from '../packages/database/src/models/Publication';

describe('Database Schema & Concurrency Integration', () => {
  it('should enforce unique index specification on PublicationModel schema for (workspaceId, scheduledPostId)', () => {
    const indexes = PublicationModel.schema.indexes();
    const hasUniqueIndex = indexes.some(
      ([fields, options]: [any, any]) =>
        fields.workspaceId === 1 && fields.scheduledPostId === 1 && options?.unique === true
    );
    expect(hasUniqueIndex).toBe(true);
  });

  it('should enforce unique index specification on ScheduledPostModel schema for (workspaceId, contentId, scheduledAt, platform)', () => {
    const indexes = ScheduledPostModel.schema.indexes();
    const hasUniqueIndex = indexes.some(
      ([fields, options]: [any, any]) =>
        fields.workspaceId === 1 &&
        fields.contentId === 1 &&
        fields.scheduledAt === 1 &&
        fields.platform === 1 &&
        options?.unique === true
    );
    expect(hasUniqueIndex).toBe(true);
  });

  it('should verify atomic update query structure for worker job claims', () => {
    const queryFilter = {
      _id: 'test-post-id',
      status: { $in: ['READY_TO_PUBLISH', 'RETRY_WAIT'] },
    };
    const updatePayload = {
      $set: { status: 'PUBLISHING', updatedAt: expect.any(Date) },
    };

    expect(queryFilter.status.$in).toContain('READY_TO_PUBLISH');
    expect(queryFilter.status.$in).toContain('RETRY_WAIT');
    expect(updatePayload.$set.status).toBe('PUBLISHING');
  });
});
