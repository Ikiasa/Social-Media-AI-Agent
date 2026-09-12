# X (Twitter) Text Validation Specification

This document details the weighted character counting algorithm, official X rules, Unicode handling, and validation bounds enforced by `XTextValidator`.

---

## Official X Character Weighting Rules

- **Maximum Allowed Weight**: **280 weighted characters**.
- **URLs**: Any valid HTTP/HTTPS URL (including query parameters and Unicode domains) is transformed by X to a `t.co` short link, counting as exactly **23 weighted characters** regardless of actual URL length.
- **CJK Characters**: Chinese, Japanese, and Korean ideographs count as **2 weighted characters** each.
- **Emojis & Surrogates**: Emojis (including multi-code-point sequences and surrogate pairs) count as **2 weighted characters** each.
- **Standard ASCII / Latin Characters**: ASCII characters (U+0000 to U+024F) count as **1 weighted character** each.
- **Combining Marks**: Unicode combining diacritics are normalized via `String.prototype.normalize('NFC')` before calculating weighted length.

---

## Validation Enforcement Architecture

The `validateXText` validator in `platforms/x/src/XTextValidator.ts` evaluates captions before sending publish requests:

```typescript
const result = validateXText(caption);
if (!result.isValid) {
  return {
    outcome: 'FAILED',
    status: 'FAILED',
    errorCategory: 'VALIDATION',
    errorCode: 'CHARACTER_LIMIT_EXCEEDED',
    errorMessage: result.error,
    shouldRetry: false,
  };
}
```

This prevents wasted API requests and guarantees fail-fast validation prior to network dispatch.
