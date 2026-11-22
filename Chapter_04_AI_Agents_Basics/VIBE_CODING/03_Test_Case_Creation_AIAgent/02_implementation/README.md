# Jira Test Case Generator

## Requirements

- Node.js 20 or newer
- The parent repository `.env` with `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_TOKEN`, and `GROQ_API_KEY`
- Jira access to the requested issue and Groq API access

There is no `config.md` in the supplied project. The backend reads the existing `.env` from the repository root; it never sends credentials to the browser. `GROQ_MODEL` is optional and defaults to `openai/gpt-oss-120b`. To test a local Ollama instance, optionally set `OLLAMA_BASE_URL`.

## Run

From this `02_implementation` folder:

```powershell
npm install
npm run dev
```

Open `http://localhost:5173`. The React app runs on port 5173 and its API runs on port 3101. Port 3000 is not used.

For a production build:

```powershell
npm run build
npm start
```

The backend then serves the built app on port 3101.

## Use

Enter one Jira issue key, such as `VWO-140`, and select **Prompt (JIRA Ticket)**. The server validates the key, fetches the issue read-only, and asks Groq to produce the supplied test-case template. Open **Settings** to test the server-configured Jira and Groq connections.

The settings page reports whether credentials are configured without returning their values. Jira and Groq secrets remain on the server. Ollama testing requires `OLLAMA_BASE_URL`; no local-model URL was supplied.

## Verification and limitations

- `npm test` covers issue-key validation, named Jira-field extraction, and mocked Jira retrieval/Groq generation. The mocked checks do not claim a live provider connection.
- `npm run build` verifies the React production build.
- Live Jira/Groq generation requires valid credentials, network access, and an issue ID supplied by the user. No live issue was fetched during implementation.
- Generation uses Groq with temperature `0`; output can still vary by provider/model version. All results are marked **DRAFT** for human review.
