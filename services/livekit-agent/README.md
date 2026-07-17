# LiveKit + Gemini 3.1 Live assessment agent

This Node.js worker is intentionally deployed separately from the Next.js application. It is explicitly dispatched as `quisqueyatech-assessment`, joins a unique private assessment room, runs `gemini-3.1-flash-live-preview` through LiveKit Agents, and sends structured discoveries to Convex through the private progress API.

## Required contract

- Keep `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, and `ASSESSMENT_WORKER_SECRET` in worker infrastructure.
- Fetch the editable Gemini model, voice, temperature, and API key from the authenticated `/api/assessment/worker-config` endpoint at the start of every session.
- Register with the exact agent name `quisqueyatech-assessment` and accept explicit dispatches for rooms whose names start with `assessment-`.
- Use the same discovery sequence documented in `Docs/README.md`: process, tools, volume, manual work, problem, impact, constraints, and desired outcome.
- Publish input/output transcription segments for the browser, but use the finalized `SessionReport` as the canonical transcript.
- Record audio and transcript in LiveKit Insights, end after 15 minutes, and write provider metrics through the server API; never expose Gemini credentials to the browser.
- Do not add `generateReply`, `updateInstructions`, or mid-session chat-context updates while using Gemini 3.1. The model currently accepts instructions only during initial setup; tool responses provide subsequent private guidance.

Deploy one worker in dev first, verify a complete consented assessment, then deploy it to LiveKit Cloud with Agent Observability enabled and a 30-day retention policy.

## Run locally

Dependencies live only in this package (not in the Next.js root `package.json`).

```bash
cd services/livekit-agent
npm install
npm run dev
# or from repo root:
# npm run agent:dev
```

Configure `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `ASSESSMENT_WORKER_SECRET`, and `NEXT_PUBLIC_SITE_URL`. The worker retrieves session-time Gemini configuration through the authenticated server endpoint and never exposes it to the browser.
