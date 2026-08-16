import { createHash } from "node:crypto";
import {
  krea2MediumRequestSchema,
  kling25RequestSchema,
  providerJobSchema,
} from "../domain/schemas";
import type { KreaJobState } from "../domain/types";
import type {
  GenerationProvider,
  ImageGenerationInput,
  ProviderJob,
  SubmittedJob,
  VideoGenerationInput,
} from "./types";

const API = "https://api.krea.ai";

function requireKey(): string {
  const key = process.env.KREA_API_KEY;
  if (!key) {
    throw new Error("KREA_API_KEY is not set. Live mode is disabled.");
  }
  return key;
}

async function kreaFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${requireKey()}`);
  headers.set("Content-Type", "application/json");
  const webhook = process.env.KREA_WEBHOOK_URL;
  if (webhook && init.method === "POST") {
    headers.set("X-Webhook-URL", webhook);
  }
  const res = await fetch(`${API}${path}`, { ...init, headers });
  if (res.status === 402) {
    throw new Error(
      "Krea API balance is empty (HTTP 402). Top up at https://www.krea.ai/app/api/ — this is a separate USD wallet from app compute units.",
    );
  }
  return res;
}

function asProviderJob(raw: unknown): ProviderJob {
  const parsed = providerJobSchema.parse(raw);
  const urls =
    parsed.result && Array.isArray(parsed.result.urls)
      ? parsed.result.urls.filter((u): u is string => typeof u === "string")
      : [];
  return {
    job_id: parsed.job_id,
    status: parsed.status,
    created_at: parsed.created_at,
    completed_at: parsed.completed_at ?? null,
    result: parsed.result ? { urls, error: parsed.result.error } : null,
    error: parsed.error,
  };
}

export class KreaGenerationProvider implements GenerationProvider {
  async submitImage(input: ImageGenerationInput): Promise<SubmittedJob> {
    const body = krea2MediumRequestSchema.parse(input);
    const res = await kreaFetch("/generate/image/krea/krea-2/medium", {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `Krea image submit failed (${res.status}): ${text.slice(0, 300)}`,
      );
    }
    const job = asProviderJob(await res.json());
    return {
      job_id: job.job_id,
      status: job.status,
      created_at: job.created_at,
    };
  }

  async submitVideo(input: VideoGenerationInput): Promise<SubmittedJob> {
    const body = kling25RequestSchema.parse(input);
    const res = await kreaFetch("/generate/video/kling/kling-2.5", {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `Krea video submit failed (${res.status}): ${text.slice(0, 300)}`,
      );
    }
    const job = asProviderJob(await res.json());
    return {
      job_id: job.job_id,
      status: job.status,
      created_at: job.created_at,
    };
  }

  async getJob(jobId: string): Promise<ProviderJob> {
    const res = await kreaFetch(`/jobs/${jobId}`);
    if (!res.ok) {
      throw new Error(`Krea getJob failed (${res.status})`);
    }
    return asProviderJob(await res.json());
  }

  async cancelJob(jobId: string): Promise<ProviderJob> {
    const res = await kreaFetch(`/jobs/${jobId}`, { method: "DELETE" });
    if (!res.ok) {
      return this.getJob(jobId);
    }
    try {
      return asProviderJob(await res.json());
    } catch {
      return {
        job_id: jobId,
        status: "cancelled" satisfies KreaJobState,
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        result: null,
      };
    }
  }
}

export function requestHash(input: unknown): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

export function webhookIdempotencyKey(input: {
  provider: string;
  jobId: string;
  status: string;
  payloadHash: string;
}): string {
  return `${input.provider}:${input.jobId}:${input.status}:${input.payloadHash}`;
}
