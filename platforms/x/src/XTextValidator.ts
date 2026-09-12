export interface XTextValidationResult {
  isValid: boolean;
  weightedLength: number;
  error?: string;
}

export function calculateXWeightedLength(text: string): number {
  if (!text) return 0;

  // Regex to match URLs (http:// or https:// followed by non-whitespace)
  const urlRegex = /https?:\/\/[^\s]+/g;
  let remainingText = text;
  let weightedCount = 0;

  const urlMatches = text.match(urlRegex) || [];
  for (const _url of urlMatches) {
    weightedCount += 23; // X transforms all URLs to t.co links (23 weighted chars)
  }

  // Remove URLs from string to process remaining characters
  remainingText = remainingText.replace(urlRegex, '');

  // Iterate over remaining Unicode code points
  for (const char of remainingText) {
    const codePoint = char.codePointAt(0) || 0;
    // CJK Unified Ideographs, Emoji ranges, or non-ASCII multibyte characters
    if (
      (codePoint >= 0x4e00 && codePoint <= 0x9fff) || // CJK Unified Ideographs
      (codePoint >= 0x3400 && codePoint <= 0x4dbf) || // CJK Extension A
      (codePoint >= 0x20000 && codePoint <= 0x2a6df) || // CJK Extension B
      (codePoint >= 0x1f300 && codePoint <= 0x1f9ff) || // Emojis & Symbols
      (codePoint >= 0x2600 && codePoint <= 0x26ff) || // Miscellaneous Symbols
      (codePoint >= 0x2700 && codePoint <= 0x27bf) || // Dingbats
      codePoint > 0x7f // Non-ASCII broad range fallback
    ) {
      weightedCount += 2;
    } else {
      weightedCount += 1;
    }
  }

  return weightedCount;
}

export function validateXText(text: string, maxWeightedLength = 280): XTextValidationResult {
  if (!text || text.trim().length === 0) {
    return { isValid: false, weightedLength: 0, error: 'X Post text cannot be empty.' };
  }

  const weightedLength = calculateXWeightedLength(text);

  if (weightedLength > maxWeightedLength) {
    return {
      isValid: false,
      weightedLength,
      error: `X Post exceeds maximum character limit of ${maxWeightedLength} (current weighted length: ${weightedLength}).`,
    };
  }

  return {
    isValid: true,
    weightedLength,
  };
}
