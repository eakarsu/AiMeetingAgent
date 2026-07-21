# AI Meeting Agent

This repository now contains a deliberately small, dependency-free local application boundary. It was restored from an empty repository after inspecting the earlier Product Management Copilot where applicable; no sibling implementation was copied wholesale.

Implemented:

- a static UI with explicit loading and connection-error states;
- a health endpoint;
- a validated local draft endpoint at `/api/meetings`;
- a smoke test that uses an isolated ephemeral port.

Not implemented: durable storage, user authentication/authorization, third-party providers, AI inference, production execution, deployment, or compliance controls. Records returned by the draft endpoint are process-local examples and disappear immediately; they must not be treated as system-of-record data.

Use Node.js 18 or newer. Run `npm test` for the isolated smoke test. Run `./start.sh` only when you intentionally want the local server; it binds to `127.0.0.1` and uses `PORT` when set, otherwise port 3000. The launcher performs no installation, migration, seeding, or process cleanup.
