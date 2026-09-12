export interface AuthenticateInput {
  username?: string;
  password?: string;
  sessionToken?: string;
}

export interface AuthenticateResult {
  success: boolean;
  authenticatedAt: Date;
  sessionToken?: string;
}

export interface PublishPostInput {
  workspaceId: string;
  caption: string;
  mediaUrls: string[];
  location?: string;
  hashtags?: string[];
}

export interface LegacyPublishResult {
  postId: string;
  platformPostUrl?: string;
  publishedAt: Date;
  status: 'SUCCESS' | 'FAILED';
}

export interface SocialProfile {
  id: string;
  username: string;
  displayName?: string;
  bio?: string;
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
  avatarUrl?: string;
}

export interface AnalyticsInput {
  workspaceId: string;
  startDate?: Date;
  endDate?: Date;
}

export interface AnalyticsResult {
  platform: string;
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  engagementRate: number;
  metrics: Record<string, unknown>;
}

export interface LegacySocialPlatform {
  readonly platformName: string;
  authenticate(input: AuthenticateInput): Promise<AuthenticateResult>;
  publishPost(input: PublishPostInput): Promise<LegacyPublishResult>;
  getProfile(): Promise<SocialProfile>;
  getAnalytics(input: AnalyticsInput): Promise<AnalyticsResult>;
}
