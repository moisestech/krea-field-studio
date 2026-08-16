import { createHash, randomUUID } from "node:crypto";
import {
  assertTransition,
  TERMINAL_STATES,
  type ProjectSnapshot,
  type ProjectStatus,
} from "../domain/types";
import type {
  GenerationJob,
  KreaJobState,
  WebhookReceipt,
} from "../domain/types";
import { buildReplaySnapshot } from "../fixtures/replay";
import { FixtureGenerationProvider } from "../providers/fixture";
import {
  KreaGenerationProvider,
  requestHash,
  webhookIdempotencyKey,
} from "../providers/krea";
import type { GenerationProvider } from "../providers/types";
import { IMAGE_MODEL } from "../fixtures/constants";
import { krea2MediumRequestSchema } from "../domain/schemas";

const snapshots = new Map<string, ProjectSnapshot>();
const providers = new Map<string, GenerationProvider>();

function clone<T>(value: T): T {
  return structuredClone(value);
}

function touch(snap: ProjectSnapshot, status?: ProjectStatus): void {
  if (status && status !== snap.project.status) {
    assertTransition(snap.project.status, status);
    snap.project.status = status;
  }
  snap.project.updatedAt = new Date().toISOString();
}

export function getSnapshot(id: string): ProjectSnapshot | undefined {
  return snapshots.get(id) ? clone(snapshots.get(id)!) : undefined;
}

export function listSnapshots(): ProjectSnapshot[] {
  return [...snapshots.values()].map(clone);
}

export function seedReplay(
  mode: "replay" | "failure" = "replay",
): ProjectSnapshot {
  const snap = buildReplaySnapshot();
  if (mode === "failure") {
    snap.project.id = "replay-failure";
    snap.project.mode = "failure";
    snap.project.title = "Mock failure — recovery behavior";
    snap.brief.projectId = snap.project.id;
    for (const d of snap.directions) d.projectId = snap.project.id;
    for (const a of snap.assets) a.projectId = snap.project.id;
  }
  snapshots.set(snap.project.id, snap);
  providers.set(
    snap.project.id,
    new FixtureGenerationProvider(
      mode === "failure" ? { failureJobIndex: 2 } : {},
    ),
  );
  return clone(snap);
}

export function ensureSeeds(): void {
  if (!snapshots.has("replay-price-of-existence")) seedReplay("replay");
  if (!snapshots.has("replay-failure")) seedReplay("failure");
}

function providerFor(snap: ProjectSnapshot): GenerationProvider {
  const existing = providers.get(snap.project.id);
  if (existing) return existing;
  const created =
    snap.project.mode === "live"
      ? new KreaGenerationProvider()
      : new FixtureGenerationProvider();
  providers.set(snap.project.id, created);
  return created;
}

export function approvePlan(projectId: string, note: string): ProjectSnapshot {
  const snap = snapshots.get(projectId);
  if (!snap) throw new Error("Unknown project");
  if (snap.project.mode === "live" && !process.env.KREA_API_KEY) {
    throw new Error("Live generation requires KREA_API_KEY on the server.");
  }
  snap.approvals.push({
    id: randomUUID(),
    projectId,
    subjectType: "plan",
    subjectId: "generation-plan",
    decision: "approve",
    note,
    createdAt: new Date().toISOString(),
  });
  for (const d of snap.directions.slice(0, 6)) {
    d.status = "approved_for_generation";
  }
  touch(snap, snap.project.status === "draft" ? "plan_ready" : undefined);
  if (snap.project.status === "plan_ready") touch(snap, "generating");
  return clone(snap);
}

export async function submitApprovedDirections(
  projectId: string,
): Promise<ProjectSnapshot> {
  const snap = snapshots.get(projectId);
  if (!snap) throw new Error("Unknown project");
  const plan = snap.approvals.find(
    (a) => a.subjectType === "plan" && a.decision === "approve",
  );
  if (!plan) throw new Error("No live generation before explicit approval.");
  const provider = providerFor(snap);
  const pending = snap.directions.filter(
    (d) => d.status === "approved_for_generation" && !d.jobId,
  );
  for (const direction of pending) {
    const params = krea2MediumRequestSchema.parse({
      prompt: direction.prompt,
      aspect_ratio: "16:9",
      resolution: "1K",
      ...direction.parametersJson,
    });
    const artwork = snap.assets.find((a) => a.kind === "artwork");
    const site = snap.assets.find((a) => a.kind === "site");
    if (site)
      params.image_url = site.url.startsWith("http") ? site.url : undefined;
    if (artwork?.url.startsWith("http")) {
      params.image_style_references = [{ url: artwork.url, strength: 0.62 }];
    }
    const submitted = await provider.submitImage(params);
    const job: GenerationJob = {
      id: randomUUID(),
      projectId,
      directionId: direction.id,
      provider: snap.project.mode === "live" ? "krea" : "fixture",
      providerJobId: submitted.job_id,
      providerStatus: submitted.status,
      requestHash: requestHash(params),
      attempt: 1,
      submittedAt: submitted.created_at,
      resultUrls: [],
    };
    snap.jobs.push(job);
    direction.jobId = job.id;
    direction.modelId = IMAGE_MODEL;
  }
  touch(snap, "generating");
  return clone(snap);
}

export async function pollJobs(projectId: string): Promise<ProjectSnapshot> {
  const snap = snapshots.get(projectId);
  if (!snap) throw new Error("Unknown project");
  const provider = providerFor(snap);
  for (const job of snap.jobs) {
    if (TERMINAL_STATES.includes(job.providerStatus)) continue;
    const fresh = await provider.getJob(job.providerJobId);
    job.providerStatus = fresh.status;
    if (fresh.result?.urls?.length) job.resultUrls = fresh.result.urls;
    if (fresh.error) {
      job.errorCode = fresh.error.code;
      job.errorMessage = fresh.error.message;
    }
    if (TERMINAL_STATES.includes(fresh.status)) {
      job.completedAt = fresh.completed_at ?? new Date().toISOString();
      const dir = snap.directions.find((d) => d.id === job.directionId);
      if (dir && fresh.status === "completed") dir.status = "generated";
    }
  }
  const batch = snap.jobs.filter((j) =>
    snap.directions.some(
      (d) =>
        d.jobId === j.id &&
        ["faithful", "material", "surprise"].includes(d.lane),
    ),
  );
  const initial = snap.directions.filter(
    (d) => !d.id.includes("refine") && !d.id.includes("motion"),
  );
  const initialJobs = snap.jobs.filter((j) =>
    initial.some((d) => d.id === j.directionId),
  );
  if (
    initialJobs.length >= 6 &&
    initialJobs.every((j) => TERMINAL_STATES.includes(j.providerStatus)) &&
    snap.project.status === "generating"
  ) {
    touch(snap, "review_ready");
  }
  void batch;
  return clone(snap);
}

export async function cancelJob(
  projectId: string,
  jobId: string,
): Promise<ProjectSnapshot> {
  const snap = snapshots.get(projectId);
  if (!snap) throw new Error("Unknown project");
  const job = snap.jobs.find((j) => j.id === jobId);
  if (!job) throw new Error("Unknown job");
  const fresh = await providerFor(snap).cancelJob(job.providerJobId);
  job.providerStatus = fresh.status;
  job.completedAt = fresh.completed_at ?? new Date().toISOString();
  return clone(snap);
}

export function selectDirection(
  projectId: string,
  directionId: string,
  note: string,
): ProjectSnapshot {
  const snap = snapshots.get(projectId);
  if (!snap) throw new Error("Unknown project");
  for (const d of snap.directions) {
    if (d.id === directionId) d.status = "selected";
    else if (d.status === "generated") d.status = "rejected";
  }
  snap.approvals.push({
    id: randomUUID(),
    projectId,
    subjectType: "direction",
    subjectId: directionId,
    decision: "approve",
    note,
    createdAt: new Date().toISOString(),
  });
  touch(snap, snap.project.status === "review_ready" ? "approved" : undefined);
  return clone(snap);
}

export async function submitRefinements(
  projectId: string,
  prompts: string[],
): Promise<ProjectSnapshot> {
  const snap = snapshots.get(projectId);
  if (!snap) throw new Error("Unknown project");
  const selected = snap.directions.find((d) => d.status === "selected");
  if (!selected) throw new Error("Select a direction first.");
  const provider = providerFor(snap);
  const selectedJob = snap.jobs.find((j) => j.directionId === selected.id);
  const start = selectedJob?.resultUrls[0];
  for (const [i, prompt] of prompts.slice(0, 3).entries()) {
    const id = `dir-refine-${i + 1}`;
    if (snap.directions.some((d) => d.id === id)) continue;
    const params = krea2MediumRequestSchema.parse({
      prompt,
      aspect_ratio: "16:9",
      resolution: "1K",
      creativity: "raw",
      strength: 0.4,
      image_url: start?.startsWith("http") ? start : undefined,
    });
    const submitted = await provider.submitImage(params);
    snap.directions.push({
      id,
      projectId,
      lane: selected.lane,
      label: `Refinement ${i + 1}`,
      rationale:
        "Bounded change on the approved still. Operator-authored, not auto-ranked.",
      prompt,
      modelId: IMAGE_MODEL,
      parametersJson: params,
      status: "approved_for_generation",
    });
    const job: GenerationJob = {
      id: randomUUID(),
      projectId,
      directionId: id,
      provider: snap.project.mode === "live" ? "krea" : "fixture",
      providerJobId: submitted.job_id,
      providerStatus: submitted.status,
      requestHash: requestHash(params),
      attempt: 1,
      submittedAt: submitted.created_at,
      resultUrls: [],
    };
    snap.jobs.push(job);
    snap.directions.at(-1)!.jobId = job.id;
  }
  return clone(snap);
}

export async function submitMotion(
  projectId: string,
  prompt: string,
): Promise<ProjectSnapshot> {
  const snap = snapshots.get(projectId);
  if (!snap) throw new Error("Unknown project");
  const selected = snap.directions.find((d) => d.status === "selected");
  const still = snap.jobs.find((j) => j.directionId === selected?.id)
    ?.resultUrls[0];
  const submitted = await providerFor(snap).submitVideo({
    prompt,
    start_image: still?.startsWith("http") ? still : undefined,
    aspect_ratio: "16:9",
    duration: 5,
  });
  const id = "dir-motion";
  snap.directions.push({
    id,
    projectId,
    lane: selected?.lane ?? "faithful",
    label: "Motion study",
    rationale: "Optional 5s camera move. Not a finished film.",
    prompt,
    modelId: "video/kling/kling-2.5",
    parametersJson: { duration: 5, aspect_ratio: "16:9" },
    status: "approved_for_generation",
    jobId: undefined,
  });
  const job: GenerationJob = {
    id: randomUUID(),
    projectId,
    directionId: id,
    provider: snap.project.mode === "live" ? "krea" : "fixture",
    providerJobId: submitted.job_id,
    providerStatus: submitted.status,
    requestHash: requestHash({ prompt, duration: 5 }),
    attempt: 1,
    submittedAt: submitted.created_at,
    resultUrls: [],
  };
  snap.jobs.push(job);
  snap.directions.find((d) => d.id === id)!.jobId = job.id;
  return clone(snap);
}

export function saveFieldNote(
  projectId: string,
  note: Omit<
    NonNullable<ProjectSnapshot["fieldNote"]>,
    "projectId" | "createdAt"
  >,
): ProjectSnapshot {
  const snap = snapshots.get(projectId);
  if (!snap) throw new Error("Unknown project");
  snap.fieldNote = {
    ...note,
    projectId,
    createdAt: new Date().toISOString(),
  };
  if (snap.project.status === "approved") touch(snap, "exported");
  return clone(snap);
}

export function ingestWebhook(payload: {
  job_id: string;
  status: KreaJobState;
  result?: { urls?: string[] };
}): { ok: true; duplicate: boolean } {
  ensureSeeds();
  const body = JSON.stringify(payload);
  const payloadHash = createHash("sha256").update(body).digest("hex");
  let matched: ProjectSnapshot | undefined;
  let job: GenerationJob | undefined;
  for (const snap of snapshots.values()) {
    job = snap.jobs.find((j) => j.providerJobId === payload.job_id);
    if (job) {
      matched = snap;
      break;
    }
  }
  if (!matched || !job) {
    throw new Error("Unknown job_id");
  }
  const key = webhookIdempotencyKey({
    provider: job.provider,
    jobId: payload.job_id,
    status: payload.status,
    payloadHash,
  });
  const existing = matched.receipts.find((r) => r.idempotencyKey === key);
  const receipt: WebhookReceipt = {
    id: randomUUID(),
    idempotencyKey: key,
    provider: job.provider,
    providerJobId: payload.job_id,
    status: payload.status,
    payloadHash,
    duplicate: Boolean(existing),
    receivedAt: new Date().toISOString(),
  };
  matched.receipts.push(receipt);
  if (existing) return { ok: true, duplicate: true };
  const terminal = TERMINAL_STATES.includes(payload.status);
  if (
    terminal &&
    TERMINAL_STATES.includes(job.providerStatus) &&
    job.providerStatus === payload.status
  ) {
    return { ok: true, duplicate: true };
  }
  job.providerStatus = payload.status;
  if (payload.result?.urls) job.resultUrls = payload.result.urls;
  if (terminal) job.completedAt = new Date().toISOString();
  return { ok: true, duplicate: false };
}

ensureSeeds();
