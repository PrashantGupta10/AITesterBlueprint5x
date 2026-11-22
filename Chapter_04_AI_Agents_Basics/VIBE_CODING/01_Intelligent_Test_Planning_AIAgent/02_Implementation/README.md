# Jira Test Plan Generator

Simple React frontend and Node/Express backend.

## Run

Prerequisites: Node.js 18+.

```bash
cd implementation
npm install
npm start
```

Open `http://localhost:3000`.

For frontend development, use `npm run dev`; Vite uses `http://localhost:5173` and proxies `/api` to port 3000.

## Deploy to Vercel

Set the Vercel project root to this `02_Implementation` folder. The included `vercel.json` builds the frontend as static output and routes `/api/*` to the serverless Express handler. Add `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_TOKEN`, and `GROQ_API_KEY` as Vercel Environment Variables for the environments you deploy to; optionally set `GROQ_MODEL`. Never put credential values in source files or commit `.env`.

## Configuration

The server reads `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_TOKEN`, and `GROQ_API_KEY` from the repository parent `.env` file. Set `GROQ_MODEL` to override the default `openai/gpt-oss-120b`. Values entered in Settings are used only for that request and are not stored or logged.

No credentials are committed in this source folder.

## Use

Enter a Jira issue ID such as `QA-123`, then generate a draft test plan. Settings provides Jira and Groq/Ollama connection tests.

## Verification

- Frontend build and backend startup are verified when dependencies are available.
- Jira and Groq calls require live credentials and network access.
- Missing live inputs produce clear configuration or connection errors.
- Groq authentication, quota, request, and network errors are shown with useful detail; the server does not silently hide generation failures.
- Missing Jira details are marked `Insufficient information to determine.`
