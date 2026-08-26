# Hugging Face Space Deployment Guidelines & Best Practices

## 1. Deployment Configuration

### Target Space
- **Profile:** `Leon4gr45`
- **Space:** `builder`
- **Full Identifier:** `Leon4gr45/builder`
- **Frontend Port:** `7860` (mandatory for all Hugging Face Spaces)

### Deployment Method
We use the **Docker SDK** for flexibility, utilizing a standard `Dockerfile` configured to run Next.js standalone on port `7860`.

### HF Token
- The environment variable **`HF_TOKEN` will always be provided at execution time**.
- Never hardcode the token. Always read it from the environment.
- All monitoring and log-streaming commands rely on `$HF_TOKEN`.

### Required Files
- `Dockerfile` (binds the app to port `7860`)
- `README.md` (includes Hugging Face YAML frontmatter)
- `.hfignore` (excludes unnecessary files to prevent repository limit issues)
- `Agent.md` (this file, detailing current practices)

---

## 2. API Exposure and Documentation

### Mandatory Endpoints
The following endpoints must be accessible publicly without any redirection/authentication block (configured in Next.js middleware):

- **`/health`**
  - **Method:** GET
  - **Purpose:** Health check returning HTTP 200 once Next.js server is ready. Necessary for Hugging Face to transition the Space status to *running*.
  - **Request Example:** None (GET request)
  - **Response Example:**
    ```json
    {
      "ok": true,
      "name": "osw-studio",
      "version": "1.84.0",
      "mode": "browser",
      "timestamp": "2026-07-16T12:00:00.000Z"
    }
    ```

- **`/api-docs`**
  - **Method:** GET
  - **Purpose:** Serve documentation of all available API endpoints. Reachable at `https://Leon4gr45-builder.hf.space/api-docs`
  - **Request Example:** None (GET request)
  - **Response Example:**
    ```json
    {
      "name": "OSW Studio API Documentation",
      "version": "1.84.0",
      "description": "API endpoints documentation...",
      "endpoints": [...]
    }
    ```

### Functional Endpoints

- **`/api/models`**
  - **Method:** GET
  - **Purpose:** List available AI models across supported providers.
  - **Request Example:** GET `/api/models`
  - **Response Example:** `{"models": [...]}`

- **`/api/validate-key`**
  - **Method:** POST
  - **Purpose:** Validate provider API key.
  - **Request Example:** `{"provider": "openrouter", "apiKey": "sk-..."}`
  - **Response Example:** `{"valid": true}`

- **`/api/generate`**
  - **Method:** POST
  - **Purpose:** Generate web code or site response via AI model.
  - **Request Example:** `{"prompt": "Create landing page", "provider": "openrouter", "model": "..."}`
  - **Response Example:** `{"result": "..."}`

- **`/api/generate-image`**
  - **Method:** POST
  - **Purpose:** Generate image assets using AI image generation service.
  - **Request Example:** `{"prompt": "Logo design"}`
  - **Response Example:** `{"url": "..."}`

- **`/api/web/search`**
  - **Method:** POST
  - **Purpose:** Perform web search for context retrieval.
  - **Request Example:** `{"query": "Next.js 15 features"}`
  - **Response Example:** `{"results": [...]}`

- **`/api/web/fetch`**
  - **Method:** POST
  - **Purpose:** Fetch web content from external URL.
  - **Request Example:** `{"url": "https://example.com"}`
  - **Response Example:** `{"content": "..."}`

---

## 3. Deployment Workflow & Troubleshooting

### Standard Deployment Command
Check that space is empty or clean, then run:

```bash
hf upload Leon4gr45/builder . --repo-type=space --token=$HF_TOKEN
```

### Log Monitoring
Scan build and run logs using curl with Bearer token:

```bash
# Build logs
curl -N -H "Authorization: Bearer $HF_TOKEN" "https://huggingface.co/api/spaces/Leon4gr45/builder/logs/build"

# Run logs (once build succeeds)
curl -N -H "Authorization: Bearer $HF_TOKEN" "https://huggingface.co/api/spaces/Leon4gr45/builder/logs/run"
```

Monitor for 300 seconds to verify deployment success. If any logs indicate failure, fix issues in codebase, redeploy, and monitor in a cycle.

### Exclusions & Size Limits
- Set up `.hfignore` to ignore large local directories such as `node_modules/*`, `.next/*`, `.git/*`.

### Middleware Matcher Exclusion
- Next.js matcher in `middleware.ts` must explicitly allow `/health` and `/api-docs` so Hugging Face load balancers can reach them without running into authentication loops or redirects.
