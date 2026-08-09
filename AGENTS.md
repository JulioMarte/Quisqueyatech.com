<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

## LiveKit agent deployments

Before changing or deploying the LiveKit assessment worker in
`services/livekit-agent`, consult the official LiveKit docs referenced in that
package's README. There is no local Codex skill for the LiveKit CLI in this
workspace, so use the project docs plus the official LiveKit CLI/deployment
documentation as the source of truth.
