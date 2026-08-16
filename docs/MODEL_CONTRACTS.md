# Model contracts

UNOFFICIAL PROOF OF WORK. Not affiliated with or endorsed by Krea.

Krea MCP (`https://api.krea.ai/mcp`) was not connected in this Cursor session. Contracts below are copied from the public OpenAPI on 2026-08-16:

- [Krea 2 Medium](https://docs.krea.ai/api-reference/krea/krea-2-medium)
- [Kling 2.5](https://docs.krea.ai/api-reference/video/kling-25)
- [Job lifecycle](https://docs.krea.ai/developers/job-lifecycle)
- [Get a job by ID](https://docs.krea.ai/api-reference/general/get-a-job-by-id)

Do not invent extra fields. `additionalProperties: false` on both request bodies.

## Selected models

| Use                            | Model ID (API path)        | SDK helper                            | Why                                                                                                                             |
| ------------------------------ | -------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Image directions + refinements | `image/krea/krea-2/medium` | `krea.image("krea/krea-2/medium", …)` | Official Krea 2; cheapest image path ($0.03); `image_url` + `strength` for site/artwork img2img; style refs for the three lanes |
| Optional motion study          | `video/kling/kling-2.5`    | `krea.video("kling/kling-2.5", …)`    | Documented image-to-video example; 5s default; `start_image` + motion prompt                                                    |

Endpoint URLs:

- `POST https://api.krea.ai/generate/image/krea/krea-2/medium`
- `POST https://api.krea.ai/generate/video/kling/kling-2.5`
- `GET https://api.krea.ai/jobs/{id}`
- `DELETE https://api.krea.ai/jobs/{id}` — cancel only while queued or processing

## Job states (persist exactly)

`backlogged` · `queued` · `scheduled` · `processing` · `sampling` · `intermediate-complete` · `completed` · `failed` · `cancelled`

UI groups: Waiting (`backlogged|queued|scheduled`), Generating (`processing|sampling|intermediate-complete`), Finished (`completed|failed|cancelled`). Exact provider state remains inspectable.

Failed and cancelled jobs are not billed.

## Krea 2 Medium — request fields we use

Required: `prompt`, `aspect_ratio`, `resolution`.

| Field                                   | Value in Field Studio                             | Notes                             |
| --------------------------------------- | ------------------------------------------------- | --------------------------------- |
| `prompt`                                | Lane-specific previz prompt                       | Required                          |
| `aspect_ratio`                          | `16:9`                                            | Exhibition board                  |
| `resolution`                            | `1K`                                              | Only documented value             |
| `creativity`                            | `raw` faithful · `low` material · `high` surprise | Enum: `raw\|low\|medium\|high`    |
| `image_url`                             | Site still (gallery)                              | Img2img; optional                 |
| `strength`                              | 0.35 faithful · 0.55 material · 0.72 surprise     | 0 keeps input, 1 ignores it       |
| `image_style_references`                | Artwork URL, strength 0.45–0.8                    | Max 10; each `{ url, strength? }` |
| `intensity` / `complexity` / `movement` | 0 unless lane sets a slider                       | −100…100, default 0               |
| `seed`                                  | Recorded per direction                            | Reproducibility                   |
| `styles`, `moodboards`                  | Unused in MVP                                     | Require Krea-hosted IDs           |

Headers: `Authorization: Bearer $KREA_API_KEY`, optional `X-Webhook-URL`.

## Kling 2.5 — request fields we use

Required: `prompt`.

| Field          | Value in Field Studio       | Notes                         |
| -------------- | --------------------------- | ----------------------------- |
| `prompt`       | Camera/motion language only | Required                      |
| `start_image`  | Approved still URL          | Asset URL / https / data URI  |
| `aspect_ratio` | `16:9`                      | Enum: `16:9\|9:16\|1:1`       |
| `duration`     | `5`                         | `5` or `10` only; $0.0735/sec |
| `end_image`    | Unused                      | Optional                      |

## Webhooks

No signature mechanism is documented. Validate by correlating `job_id` to a job this app created. Idempotency key: `provider + job_id + terminal_status + sha256(payload)`. Return 2xx quickly.

## Billing gate

API balance is a **separate USD wallet** from app compute units. Empty balance returns HTTP 402. Public demo is replay until a live run is funded at [krea.ai/app/api](https://www.krea.ai/app/api/).

Estimated one recorded run (Medium img2img + style refs): 6 × $0.035 + 3 refinements × $0.035 + optional 5s Kling ≈ $0.32 + $0.37 ≈ **under $1**.
