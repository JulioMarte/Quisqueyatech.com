# LiveKit + Gemini Live prototype

This Node.js worker is intentionally deployed separately from the Next.js application. It joins private assessment rooms, runs Gemini Live through LiveKit Agents, and sends structured discoveries to the same provider-neutral progress API used by Ultravox and Gemini Direct.

## Required contract

- Read `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, and `GEMINI_API_KEY` from the worker environment.
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

Configure `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `GEMINI_API_KEY`, `NEXT_PUBLIC_SITE_URL`, and `GEMINI_LIVE_MODEL`. The web app passes a short-lived assessment token as a participant attribute; the worker never receives an Ultravox or browser credential.
