import { ValidationError } from './errors';

export interface SsrfValidationOptions {
  allowHttp?: boolean;
  allowedHosts?: string[];
}

const DEFAULT_ALLOWED_HOST_SUFFIXES = [
  'api.instagram.com',
  'graph.facebook.com',
  'api.linkedin.com',
  'api.x.com',
  'generativelanguage.googleapis.com',
];

export function isIpPrivateOrLoopback(hostname: string): boolean {
  const host = hostname.toLowerCase().trim();

  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host === '0.0.0.0' ||
    host.endsWith('.local') ||
    host.endsWith('.internal')
  ) {
    return true;
  }

  // IPv4 regex check for private/link-local ranges
  const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const octet1 = parseInt(ipv4Match[1], 10);
    const octet2 = parseInt(ipv4Match[2], 10);

    // 127.0.0.0/8 (Loopback)
    if (octet1 === 127) return true;
    // 10.0.0.0/8 (Private)
    if (octet1 === 10) return true;
    // 172.16.0.0/12 (Private)
    if (octet1 === 172 && octet2 >= 16 && octet2 <= 31) return true;
    // 192.168.0.0/16 (Private)
    if (octet1 === 192 && octet2 === 168) return true;
    // 169.254.0.0/16 (Link-Local / AWS IMDS)
    if (octet1 === 169 && octet2 === 254) return true;
    // 0.0.0.0/8
    if (octet1 === 0) return true;
  }

  return false;
}

export function validateOutboundUrl(rawUrl: string, options: SsrfValidationOptions = {}): { isValid: boolean; url?: URL; error?: string } {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { isValid: false, error: 'URL must be a non-empty string.' };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch (_e) {
    return { isValid: false, error: 'Malformed or unparseable URL.' };
  }

  const protocol = parsedUrl.protocol.toLowerCase();
  if (protocol !== 'https:' && (protocol !== 'http:' || !options.allowHttp)) {
    return { isValid: false, error: `Disallowed URL protocol '${protocol}'. Only HTTPS is permitted.` };
  }

  const hostname = parsedUrl.hostname;
  if (isIpPrivateOrLoopback(hostname)) {
    return { isValid: false, error: `Access to private or loopback host '${hostname}' is forbidden (SSRF protection).` };
  }

  if (options.allowedHosts && options.allowedHosts.length > 0) {
    const isAllowed = options.allowedHosts.some((allowed) =>
      hostname.toLowerCase() === allowed.toLowerCase() || hostname.toLowerCase().endsWith(`.${allowed.toLowerCase()}`)
    );
    if (!isAllowed) {
      return { isValid: false, error: `Host '${hostname}' is not in the approved outbound host allowlist.` };
    }
  }

  return { isValid: true, url: parsedUrl };
}

export function assertSafeOutboundUrl(rawUrl: string, options: SsrfValidationOptions = {}): URL {
  const result = validateOutboundUrl(rawUrl, options);
  if (!result.isValid || !result.url) {
    throw new ValidationError(result.error || 'Outbound URL failed SSRF security check.');
  }
  return result.url;
}
