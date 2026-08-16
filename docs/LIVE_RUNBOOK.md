# Live run runbook

UNOFFICIAL PROOF OF WORK. Not affiliated with or endorsed by Krea.

Public replay stays the default. This runbook is for one operator-local, human-approved Krea 2 Medium batch. Motion is off.

## Never do this

Do not paste `KREA_API_KEY` into a prompt, chat, screenshot, issue, log, README, or commit. The key stays in a short-lived local `.env` that is already gitignored.

## Status

Recorded live generation is **PLANNED** until a successful `manifest.json` exists and a human has selected which outputs may be public. Do not label replay fixtures `LIVE`.

## 1. Dry-run (zero network)

```bash
npm run live:plan
```

Confirm all six rows: model `image/krea/krea-2/medium`, lane, prompt, seed, style-reference URL (owned artwork), request count `6`, estimated spend under `$1`.

If the printed plan is wrong, stop. Do not record.

## 2. Authorize spend

1. Confirm the separate Krea **API USD wallet** (not app compute units) at [krea.ai/app/api](https://www.krea.ai/app/api/).
2. Create a short-lived token at [API tokens](https://www.krea.ai/settings/api-tokens).
3. Put it only in local `.env`:

```bash
KREA_API_KEY=...          # never commit
KREA_LIVE_ACK=SPEND_UNDER_1_USD
```

`live:record` refuses to run without both values.

## 3. Execute locally

```bash
npm run live:record
```

Behavior:

- Uses `KreaGenerationProvider` (no second API client).
- Submits at most six Krea 2 Medium image jobs.
- Polls every 2–5 seconds with bounded exponential backoff on HTTP 429.
- Stops and cancels pending jobs on HTTP 402 or interrupt.
- Writes a secret-free bundle to `.artifacts/live-run/<timestamp>/` (`plan.json`, `manifest.json`, `outputs/`).
- `.artifacts/` is gitignored.

Failed and cancelled jobs are not billed ([API billing](https://www.krea.ai/docs/developers/api-keys-and-billing)).

## 4. Review rights

Open the outputs. For each still decide: keep private, or promote with a `LIVE` label. Artwork rights stay with Moises Sanabria, _Price of Existence_, 2024.

## 5. Promote (human-reviewed, separate step)

Only after rights review:

1. Copy selected stills into a clearly labeled `static/live/` folder.
2. Keep replay fixtures in place. Public demo must not depend on paid inference.
3. Update the status table from **PLANNED** to **LIVE** for the recorded batch only.
4. Commit images + redacted manifest. Never commit `.env` or `.artifacts/`.

## 6. Update public status

- Field Studio `/live` remains informational. It does not spend.
- Application site may add a `LIVE` media set without relabeling replay frames.

## Billing notes

- Endpoint: `POST /generate/image/krea/krea-2/medium` ([Krea 2 Medium](https://www.krea.ai/docs/api-reference/krea/krea-2-medium)).
- Lifecycle: [job lifecycle](https://www.krea.ai/docs/developers/job-lifecycle).
- Estimated six Medium stills: about `$0.21`, cap `$1.00`.
