import { ValidationError } from '../../../packages/core/src/errors';

export interface LinkedInConfig {
  apiBaseUrl: string;
  apiVersion: string;
}

export function getLinkedInConfig(customParams: Partial<LinkedInConfig> = {}): LinkedInConfig {
  const apiBaseUrl = customParams.apiBaseUrl || process.env.LINKEDIN_API_BASE_URL || 'https://api.linkedin.com';
  const apiVersion = customParams.apiVersion || process.env.LINKEDIN_API_VERSION || '202608';

  if (!/^\d{6}$/.test(apiVersion)) {
    throw new ValidationError(`Invalid LinkedIn API version '${apiVersion}'. Format must be YYYYMM (6 digits, e.g. 202608).`);
  }

  return {
    apiBaseUrl,
    apiVersion,
  };
}
