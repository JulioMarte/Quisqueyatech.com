# LiveKit + Gemini Live prototype

This worker is intentionally deployed separately from the Next.js application. The web app creates a private LiveKit room and an ephemeral participant token; a LiveKit Agents worker must join that room and connect the shared assessment script to Gemini Live.

## Required contract

- Read `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, and `GEMINI_API_KEY` from the worker environment.
- Join rooms whose names start with `assessment-`.
- Use the same discovery sequence documented in `Docs/README.md`: process, tools, volume, manual work, problem, impact, constraints, and desired outcome.
- Publish final transcription segments so the browser can build the same transcript used by Ultravox.
- End after 15 minutes and write provider metrics through the server API; never expose Gemini credentials to the browser.

Deploy one worker in dev first. The production worker should only be enabled if LiveKit wins the documented provider scorecard; otherwise set `VOICE_PROVIDER=ultravox` and leave this worker disabled.

