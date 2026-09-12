import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SchedulerEngine } from '../services/scheduler/SchedulerEngine';
import { ScheduledPostModel } from '../packages/database/src/models/ScheduledPost';
import { PublicationModel } from '../packages/database/src/models/Publication';
import { ContentModel } from '../packages/database/src/models/Content';

describe('SchedulerEngine & Idempotency', () => {
  let scheduler: SchedulerEngine;

  beforeEach(() => {
    scheduler = new SchedulerEngine();
    vi.restoreAllMocks();
  });

  it('should process due posts and transition status to READY_TO_PUBLISH', async () => {
    const mockPost: any = {
      _id: 'sched-101',
      workspaceId: 'ws-1',
      contentId: 'content-101',
      scheduledAt: new Date(Date.now() - 1000), // Due in past
      status: 'SCHEDULED',
      save: vi.fn().mockResolvedValue(true),
    };

    vi.spyOn(ScheduledPostModel, 'find').mockReturnValue({
      exec: vi.fn().mockResolvedValue([mockPost]),
    } as any);

    vi.spyOn(PublicationModel, 'findOne').mockResolvedValue(null);
    vi.spyOn(ContentModel, 'updateOne').mockResolvedValue({ acknowledged: true } as any);

    const result = await scheduler.processDuePosts('ws-1');

    expect(result.processedCount).toBe(1);
    expect(result.readyToPublishCount).toBe(1);
    expect(mockPost.status).toBe('READY_TO_PUBLISH');
    expect(mockPost.save).toHaveBeenCalled();
  });

  it('should skip duplicate processing if publication record already exists (Idempotency)', async () => {
    const mockPost: any = {
      _id: 'sched-102',
      workspaceId: 'ws-1',
      contentId: 'content-102',
      scheduledAt: new Date(Date.now() - 1000),
      status: 'SCHEDULED',
      save: vi.fn().mockResolvedValue(true),
    };

    vi.spyOn(ScheduledPostModel, 'find').mockReturnValue({
      exec: vi.fn().mockResolvedValue([mockPost]),
    } as any);

    // Existing publication indicates post was already published
    vi.spyOn(PublicationModel, 'findOne').mockResolvedValue({ _id: 'pub-102' } as any);

    const result = await scheduler.processDuePosts('ws-1');

    expect(result.processedCount).toBe(1);
    expect(result.readyToPublishCount).toBe(0);
    expect(mockPost.status).toBe('PUBLISHED');
  });
});
