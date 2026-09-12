import { describe, it, expect } from 'vitest';
import { calculateXWeightedLength, validateXText } from '../platforms/x/src/XTextValidator';

describe('XTextValidator Utility Unit Tests', () => {
  it('should return 0 weighted length for empty text', () => {
    const res = validateXText('');
    expect(res.isValid).toBe(false);
    expect(res.weightedLength).toBe(0);
  });

  it('should count standard ASCII characters as 1 weighted character each', () => {
    const text = 'Hello X Platform!';
    expect(calculateXWeightedLength(text)).toBe(17);
    const res = validateXText(text);
    expect(res.isValid).toBe(true);
    expect(res.weightedLength).toBe(17);
  });

  it('should count URLs as 23 weighted characters regardless of URL string length', () => {
    const shortUrl = 'http://a.co';
    const longUrl = 'https://www.example.com/very/long/url/path/with/parameters?query=1234567890';
    expect(calculateXWeightedLength(shortUrl)).toBe(23);
    expect(calculateXWeightedLength(longUrl)).toBe(23);

    const textWithUrl = 'Check this out: https://example.com/item';
    // "Check this out: " (16) + URL (23) = 39
    expect(calculateXWeightedLength(textWithUrl)).toBe(39);
  });

  it('should count emojis and CJK characters as 2 weighted characters each', () => {
    const emojiText = '🚀👍';
    expect(calculateXWeightedLength(emojiText)).toBe(4);

    const cjkText = 'こんにちは'; // 5 CJK characters
    expect(calculateXWeightedLength(cjkText)).toBe(10);
  });

  it('should validate text exactly at 280 weighted characters limit', () => {
    const atLimitText = 'a'.repeat(280);
    const res = validateXText(atLimitText);
    expect(res.isValid).toBe(true);
    expect(res.weightedLength).toBe(280);
  });

  it('should fail validation when text exceeds 280 weighted characters limit', () => {
    const overLimitText = 'a'.repeat(281);
    const res = validateXText(overLimitText);
    expect(res.isValid).toBe(false);
    expect(res.weightedLength).toBe(281);
    expect(res.error).toContain('exceeds maximum character limit of 280');
  });

  it('should handle mixed ASCII, URL, emoji, and CJK text accurately', () => {
    const mixedText = 'Hello 🚀 https://x.com こんにちは';
    // "Hello " (6) + "🚀" (2) + " " (1) + "https://x.com" (23) + " " (1) + "こんにちは" (10) = 43
    expect(calculateXWeightedLength(mixedText)).toBe(43);
  });
});
