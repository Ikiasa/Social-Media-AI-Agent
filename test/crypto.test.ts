import { describe, it, expect } from 'vitest';
import { encryptToken, decryptToken, generateHmacSignature } from '../packages/core/src/crypto';

describe('AES-256-GCM Token Encryption & HMAC Signatures', () => {
  it('should encrypt token at rest and decrypt cleanly back to plaintext', () => {
    const plaintext = 'EAAGm0PX4123_mock_access_token_secret_12345';
    const encrypted = encryptToken(plaintext);

    expect(encrypted).not.toBe(plaintext);
    expect(encrypted.split(':')).toHaveLength(3); // iv:authTag:ciphertext

    const decrypted = decryptToken(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('should fail decryption if auth tag or ciphertext is tampered with', () => {
    const plaintext = 'secret_token';
    const encrypted = encryptToken(plaintext);
    const parts = encrypted.split(':');
    parts[1] = '00000000000000000000000000000000'; // Tamper auth tag
    const tampered = parts.join(':');

    expect(() => decryptToken(tampered)).toThrow();
  });

  it('should generate consistent HMAC SHA-256 signatures for payload integrity', () => {
    const payload = 'contentId=123&caption=Hello';
    const sig1 = generateHmacSignature(payload, 'secret1');
    const sig2 = generateHmacSignature(payload, 'secret1');
    const sig3 = generateHmacSignature(payload, 'secret2');

    expect(sig1).toBe(sig2);
    expect(sig1).not.toBe(sig3);
  });
});
