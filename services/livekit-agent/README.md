# LiveKit + Gemini 3.1 Live assessment agent

This Node.js worker is intentionally deployed separately from the Next.js application. It is explicitly dispatched as `quisqueyatech-assessment`, joins a unique private assessment room, runs `gemini-3.1-flash-live-preview` through LiveKit Agents, and sends structured discoveries to Convex through the private progress API.

## Required contract

- Keep `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, and `ASSESSMENT_WORKER_SECRET` in worker infrastructure.
- Fetch the editable Gemini model, voice, temperature, and API key from the authenticated `/api/assessment/worker-config` endpoint at the start of every session.
- Register with the exact agent name `quisqueyatech-assessment` and accept explicit dispatches for rooms whose names start with `assessment-`.
- Use the same discovery sequence documented in `Docs/README.md`: process, tools, volume, manual work, problem, impact, constraints, and desired outcome.
- Publish input/output transcription segments for the browser, but use the finalized `SessionReport` as the canonical transcript.
- Record audio and transcript in LiveKit Insights, end after 15 minutes, and write provider metrics through the server API; never expose Gemini credentials to the browser.
- Publish `initializing` while configuration and Gemini start, `ready` only after
  `AgentSession.start`, and durable `finalizing` metadata before a normal hangup.
- Natural completion, an explicit visitor request, and the hard time limit must
  persist their terminal reason before deleting the room.
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

## Deploy to LiveKit Cloud

Official references:

- Agent deployment quickstart: https://docs.livekit.io/deploy/agents/quickstart/
- Deployment management: https://docs.livekit.io/deploy/agents/managing-deployments/
- Secrets management: https://docs.livekit.io/deploy/agents/secrets/
- Builds and Dockerfiles: https://docs.livekit.io/deploy/agents/builds/
- Billing and metering: https://docs.livekit.io/deploy/admin/billing/
- Pricing: https://livekit.com/pricing
- Quotas and limits: https://docs.livekit.io/deploy/admin/quotas-and-limits/

This directory is the LiveKit agent project. Run LiveKit CLI commands from here
so the CLI can use `livekit.toml`.

```bash
cd services/livekit-agent
lk cloud auth
lk project list
lk project set-default "live-translate-r87y5gh3"
lk agent deploy
```

If `livekit.toml` is missing or a new LiveKit Cloud agent must be registered,
use `lk agent create` instead of `lk agent deploy`. This project already has a
`livekit.toml` with project subdomain `live-translate-r87y5gh3` and agent id
`CA_NhXtiwpZB9zh`, so normal updates should use `lk agent deploy`.

Required runtime secrets for this worker:

```bash
lk agent update-secrets \
  --secrets "ASSESSMENT_WORKER_SECRET=<same value as the web app>" \
  --secrets "ASSESSMENT_APP_URL=https://www.quisqueyatech.com"
```

LiveKit Cloud automatically injects `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and
`LIVEKIT_API_SECRET` for the associated project, and those values cannot be set
manually as deployment secrets. Keep application-specific secrets out of source
control and update them with `lk agent update-secrets`; changing secrets causes a
rolling restart for new sessions.

Useful operations:

```bash
lk agent status
lk agent logs
lk agent secrets
lk agent rollback
```

LiveKit bills hosted agents by agent session minute: time starts after the agent
connects to a WebRTC or SIP room and stops when the room ends or the agent
disconnects. The Build plan includes 1,000 agent session minutes and supports up
to 5 concurrent agent sessions, with possible 10-20 second cold starts. Paid
plans include larger monthly minute allowances and then bill additional hosted
agent time at the published per-minute rate.
