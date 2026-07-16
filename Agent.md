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
- The token is read from the environment variable (never hardcode it).

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
  - **Response:**
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
  - **Purpose:** Serve documentation or routes specification of the available APIs.
  - **Response:** JSON list of the endpoints.

### Functional Endpoints

All the available functional endpoints listed in `/health` under the endpoint groups (like `auth`, `public`, `analytics`, etc.) are supported.

---

## 3. Tricks & Troubleshooting

- **Large Upload / Storage Limit (Max: 1 GB):**
  - Since standard `hf upload` without exclusions attempts to scan/upload local `node_modules` and `.next` build files, it can hit the 1 GB storage limit or fail on string limit in JS wrapper.
  - **Fix:** Always explicitly set up `.hfignore` or use `--exclude` to ignore large local directories such as `node_modules/*`, `.next/*`, `.git/*`.
  - Deployment Command:
    ```bash
    hf upload Leon4gr45/builder . --repo-type=space --token=$HF_TOKEN --exclude="node_modules/*" --exclude=".next/*" --exclude=".git/*"
    ```

- **Middleware Matcher Exclusion:**
  - Standard Next.js matcher should explicitly allow `/health` and `/api-docs` so Hugging Face load balancers can reach them without running into authentication loops/redirects.

# Force rebuild comment 1
