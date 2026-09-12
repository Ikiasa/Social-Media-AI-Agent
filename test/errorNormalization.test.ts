import { describe, it, expect } from 'vitest';
import { InstagramPublisher } from '../platforms/instagram/src/InstagramPublisher';

describe('Provider Error Normalization', () => {
  const publisher = new InstagramPublisher();

  it('should normalize HTTP 401/403/TOKEN_EXPIRED to AUTHENTICATION', () => {
    expect(publisher.classifyError({ code: 401 })).toBe('AUTHENTICATION');
    expect(publisher.classifyError({ status: 403 })).toBe('AUTHENTICATION');
    expect(publisher.classifyError({ message: 'TOKEN_EXPIRED' })).toBe('AUTHENTICATION');
    expect(publisher.classifyError('MISSING_ACCESS_TOKEN')).toBe('AUTHENTICATION');
  });

  it('should normalize HTTP 429 and RATE_LIMIT to RATE_LIMIT', () => {
    expect(publisher.classifyError({ code: 429 })).toBe('RATE_LIMIT');
    expect(publisher.classifyError('429_RATE_LIMIT')).toBe('RATE_LIMIT');
  });

  it('should normalize HTTP 500/503/NETWORK_ERROR to TRANSIENT', () => {
    expect(publisher.classifyError({ status: 500 })).toBe('TRANSIENT');
    expect(publisher.classifyError({ status: 503 })).toBe('TRANSIENT');
    expect(publisher.classifyError('NETWORK_ERROR')).toBe('TRANSIENT');
  });

  it('should normalize HTTP 400 to VALIDATION and 404 to NOT_FOUND', () => {
    expect(publisher.classifyError({ status: 400 })).toBe('VALIDATION');
    expect(publisher.classifyError({ status: 404 })).toBe('NOT_FOUND');
  });
});
