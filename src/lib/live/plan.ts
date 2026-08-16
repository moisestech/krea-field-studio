import {
  krea2MediumRequestSchema,
  type Krea2MediumRequest,
} from "../domain/schemas";
import { ARTWORK, IMAGE_MODEL, LANE_COPY } from "../fixtures/constants";
import { buildReplaySnapshot } from "../fixtures/replay";
import { requestHash } from "../providers/krea";
import { IMAGE_MODEL_ID } from "../providers/types";

export const LIVE_ACK = "SPEND_UNDER_1_USD";
export const MAX_IMAGE_JOBS = 6;
export const UNIT_COST_USD = 0.035;
export const MAX_ESTIMATED_USD = 1;
export const MOTION_DEFAULT = "off" as const;

export type LivePlanItem = {
  id: string;
  lane: "faithful" | "material" | "surprise";
  label: string;
  model: string;
  seed: number | null;
  prompt: string;
  request: Krea2MediumRequest;
  requestHash: string;
};

export type LivePlan = {
  title: string;
  model: string;
  motion: typeof MOTION_DEFAULT;
  requestCount: number;
  estimatedUsd: number;
  maximumEstimatedUsd: number;
  acknowledgementRequired: typeof LIVE_ACK;
  notes: string[];
  items: LivePlanItem[];
};

const STYLE_STRENGTH: Record<LivePlanItem["lane"], number> = {
  faithful: 0.45,
  material: 0.62,
  surprise: 0.8,
};

export function buildLiveImageRequests(): LivePlanItem[] {
  const snap = buildReplaySnapshot();
  const items: LivePlanItem[] = [];
  for (const direction of snap.directions.slice(0, MAX_IMAGE_JOBS)) {
    const seed =
      typeof direction.parametersJson.seed === "number"
        ? direction.parametersJson.seed
        : null;
    const request = krea2MediumRequestSchema.parse({
      prompt: direction.prompt,
      aspect_ratio: "16:9",
      resolution: "1K",
      ...direction.parametersJson,
      image_style_references: [
        { url: ARTWORK, strength: STYLE_STRENGTH[direction.lane] },
      ],
    });
    items.push({
      id: direction.id,
      lane: direction.lane,
      label: direction.label,
      model: IMAGE_MODEL,
      seed,
      prompt: direction.prompt,
      request,
      requestHash: requestHash(request),
    });
  }
  if (items.length > MAX_IMAGE_JOBS) {
    throw new Error(`Live plan exceeds the ${MAX_IMAGE_JOBS}-job cap.`);
  }
  return items;
}

export function planLiveRun(): LivePlan {
  const items = buildLiveImageRequests();
  const estimatedUsd = Number((items.length * UNIT_COST_USD).toFixed(3));
  if (estimatedUsd > MAX_ESTIMATED_USD) {
    throw new Error("Estimated spend exceeds the $1 safety cap.");
  }
  return {
    title: "Price of Existence — exhibition previz (image-only live record)",
    model: IMAGE_MODEL_ID,
    motion: MOTION_DEFAULT,
    requestCount: items.length,
    estimatedUsd,
    maximumEstimatedUsd: MAX_ESTIMATED_USD,
    acknowledgementRequired: LIVE_ACK,
    notes: [
      "Public replay remains the default. This plan is operator-local.",
      "Motion / Kling is off. Image jobs only, max six.",
      "Site fixture is an SVG line drawing, so it is described in the prompt rather than sent as image_url.",
      "Artwork style reference is the owned Price of Existence still.",
      `Set KREA_LIVE_ACK=${LIVE_ACK} before live:record.`,
    ],
    items,
  };
}

export function formatPlan(plan: LivePlan): string {
  const lines = [
    `LIVE PLAN (dry-run, zero network)`,
    `Title: ${plan.title}`,
    `Model: ${plan.model}`,
    `Motion: ${plan.motion}`,
    `Requests: ${plan.requestCount}`,
    `Estimated spend: $${plan.estimatedUsd.toFixed(3)} (unit $${UNIT_COST_USD})`,
    `Maximum estimated spend: $${plan.maximumEstimatedUsd.toFixed(2)}`,
    `Acknowledgement: KREA_LIVE_ACK=${plan.acknowledgementRequired}`,
    "",
  ];
  for (const item of plan.items) {
    const refs =
      item.request.image_style_references?.map((r) => r.url).join(", ") ??
      "(none)";
    lines.push(
      `- ${item.label} [${item.lane}]`,
      `  seed: ${item.seed ?? "null"}`,
      `  hash: ${item.requestHash}`,
      `  refs: ${refs}`,
      `  prompt: ${item.prompt}`,
      `  why: ${LANE_COPY[item.lane].why}`,
      "",
    );
  }
  lines.push(...plan.notes.map((n) => `Note: ${n}`));
  return lines.join("\n");
}

export function assertLiveAuthorization(env: NodeJS.ProcessEnv): void {
  if (!env.KREA_API_KEY) {
    throw new Error(
      "KREA_API_KEY is required for live:record. Do not paste it into chat, screenshots, issues, or commits.",
    );
  }
  if (env.KREA_LIVE_ACK !== LIVE_ACK) {
    throw new Error(
      `Refusing to spend. Set KREA_LIVE_ACK=${LIVE_ACK} after reviewing npm run live:plan.`,
    );
  }
}
