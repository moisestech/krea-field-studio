import { createHash } from "node:crypto";
import type { ImageGenerationInput, VideoGenerationInput } from "./types";
import type { GenerationProvider, ProviderJob, SubmittedJob } from "./types";
import type { KreaJobState } from "../domain/types";

type ScriptEvent = {
  atMs: number;
  status: KreaJobState;
  urls?: string[];
  error?: { code: string; message: string };
};

type InternalJob = {
  kind: "image" | "video";
  createdAt: number;
  script: ScriptEvent[];
  cancelled: boolean;
  inputHash: string;
  outputUrl: string;
};

const WAITING: KreaJobState[] = ["queued", "scheduled"];
const GEN: KreaJobState[] = ["processing", "sampling", "intermediate-complete"];

function hash(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex")
    .slice(0, 16);
}

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

function happyScript(outputUrl: string, fail = false): ScriptEvent[] {
  if (fail) {
    return [
      { atMs: 0, status: "queued" },
      { atMs: 400, status: "processing" },
      {
        atMs: 900,
        status: "failed",
        error: {
          code: "provider_error",
          message: "Fixture failure: sampling rejected the prompt.",
        },
      },
    ];
  }
  return [
    { atMs: 0, status: "queued" },
    { atMs: 350, status: "scheduled" },
    { atMs: 700, status: "processing" },
    { atMs: 1100, status: "sampling" },
    { atMs: 1500, status: "intermediate-complete", urls: [outputUrl] },
    { atMs: 1900, status: "processing" },
    { atMs: 2400, status: "completed", urls: [outputUrl] },
  ];
}

export class FixtureGenerationProvider implements GenerationProvider {
  private jobs = new Map<string, InternalJob>();
  private seq = 0;

  constructor(
    private readonly options: {
      failureJobIndex?: number;
      cancelableJobIndex?: number;
    } = {},
  ) {}

  private nextId(): string {
    this.seq += 1;
    return `fix_${String(this.seq).padStart(3, "0")}`;
  }

  private resolve(job: InternalJob): ProviderJob {
    const elapsed = Date.now() - job.createdAt;
    if (job.cancelled) {
      return {
        job_id:
          [...this.jobs.entries()].find(([, v]) => v === job)?.[0] ?? "unknown",
        status: "cancelled",
        created_at: iso(job.createdAt),
        completed_at: iso(job.createdAt + elapsed),
        result: null,
      };
    }
    let current = job.script[0];
    for (const event of job.script) {
      if (elapsed >= event.atMs) current = event;
    }
    const jobId =
      [...this.jobs.entries()].find(([, v]) => v === job)?.[0] ?? "unknown";
    const terminal =
      current.status === "completed" ||
      current.status === "failed" ||
      current.status === "cancelled";
    return {
      job_id: jobId,
      status: current.status,
      created_at: iso(job.createdAt),
      completed_at: terminal ? iso(job.createdAt + current.atMs) : null,
      result: current.urls
        ? { urls: current.urls }
        : current.error
          ? { urls: [], error: current.error.message }
          : null,
      error: current.error,
    };
  }

  private submit(
    kind: "image" | "video",
    input: unknown,
    outputUrl: string,
  ): SubmittedJob {
    const id = this.nextId();
    const index = this.seq;
    const fail = this.options.failureJobIndex === index;
    const job: InternalJob = {
      kind,
      createdAt: Date.now(),
      script: happyScript(outputUrl, fail),
      cancelled: false,
      inputHash: hash(input),
      outputUrl,
    };
    this.jobs.set(id, job);
    return {
      job_id: id,
      status: "queued",
      created_at: iso(job.createdAt),
    };
  }

  async submitImage(input: ImageGenerationInput): Promise<SubmittedJob> {
    const seed = typeof input.seed === "number" ? input.seed : 2400 + this.seq;
    const bySeed: Record<number, string> = {
      2401: "/fixtures/out/faithful-1.svg",
      2402: "/fixtures/out/faithful-2.svg",
      2403: "/fixtures/out/material-1.svg",
      2404: "/fixtures/out/material-2.svg",
      2405: "/fixtures/out/surprise-1.svg",
      2406: "/fixtures/out/surprise-2.svg",
    };
    const url =
      bySeed[seed] ?? `/fixtures/out/refine-${((this.seq - 1) % 3) + 1}.svg`;
    return this.submit("image", input, url);
  }

  async submitVideo(input: VideoGenerationInput): Promise<SubmittedJob> {
    return this.submit("video", input, "/fixtures/out/motion-poster.svg");
  }

  async getJob(jobId: string): Promise<ProviderJob> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Unknown fixture job: ${jobId}`);
    }
    const resolved = this.resolve(job);
    resolved.job_id = jobId;
    return resolved;
  }

  async cancelJob(jobId: string): Promise<ProviderJob> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Unknown fixture job: ${jobId}`);
    const current = this.resolve(job);
    if (current.status !== "queued" && current.status !== "processing") {
      return { ...current, job_id: jobId };
    }
    job.cancelled = true;
    return this.getJob(jobId);
  }
}

export { WAITING, GEN };
