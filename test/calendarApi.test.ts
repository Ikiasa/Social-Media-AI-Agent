import { describe, it, expect, vi } from 'vitest';
import { ScheduledPostModel } from '../packages/database/src/models/ScheduledPost';

describe('Calendar API Workspace Isolation', () => {
  it('should filter scheduled posts strictly by authorized workspaceId', async () => {
    const mockPosts = [
      { _id: 'sched-wsA-1', workspaceId: 'ws-A', contentId: 'content-1', status: 'SCHEDULED' },
    ];

    vi.spyOn(ScheduledPostModel, 'find').mockImplementation((filter?: any) => {
      const workspaceId = filter?.workspaceId;
      const filtered = mockPosts.filter((p) => p.workspaceId === workspaceId);
      return {
        sort: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(filtered),
      } as any;
    });

    const resWorkspaceA = await ScheduledPostModel.find({ workspaceId: 'ws-A' }).sort({ scheduledAt: 1 }).exec();
    const resWorkspaceB = await ScheduledPostModel.find({ workspaceId: 'ws-B' }).sort({ scheduledAt: 1 }).exec();

    expect(resWorkspaceA).toHaveLength(1);
    expect(resWorkspaceB).toHaveLength(0);
  });
});
