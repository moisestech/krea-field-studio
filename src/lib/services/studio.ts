import { createHash, randomUUID } from "node:crypto";
import {
  assertTransition,
  TERMINAL_STATES,
  type ProjectSnapshot,
  type ProjectStatus,
} from "../domain/types";
import type { GenerationJob, KreaJobState, WebhookReceipt } from "../domain/types";
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
const FIXED_REPLAY_IDS = new Set(["replay-price-of-existence", "replay-failure"]);
const MAX_EPHEMERAL_SESSIONS = 100;
const STATE_RANK: Record<KreaJobState, number> = {
  backlogged: 0,
  queued: 1,
  scheduled: 2,
  processing: 3,
  sampling: 4,
  "intermediate-complete": 5,
  completed: 6,
  failed: 6,
  cancelled: 6,
};

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

function getRequiredSnapshot(projectId: string): ProjectSnapshot {
  const snap = snapshots.get(projectId);
  if (!snap) throw new Error("Unknown project");
  if (snap.project.mode === "live") {
    throw new Error("Live projects are not available through public demo routes.");
  }
  return snap;
}

function rekeySnapshot(
  snap: ProjectSnapshot,
  projectId: string,
  mode: "replay" | "failure",
): void {
  snap.project.id = projectId;
  snap.project.mode = mode;
  if (mode === "failure") snap.project.title = "Mock failure — recovery behavior";
  snap.brief.projectId = projectId;
  for (const item of [...snap.assets, ...snap.directions, ...snap.jobs, ...snap.approvals]) {
    item.projectId = projectId;
  }
}

function pruneReplaySessions(): void {
  const ephemeral = [...snapshots.values()]
    .filter((snap) => !FIXED_REPLAY_IDS.has(snap.project.id))
    .sort((a, b) => a.project.updatedAt.localeCompare(b.project.updatedAt));
  for (const snap of ephemeral.slice(0, Math.max(0, ephemeral.length - MAX_EPHEMERAL_SESSIONS))) {
    snapshots.delete(snap.project.id);
    providers.delete(snap.project.id);
  }
}

export function getSnapshot(id: string): ProjectSnapshot | undefined {
  return snapshots.get(id) ? clone(snapshots.get(id)!) : undefined;
}

export function listSnapshots(): ProjectSnapshot[] {
  return [...snapshots.values()].map(clone);
}

export function seedReplay(
  mode: "replay" | "failure" = "replay",
  projectId = mode === "failure" ? "replay-failure" : "replay-price-of-existence",
): ProjectSnapshot {
  const snap = buildReplaySnapshot();
  rekeySnapshot(snap, projectId, mode);
  snapshots.set(projectId, snap);
  providers.set(
    projectId,
    new FixtureGenerationProvider(mode === "failure" ? { failureJobIndex: 2 } : {}),
  );
  pruneReplaySessions();
  return clone(snap);
}

export function createReplaySession(
  mode: "replay" | "failure" = "replay",
): ProjectSnapshot {
  const prefix = mode === "failure" ? "failure" : "replay";
  return seedReplay(mode, prefix + "-" + randomUUID());
}

export function resetReplay(projectId: string): ProjectSnapshot {
  const snap = getRequiredSnapshot(projectId);
  return seedReplay(snap.project.mode === "failure" ? "failure" : "replay", projectId);
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
  const snap = getRequiredSnapshot(projectId);
  if (snap.project.status !== "plan_ready") {
    throw new Error("The generation plan is not ready for approval.");
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
  for (const d of snap.directions.slice(0, 6)) d.status = "approved_for_generation";
  touch(snap, "generating");
  return clone(snap);
}

export async function submitApprovedDirections(projectId: string): Promise<ProjectSnapshot> {
  const snap = getRequiredSnapshot(projectId);
  const plan = snap.approvals.find(
    (a) => a.subjectType === "plan" && a.decision === "approve",
  );
  if (!plan) throw new Error("No generation before explicit approval.");
  if (snap.project.status !== "generating") {
    throw new Error("Project is not in the generating state.");
  }
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
    if (site) params.image_url = site.url.startsWith("http") ? site.url : undefined;
    if (artwork?.url.startsWith("http")) {
      params.image_style_references = [{ url: artwork.url, strength: 0.62 }];
    }
    const submitted = await provider.submitImage(params);
    const job: GenerationJob = {
      id: randomUUID(),
      projectId,
      directionId: direction.id,
      provider: "fixture",
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
  touch(snap);
  return clone(snap);
}

export async function pollJobs(projectId: string): Promise<ProjectSnapshot> {
  const snap = getRequiredSnapshot(projectId);
  const provider = providerFor(snap);
  for (const job of snap.jobs) {
    if (TERMINAL_STATES.includes(job.providerStatus)) continue;
    const fresh = await provider.getJob(job.providerJobId);
    if (STATE_RANK[fresh.status] < STATE_RANK[job.providerStatus]) continue;
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
  } else {
    touch(snap);
  }
  return clone(snap);
}

export async function cancelJob(projectId: string, jobId: string): Promise<ProjectSnapshot> {
  const snap = getRequiredSnapshot(projectId);
  const job = snap.jobs.find((j) => j.id === jobId);
  if (!job) throw new Error("Unknown job");
  const fresh = await providerFor(snap).cancelJob(job.providerJobId);
  job.providerStatus = fresh.status;
  job.completedAt = fresh.completed_at ?? new Date().toISOString();
  touch(snap);
  return clone(snap);
}

export function selectDirection(
  projectId: string,
  directionId: string,
  note: string,
): ProjectSnapshot {
  const snap = getRequiredSnapshot(projectId);
  if (snap.project.status !== "review_ready") {
    throw new Error("Directions can only be selected after review is ready.");
  }
  const selected = snap.directions.find((d) => d.id === directionId);
  const selectedJob = snap.jobs.find((j) => j.directionId === directionId);
  if (!selected || selected.status !== "generated" || selectedJob?.providerStatus !== "completed") {
    throw new Error("Select a completed generated direction.");
  }
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
  touch(snap, "approved");
  return clone(snap);
}

export async function submitRefinements(
  projectId: string,
  prompts: string[],
): Promise<ProjectSnapshot> {
  const snap = getRequiredSnapshot(projectId);
  if (snap.project.status !== "approved") {
    throw new Error("Approve a completed direction before refinement.");
  }
  const selected = snap.directions.find((d) => d.status === "selected");
  const selectedJob = snap.jobs.find((j) => j.directionId === selected?.id);
  if (!selected || selectedJob?.providerStatus !== "completed") {
    throw new Error("Select a completed direction first.");
  }
  const provider = providerFor(snap);
  const start = selectedJob.resultUrls[0];
  for (const [i, prompt] of prompts.slice(0, 3).entries()) {
    const id = "dir-refine-" + (i + 1);
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
      label: "Refinement " + (i + 1),
      rationale: "Bounded change on the approved still. Operator-authored, not auto-ranked.",
      prompt,
      modelId: IMAGE_MODEL,
      parametersJson: params,
      status: "approved_for_generation",
    });
    const job: GenerationJob = {
      id: randomUUID(),
      projectId,
      directionId: id,
      provider: "fixture",
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
  touch(snap);
  return clone(snap);
}

export async function submitMotion(
  projectId: string,
  prompt: string,
  approved: boolean,
): Promise<ProjectSnapshot> {
  const snap = getRequiredSnapshot(projectId);
  if (!approved) throw new Error("Explicit motion approval is required.");
  if (snap.project.status !== "approved") {
    throw new Error("Approve a completed still before motion generation.");
  }
  const selected = snap.directions.find((d) => d.status === "selected");
  const selectedJob = snap.jobs.find((j) => j.directionId === selected?.id);
  if (!selected || selectedJob?.providerStatus !== "completed") {
    throw new Error("Select a completed direction before motion generation.");
  }
  if (snap.directions.some((d) => d.id === "dir-motion")) {
    throw new Error("A motion study already exists for this run.");
  }
  snap.approvals.push({
    id: randomUUID(),
    projectId,
    subjectType: "motion",
    subjectId: "dir-motion",
    decision: "approve",
    note: "Explicit approval for one 5-second motion study.",
    createdAt: new Date().toISOString(),
  });
  const still = selectedJob.resultUrls[0];
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
    lane: selected.lane,
    label: "Motion study",
    rationale: "Optional 5s camera move. Not a finished film.",
    prompt,
    modelId: "video/kling/kling-2.5",
    parametersJson: { duration: 5, aspect_ratio: "16:9" },
    status: "approved_for_generation",
  });
  const job: GenerationJob = {
    id: randomUUID(),
    projectId,
    directionId: id,
    provider: "fixture",
    providerJobId: submitted.job_id,
    providerStatus: submitted.status,
    requestHash: requestHash({ prompt, duration: 5 }),
    attempt: 1,
    submittedAt: submitted.created_at,
    resultUrls: [],
  };
  snap.jobs.push(job);
  snap.directions.at(-1)!.jobId = job.id;
  touch(snap);
  return clone(snap);
}

export function saveFieldNote(
  projectId: string,
  note: Omit<NonNullable<ProjectSnapshot["fieldNote"]>, "projectId" | "createdAt">,
): ProjectSnapshot {
  const snap = getRequiredSnapshot(projectId);
  if (!["approved", "exported"].includes(snap.project.status)) {
    throw new Error("Approve a direction before exporting a field note.");
  }
  snap.fieldNote = { ...note, projectId, createdAt: new Date().toISOString() };
  if (snap.project.status === "approved") touch(snap, "exported");
  else touch(snap);
  return clone(snap);
}

export function ingestWebhook(payload: {
  job_id: string;
  status: KreaJobState;
  result?: { urls?: string[] };
}): { ok: true; duplicate: boolean } {
  if (!TERMINAL_STATES.includes(payload.status)) {
    throw new Error("Webhook accepts terminal job states only.");
  }
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
  if (!matched || !job) throw new Error("Unknown job_id");
  const key = webhookIdempotencyKey({
    provider: job.provider,
    jobId: payload.job_id,
    status: payload.status,
    payloadHash,
  });
  const existing = matched.receipts.find((r) => r.idempotencyKey === key);
  const terminalLocked = TERMINAL_STATES.includes(job.providerStatus);
  const duplicate = Boolean(existing) || terminalLocked;
  const receipt: WebhookReceipt = {
    id: randomUUID(),
    idempotencyKey: key,
    provider: job.provider,
    providerJobId: payload.job_id,
    status: payload.status,
    payloadHash,
    duplicate,
    receivedAt: new Date().toISOString(),
  };
  matched.receipts.push(receipt);
  if (duplicate) return { ok: true, duplicate: true };
  job.providerStatus = payload.status;
  if (payload.result?.urls) job.resultUrls = payload.result.urls;
  job.completedAt = new Date().toISOString();
  touch(matched);
  return { ok: true, duplicate: false };
}

ensureSeeds();
