import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { KreaApiError, isKreaApiError } from "../providers/errors";
import { KreaGenerationProvider } from "../providers/krea";
import type { GenerationProvider, ProviderJob } from "../providers/types";
import { TERMINAL_STATES, type KreaJobState } from "../domain/types";
import {
  LIVE_ACK,
  MAX_IMAGE_JOBS,
  assertLiveAuthorization,
  planLiveRun,
  type LivePlan,
  type LivePlanItem,
} from "./plan";
import { assertNoSecretLeak, redactSecrets } from "./redact";

const POLL_MIN_MS = 2_000;
const POLL_MAX_MS = 5_000;
const BACKOFF_CAP_MS = 30_000;
const JOB_TIMEOUT_MS = 8 * 60_000;

export type LiveRecordDeps = {
  provider?: GenerationProvider;
  env?: NodeJS.ProcessEnv;
  now?: () => Date;
  sleep?: (ms: number) => Promise<void>;
  fetch?: typeof fetch;
  artifactsRoot?: string;
  abortSignal?: AbortSignal;
  log?: (message: string) => void;
  plan?: LivePlan;
};

export type RecordedJob = {
  id: string;
  lane: string;
  label: string;
  requestHash: string;
  jobId: string | null;
  status: KreaJobState | "not_submitted";
  submittedAt: string | null;
  completedAt: string | null;
  resultUrls: string[];
  localOutputs: string[];
  error?: string;
};

export type LiveRunManifest = {
  mode: "live";
  acknowledgement: typeof LIVE_ACK;
  startedAt: string;
  finishedAt: string;
  motion: "off";
  requestCount: number;
  estimatedUsd: number;
  jobs: RecordedJob[];
  cancelledOnInterrupt: boolean;
  stoppedReason: string | null;
};

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pollDelay(attempt: number): number {
  const exp = Math.min(
    POLL_MIN_MS * 2 ** Math.max(0, attempt - 1),
    BACKOFF_CAP_MS,
  );
  return Math.min(Math.max(exp, POLL_MIN_MS), Math.max(POLL_MAX_MS, exp));
}

async function withRetry<T>(
  label: string,
  fn: () => Promise<T>,
  sleep: (ms: number) => Promise<void>,
  log: (message: string) => void,
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      if (isKreaApiError(err) && err.status === 429) {
        attempt += 1;
        const wait = pollDelay(attempt);
        log(`${label}: 429 backoff ${wait}ms`);
        await sleep(wait);
        continue;
      }
      throw err;
    }
  }
}

export async function recordLiveRun(deps: LiveRecordDeps = {}): Promise<{
  dir: string;
  manifest: LiveRunManifest;
}> {
  const env = deps.env ?? process.env;
  assertLiveAuthorization(env);
  const plan = deps.plan ?? planLiveRun();
  if (plan.items.length > MAX_IMAGE_JOBS) {
    throw new Error(
      `Refusing to submit more than ${MAX_IMAGE_JOBS} image jobs.`,
    );
  }

  const provider =
    deps.provider ??
    new KreaGenerationProvider({
      getApiKey: () => env.KREA_API_KEY,
      fetch: deps.fetch,
    });
  const sleep = deps.sleep ?? defaultSleep;
  const log = deps.log ?? ((message) => console.log(message));
  const started = deps.now?.() ?? new Date();
  const stamp = started.toISOString().replace(/[:.]/g, "-");
  const root = deps.artifactsRoot ?? path.resolve(".artifacts/live-run");
  const dir = path.join(root, stamp);
  await mkdir(path.join(dir, "outputs"), { recursive: true });

  const jobs: RecordedJob[] = plan.items.map((item) => ({
    id: item.id,
    lane: item.lane,
    label: item.label,
    requestHash: item.requestHash,
    jobId: null,
    status: "not_submitted",
    submittedAt: null,
    completedAt: null,
    resultUrls: [],
    localOutputs: [],
  }));

  let cancelledOnInterrupt = false;
  let stoppedReason: string | null = null;

  const cancelPending = async () => {
    cancelledOnInterrupt = true;
    for (const job of jobs) {
      if (!job.jobId) continue;
      if (
        job.status === "completed" ||
        job.status === "failed" ||
        job.status === "cancelled"
      ) {
        continue;
      }
      try {
        const cancelled = await provider.cancelJob(job.jobId);
        job.status = cancelled.status;
        job.completedAt = cancelled.completed_at;
      } catch (err) {
        job.error = err instanceof Error ? err.message : "cancel failed";
      }
    }
  };

  const onAbort = () => {
    void cancelPending();
  };
  deps.abortSignal?.addEventListener("abort", onAbort);

  try {
    for (const [index, item] of plan.items.entries()) {
      if (deps.abortSignal?.aborted) {
        stoppedReason = "interrupted";
        await cancelPending();
        break;
      }
      try {
        const submitted = await withRetry(
          item.id,
          () => provider.submitImage(item.request),
          sleep,
          log,
        );
        jobs[index] = {
          ...jobs[index],
          jobId: submitted.job_id,
          status: submitted.status,
          submittedAt: submitted.created_at,
        };
      } catch (err) {
        if (isKreaApiError(err) && err.status === 402) {
          stoppedReason = "http_402_empty_balance";
          jobs[index].error = err.message;
          await cancelPending();
          break;
        }
        throw err;
      }
    }

    if (!stoppedReason) {
      await pollUntilTerminal({
        provider,
        jobs,
        items: plan.items,
        sleep,
        log,
        signal: deps.abortSignal,
        fetchImpl: deps.fetch ?? fetch,
        outputDir: path.join(dir, "outputs"),
        now: () => deps.now?.() ?? new Date(),
        onInterrupt: cancelPending,
      });
    }
  } finally {
    deps.abortSignal?.removeEventListener("abort", onAbort);
  }

  const finished = deps.now?.() ?? new Date();
  const manifest: LiveRunManifest = {
    mode: "live",
    acknowledgement: LIVE_ACK,
    startedAt: started.toISOString(),
    finishedAt: finished.toISOString(),
    motion: "off",
    requestCount: plan.items.length,
    estimatedUsd: plan.estimatedUsd,
    jobs,
    cancelledOnInterrupt,
    stoppedReason,
  };

  await writeBundle(dir, plan, manifest, env.KREA_API_KEY ?? "");
  return { dir, manifest };
}

async function pollUntilTerminal(input: {
  provider: GenerationProvider;
  jobs: RecordedJob[];
  items: LivePlanItem[];
  sleep: (ms: number) => Promise<void>;
  log: (message: string) => void;
  signal?: AbortSignal;
  fetchImpl: typeof fetch;
  outputDir: string;
  now: () => Date;
  onInterrupt: () => Promise<void>;
}): Promise<void> {
  const started = Date.now();
  let attempt = 0;
  while (input.jobs.some((job) => job.jobId && !isTerminal(job.status))) {
    if (input.signal?.aborted) {
      await input.onInterrupt();
      return;
    }
    if (Date.now() - started > JOB_TIMEOUT_MS) {
      throw new Error("Live record timed out waiting for terminal job states.");
    }
    for (const job of input.jobs) {
      if (!job.jobId || isTerminal(job.status)) continue;
      try {
        const fresh = await withRetry(
          job.id,
          () => input.provider.getJob(job.jobId!),
          input.sleep,
          input.log,
        );
        applyJob(job, fresh);
        if (fresh.status === "completed") {
          job.localOutputs = await downloadOutputs(
            fresh,
            input.outputDir,
            job.id,
            input.fetchImpl,
          );
        }
      } catch (err) {
        if (isKreaApiError(err) && err.status === 402) {
          job.error = err.message;
          await input.onInterrupt();
          return;
        }
        throw err;
      }
    }
    attempt += 1;
    await input.sleep(
      Math.min(POLL_MAX_MS, Math.max(POLL_MIN_MS, pollDelay(attempt) / 2)),
    );
  }
}

function isTerminal(status: RecordedJob["status"]): boolean {
  return (
    status !== "not_submitted" &&
    TERMINAL_STATES.includes(status as KreaJobState)
  );
}

function applyJob(job: RecordedJob, fresh: ProviderJob): void {
  job.status = fresh.status;
  job.completedAt = fresh.completed_at;
  job.resultUrls = fresh.result?.urls ?? [];
  if (fresh.error?.message) job.error = fresh.error.message;
}

async function downloadOutputs(
  job: ProviderJob,
  outputDir: string,
  id: string,
  fetchImpl: typeof fetch,
): Promise<string[]> {
  const saved: string[] = [];
  for (const [i, url] of (job.result?.urls ?? []).entries()) {
    if (!url.startsWith("http://") && !url.startsWith("https://")) continue;
    const res = await fetchImpl(url);
    if (!res.ok) continue;
    const ext = extensionFor(res.headers.get("content-type"), url);
    const file = path.join(outputDir, `${id}-${i + 1}${ext}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(file, buf);
    saved.push(path.relative(path.dirname(outputDir), file));
  }
  return saved;
}

function extensionFor(contentType: string | null, url: string): string {
  if (contentType?.includes("png")) return ".png";
  if (contentType?.includes("jpeg") || contentType?.includes("jpg"))
    return ".jpg";
  if (contentType?.includes("webp")) return ".webp";
  const match = url.match(/\.(png|jpg|jpeg|webp)(?:\?|$)/i);
  return match ? `.${match[1].toLowerCase()}` : ".bin";
}

async function writeBundle(
  dir: string,
  plan: LivePlan,
  manifest: LiveRunManifest,
  apiKey: string,
): Promise<void> {
  const secrets = [apiKey];
  const safePlan = redactSecrets(
    {
      ...plan,
      items: plan.items.map((item) => ({
        id: item.id,
        lane: item.lane,
        label: item.label,
        model: item.model,
        seed: item.seed,
        prompt: item.prompt,
        requestHash: item.requestHash,
        request: item.request,
      })),
    },
    secrets,
  );
  const safeManifest = redactSecrets(manifest, secrets);
  const planText = JSON.stringify(safePlan, null, 2);
  const manifestText = JSON.stringify(safeManifest, null, 2);
  assertNoSecretLeak(planText, secrets);
  assertNoSecretLeak(manifestText, secrets);
  await writeFile(path.join(dir, "plan.json"), planText);
  await writeFile(path.join(dir, "manifest.json"), manifestText);
}

export { planLiveRun };
