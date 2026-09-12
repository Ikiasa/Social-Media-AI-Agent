import { describe, it, expect } from 'vitest';
import { validateOutboundUrl, assertSafeOutboundUrl, isIpPrivateOrLoopback } from '../packages/core/src/ssrfProtection';
import { ValidationError } from '../packages/core/src/errors';

describe('SSRF Protection Utility Unit Tests', () => {
  it('should detect private and loopback IP addresses and hostnames', () => {
    expect(isIpPrivateOrLoopback('localhost')).toBe(true);
    expect(isIpPrivateOrLoopback('127.0.0.1')).toBe(true);
    expect(isIpPrivateOrLoopback('::1')).toBe(true);
    expect(isIpPrivateOrLoopback('0.0.0.0')).toBe(true);
    expect(isIpPrivateOrLoopback('10.0.0.1')).toBe(true);
    expect(isIpPrivateOrLoopback('172.16.0.5')).toBe(true);
    expect(isIpPrivateOrLoopback('192.168.1.100')).toBe(true);
    expect(isIpPrivateOrLoopback('169.254.169.254')).toBe(true); // AWS IMDS
    expect(isIpPrivateOrLoopback('service.internal')).toBe(true);

    expect(isIpPrivateOrLoopback('api.instagram.com')).toBe(false);
    expect(isIpPrivateOrLoopback('api.linkedin.com')).toBe(false);
    expect(isIpPrivateOrLoopback('api.x.com')).toBe(false);
  });

  it('should reject non-HTTPS URLs when allowHttp is false', () => {
    const resHttp = validateOutboundUrl('http://example.com');
    expect(resHttp.isValid).toBe(false);
    expect(resHttp.error).toContain('Only HTTPS is permitted');

    const resFile = validateOutboundUrl('file:///etc/passwd');
    expect(resFile.isValid).toBe(false);

    const resHttps = validateOutboundUrl('https://example.com');
    expect(resHttps.isValid).toBe(true);
  });

  it('should reject loopback/private hosts and throw ValidationError in assertSafeOutboundUrl', () => {
    expect(() => assertSafeOutboundUrl('https://127.0.0.1/secret')).toThrow(ValidationError);
    expect(() => assertSafeOutboundUrl('https://169.254.169.254/latest/meta-data')).toThrow(ValidationError);
    expect(() => assertSafeOutboundUrl('https://localhost:8080')).toThrow(ValidationError);
  });

  it('should enforce host allowlist when specified', () => {
    const options = { allowedHosts: ['api.instagram.com', 'api.linkedin.com', 'api.x.com'] };

    expect(validateOutboundUrl('https://api.instagram.com/v19.0/me', options).isValid).toBe(true);
    expect(validateOutboundUrl('https://api.linkedin.com/rest/posts', options).isValid).toBe(true);
    expect(validateOutboundUrl('https://api.x.com/2/tweets', options).isValid).toBe(true);

    const forbidden = validateOutboundUrl('https://malicious-site.com/steal', options);
    expect(forbidden.isValid).toBe(false);
    expect(forbidden.error).toContain('host allowlist');
  });
});
