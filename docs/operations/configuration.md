# Riona Production Configuration Guide

This document lists all environment variables required for running Riona in development, testing, and production environments.

---

## Environment Variables Inventory

| Variable | Required in Prod? | Default (Dev) | Description |
|---|---|---|---|
| `NODE_ENV` | Yes | `development` | Runtime environment (`production`, `staging`, `development`, `test`). |
| `PORT` | No | `3000` | HTTP Server Port. |
| `MONGODB_URI` | Yes | `mongodb://localhost:27017/riona_db` | MongoDB connection URI. |
| `JWT_SECRET` | Yes (Min 32 Chars) | `dev_jwt_secret_...` | Key used to sign authentication JWTs. |
| `ENCRYPTION_SECRET` | Yes (Min 32 Chars) | `dev_encryption_secret_...` | Key used to encrypt tokens at rest. |
| `GEMINI_API_KEY` | Yes | - | Google Gemini AI provider API key. |
| `INSTAGRAM_CLIENT_ID` | Optional | - | Meta App Client ID for Instagram. |
| `INSTAGRAM_CLIENT_SECRET` | Optional | - | Meta App Client Secret. |
| `LINKEDIN_CLIENT_ID` | Optional | - | LinkedIn App Client ID. |
| `LINKEDIN_CLIENT_SECRET` | Optional | - | LinkedIn App Client Secret. |
| `LINKEDIN_API_VERSION` | No | `202608` | LinkedIn API version header. |
| `X_CLIENT_ID` | Optional | - | X App Client ID. |
| `X_CLIENT_SECRET` | Optional | - | X App Client Secret. |
| `X_API_BASE_URL` | No | `https://api.x.com` | X API v2 base URL. |
| `X_MEDIA_UPLOAD_URL` | No | `https://api.x.com/2/media/upload` | X v2 Media Upload URL. |
