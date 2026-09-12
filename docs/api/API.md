# AI Social Media Agent — REST API Documentation

## 1. Overview

The AI Social Media Agent REST API provides endpoints for Brand Profile management, Knowledge Base ingestion, Content draft management, and AI Content Generation.

### Base URL
```text
http://localhost:3000/api
```

---

## 2. Authentication & Multi-Tenancy Headers

All tenant-scoped API requests must include multi-tenancy context headers:

| Header Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `X-Dev-User-Id` | String | Yes | ID of the authenticated user (e.g. `user-123`) |
| `X-Dev-Workspace-Id` | String | Yes | ID of the active workspace (e.g. `ws-456`) |

*All data operations are strictly isolated by `X-Dev-Workspace-Id`.*

---

## 3. Standard Response Formats

### Success Single Object
```json
{
  "data": {
    "id": "resource_id",
    "createdAt": "2026-09-02T00:00:00.000Z"
  }
}
```

### Success Collection
```json
{
  "data": [],
  "meta": {
    "total": 0
  }
}
```

### Standard Error Response
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human readable message describing the error"
  }
}
```

#### Common Error Codes
* `VALIDATION_ERROR` (HTTP 400): Request body/query validation failed.
* `AUTHENTICATION_ERROR` (HTTP 401): Missing or invalid user/workspace context headers.
* `AUTHORIZATION_ERROR` (HTTP 403): User lacks permission to access the specified workspace.
* `NOT_FOUND` (HTTP 400 / 404): Resource not found in current workspace context.
* `AI_ERROR` (HTTP 502): Gemini AI generation failure or quota exhaustion.

---

## 4. API Endpoints

### 4.1 Health Check

#### `GET /api/health`
Checks API server availability.

* **Authorization**: Public
* **Response (HTTP 200)**:
  ```json
  {
    "status": "ok"
  }
  ```

---

### 4.2 Brand Management

#### `POST /api/brands`
Creates a brand profile in the active workspace.

* **Authorization**: Required (`X-Dev-User-Id`, `X-Dev-Workspace-Id`)
* **Request Body**:
  ```json
  {
    "name": "Acme Tech",
    "description": "AI SaaS Solutions for creators",
    "industry": "Software / AI",
    "website": "https://acme.example.com",
    "targetAudience": "Developers & Social Media Managers",
    "brandVoice": ["Professional", "Innovative", "Educational"],
    "contentPillars": ["AI Trends", "Tutorials", "Case Studies"],
    "restrictedTopics": ["Politics", "Gambling"]
  }
  ```
* **Response (HTTP 201)**: Returns created brand object.

#### `GET /api/brands/:id`
Retrieves brand by ID (scoped to workspace).

* **Authorization**: Required
* **Response (HTTP 200)**: Returns brand object.

#### `PATCH /api/brands/:id`
Updates brand by ID.

* **Authorization**: Required
* **Request Body**: Partial brand fields to update.
* **Response (HTTP 200)**: Returns updated brand object.

---

### 4.3 Content Management

#### `POST /api/content`
Creates a manual content draft.

* **Authorization**: Required
* **Request Body**:
  ```json
  {
    "brandId": "brand-123",
    "platform": "instagram",
    "title": "5 Tips for AI Automation",
    "contentType": "educational",
    "caption": "Are you ready to automate your workflow?",
    "hashtags": ["#AI", "#SaaS", "#Productivity"]
  }
  ```
* **Response (HTTP 201)**: Returns created draft object (`status: "DRAFT"`).

#### `GET /api/content`
Lists content items in active workspace.

* **Authorization**: Required
* **Query Parameters**:
  * `status` (Optional): Filter by status (`DRAFT`, `REVIEW`, `APPROVED`, `REJECTED`, `SCHEDULED`, `PUBLISHED`, `ARCHIVED`).
* **Response (HTTP 200)**: Returns collection of content items.

#### `GET /api/content/:id`
Retrieves content item by ID.

#### `PATCH /api/content/:id`
Updates content draft.

#### `POST /api/content/:id/approve`
Approves content draft (`status` $\rightarrow$ `APPROVED`).

#### `POST /api/content/:id/reject`
Rejects content draft (`status` $\rightarrow$ `REJECTED`).

---

### 4.4 AI Content Generation

#### `POST /api/content/generate`
Generates structured content using AI and automatically saves it as a `DRAFT` in the active workspace.

* **Authorization**: Required
* **Request Body**:
  ```json
  {
    "brandId": "brand-123",
    "platform": "instagram",
    "contentType": "educational",
    "topic": "AI Social Media Agents in 2026"
  }
  ```
* **Response (HTTP 201)**:
  ```json
  {
    "data": {
      "_id": "66d6a1b...",
      "workspaceId": "ws-456",
      "brandId": "brand-123",
      "platform": "instagram",
      "title": "AI Social Media Agents in 2026",
      "contentType": "educational",
      "hook": "Is manual social media management dead?",
      "body": "Discover how AI Agents can generate ideas, adapt captions, and analyze performance.",
      "caption": "Is manual social media management dead? Discover how AI Agents...",
      "cta": "Save this post for later!",
      "hashtags": ["#AIAgent", "#SocialMedia2026", "#AIAutomation"],
      "status": "DRAFT",
      "createdAt": "2026-09-02T00:55:00.000Z"
    }
  }
  ```

---

### 4.5 Knowledge Base Management

#### `POST /api/knowledge`
Ingests a knowledge document (TXT, PDF, Web URL, YouTube URL, Audio text) into workspace memory.

* **Authorization**: Required
* **Request Body**:
  ```json
  {
    "sourceType": "txt",
    "sourceUriOrBuffer": "Acme AI Product Guide text content...",
    "title": "Product Overview"
  }
  ```
* **Response (HTTP 201)**: Returns ingested KnowledgeDocument object.

#### `GET /api/knowledge`
Lists all knowledge documents in workspace.

#### `GET /api/knowledge/:id`
Retrieves knowledge document by ID.

#### `DELETE /api/knowledge/:id`
Deletes knowledge document from workspace.

---

### 4.6 Agent Orchestrator Runtime

#### `POST /api/agent/run`
Executes single agent orchestrator workflow based on user intent.

* **Authorization**: Required (`X-Dev-User-Id`, `X-Dev-Workspace-Id`)
* **Request Body**:
  ```json
  {
    "message": "Buatkan 5 ide konten edukasi Instagram untuk brand kami.",
    "brandId": "brand-123"
  }
  ```
* **Response (HTTP 200)**:
  ```json
  {
    "data": {
      "executionId": "exec_1788286132962_c239b287",
      "workspaceId": "ws-456",
      "userId": "user-123",
      "status": "COMPLETED",
      "intent": "CONTENT_GENERATION",
      "response": "Draft content created successfully: \"5 AI Automation Secrets\". Status set to DRAFT.",
      "contentId": "66d6a1b...",
      "requiresApproval": false,
      "trace": [
        { "stepIndex": 1, "toolName": "get_brand", "status": "SUCCESS" },
        { "stepIndex": 2, "toolName": "search_knowledge", "status": "SUCCESS" },
        { "stepIndex": 3, "toolName": "create_content", "status": "SUCCESS" }
      ]
    }
  }
  ```

#### `GET /api/agent/executions/:id`
Retrieves execution trace log by ID.

#### `POST /api/agent/executions/:id/approve`
Approves a pending external tool execution (`status` $\rightarrow$ `APPROVED`).

