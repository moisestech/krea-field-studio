# Krea Field Studio

**Unofficial proof of work. Not affiliated with or endorsed by Krea.**

A small SvelteKit application that demonstrates the engineering around a controlled creative-production workflow: brief → lanes → explicit approval → asynchronous jobs → human selection → bounded refinement → proposal → operator field note.

## What the public demo is

- /replay creates an isolated, ephemeral fixture session for each visitor.
- /failure creates the same workflow with one scripted provider failure.
- Fixture output is deterministic, locally authored SVG material labeled **REPLAY**.
- Public routes do not execute paid Krea jobs.
- The Krea REST provider and strict request contracts are implemented as integration evidence, but no public live runner or recorded live result is claimed.

Run it: [krea-field-studio.vercel.app/replay](https://krea-field-studio.vercel.app/replay)

## Safety and state guarantees

- Generation requires an explicit plan approval.
- A direction can only be selected after its job has completed and the review set is ready.
- Refinement requires an approved, completed still.
- Motion requires a second explicit approval and an approved, completed still.
- Browser polling is serial at two-second intervals, stops on terminal states, and is cancelled when the component is destroyed.
- Job states never move backward.
- Webhooks accept known job IDs and terminal states only. Repeated or conflicting terminal deliveries are recorded as no-ops.
- Replay state is memory-only and capped; it is not durable database persistence.

## Local setup

    npm install
    npm run dev

Open http://localhost:5173/replay. No credentials are required.

The server-only Krea provider expects KREA_API_KEY. It is intentionally unreachable from the public fixture routes until authentication, durable persistence, and a funded test run are added.

Model contracts: [docs/MODEL_CONTRACTS.md](docs/MODEL_CONTRACTS.md). The checked-in Krea 2 Medium and Kling 2.5 schemas were copied from public OpenAPI on 2026-08-16 and should be revalidated before enabling live execution.

## Rights and limitations

- Artwork still: Moises Sanabria, _Price of Existence_, 2024; artist-owned documentation.
- Site still: synthetic gallery drawing, not a venue survey.
- Replay outputs are original fixture boards, not Krea generations.
- This is creative previsualization, not CAD, structural, scale, feasibility, or permitting evidence.

## Tests

    npm test
    npm run test:e2e

Vitest covers request contracts, state gates, replay isolation, and webhook idempotency. Playwright exercises the complete replay path through field-note export plus reset behavior.
