import { WorkspaceContext } from '../../core/src/context';
import { ISocialAccount } from '../../database/src/models/SocialAccount';
import { IContent } from '../../database/src/models/Content';

export type SocialPlatform = 'instagram' | 'linkedin' | 'x';

export type ProviderErrorCategory =
  | 'AUTHENTICATION'
  | 'AUTHORIZATION'
  | 'RATE_LIMIT'
  | 'TRANSIENT'
  | 'VALIDATION'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'UNKNOWN';

export interface MediaAsset {
  url: string;
  type?: 'image' | 'video';
  altText?: string;
}

export interface PublishRequest {
  scheduledPostId: string;
  contentId: string;
  platform: SocialPlatform;
  caption: string;
  media?: MediaAsset[];
  metadata?: Record<string, unknown>;
}

export interface PublishResult {
  outcome?: 'PUBLISHED' | 'PROCESSING' | 'UNKNOWN' | 'FAILED';
  status?: 'SUCCESS' | 'FAILED' | 'RETRY_WAIT'; // Backward-compatibility alias
  platformPostId?: string; // Backward-compatibility alias
  postUrl?: string; // Backward-compatibility alias
  providerPostId?: string;
  providerContainerId?: string;
  providerUrl?: string;
  errorCategory?: ProviderErrorCategory;
  errorCode?: string;
  errorMessage?: string;
  shouldRetry: boolean;
  isPermanentAuthFailure?: boolean;
  rawMetadata?: Record<string, unknown>;
}

export interface PublishStatusResult {
  status: 'PUBLISHED' | 'PROCESSING' | 'FAILED' | 'NOT_FOUND' | 'UNKNOWN';
  providerPostId?: string;
  providerContainerId?: string;
  errorMessage?: string;
}

export interface AccountValidationResult {
  isValid: boolean;
  errorCategory?: ProviderErrorCategory;
  errorCode?: string;
  errorMessage?: string;
}

export interface SocialPublisher {
  readonly platform: SocialPlatform;
  validateAccount?(context: WorkspaceContext, account: ISocialAccount): Promise<AccountValidationResult>;
  publish(context: WorkspaceContext, account: ISocialAccount, request: PublishRequest | IContent): Promise<PublishResult>;
  getPublishStatus?(context: WorkspaceContext, account: ISocialAccount, providerReference: string): Promise<PublishStatusResult>;
  checkContainerStatus?(context: WorkspaceContext, account: ISocialAccount, containerId: string): Promise<PublishResult>;
  classifyError?(error: any): ProviderErrorCategory;
}

// Backward-compatibility alias interface
export type Publisher = SocialPublisher;
