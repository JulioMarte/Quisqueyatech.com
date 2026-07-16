# LiveKit + Gemini Live prototype

This Node.js worker is intentionally deployed separately from the Next.js application. It joins private assessment rooms, runs Gemini Live through LiveKit Agents, and sends structured discoveries to the same provider-neutral progress API used by Ultravox and Gemini Direct.

## Required contract

- Keep `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, and `ASSESSMENT_WORKER_SECRET` in worker infrastructure.
- Fetch the editable Gemini model, voice, temperature, and API key from the authenticated `/api/assessment/worker-config` endpoint at the start of every session.
- Join rooms whose names start with `assessment-`.
- Use the same discovery sequence documented in `Docs/README.md`: process, tools, volume, manual work, problem, impact, constraints, and desired outcome.
- Publish final transcription segments so the browser can build the same transcript used by Ultravox.
- End after 15 minutes and write provider metrics through the server API; never expose Gemini credentials to the browser.

Deploy one worker in dev first. The production worker should only be enabled if LiveKit wins the documented provider scorecard; otherwise set `VOICE_PROVIDER=ultravox` and leave this worker disabled.

## Run locally

```bash
cd services/livekit-agent
npm install
npm run dev
```

Configure `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `ASSESSMENT_WORKER_SECRET`, and `NEXT_PUBLIC_SITE_URL`. The worker retrieves session-time Gemini configuration through the authenticated server endpoint and never exposes it to the browser.
