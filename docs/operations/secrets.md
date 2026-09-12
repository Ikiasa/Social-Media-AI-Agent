# Secrets & Key Management Specification

This document details the secret cryptography, rotation procedures, and startup validation for Riona Social Media AI Agent.

---

## Required Production Secrets

1. `JWT_SECRET`: Used to sign and verify multi-tenant authentication JWT tokens. Must be at least 32 characters long.
2. `ENCRYPTION_SECRET`: Used by `TokenEncryptionService` (AES-256-GCM) to encrypt social media access/refresh tokens at rest. Must be at least 32 characters long.
3. `MONGODB_URI`: MongoDB connection string containing authentication credentials.
4. `GEMINI_API_KEY`: API key for Google Gemini AI provider.
5. Platform Credentials (`INSTAGRAM_CLIENT_SECRET`, `LINKEDIN_CLIENT_SECRET`, `X_CLIENT_SECRET`).

---

## Secret Rotation Procedure

- **Encryption Key Rotation**:
  `TokenEncryptionService` supports ciphertext re-encryption. When rotating `ENCRYPTION_SECRET`:
  1. Initialize `TokenEncryptionService` with `PRIMARY_KEY` (new key) and `FALLBACK_KEY` (old key).
  2. Decrypt using `FALLBACK_KEY` if primary tag check fails.
  3. Re-encrypt plaintext using `PRIMARY_KEY` and save updated `SocialAccount`.

---

## Exposure Prevention

- No production secrets may be committed to source repositories or logged to stdout/stderr.
- Startup validator (`validateProductionConfig()`) asserts presence and complexity of secrets at launch, failing fast if defaults or weak secrets are detected in production mode.
