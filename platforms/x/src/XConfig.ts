export interface XConfig {
  apiBaseUrl: string;
  mediaUploadUrl: string;
  maxImageSizeBytes: number;
}

export function getXConfig(customParams: Partial<XConfig> = {}): XConfig {
  return {
    apiBaseUrl: customParams.apiBaseUrl || process.env.X_API_BASE_URL || 'https://api.x.com',
    mediaUploadUrl: customParams.mediaUploadUrl || process.env.X_MEDIA_UPLOAD_URL || 'https://api.x.com/2/media/upload',
    maxImageSizeBytes: customParams.maxImageSizeBytes || Number(process.env.X_MAX_IMAGE_SIZE_BYTES) || 5 * 1024 * 1024, // 5MB limit
  };
}
