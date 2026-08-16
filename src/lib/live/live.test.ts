import { mkdtemp, readFile, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KreaApiError } from "../providers/errors";
import { KreaGenerationProvider } from "../providers/krea";
import type {
  GenerationProvider,
  ProviderJob,
  SubmittedJob,
} from "../providers/types";
import {
  LIVE_ACK,
  MAX_IMAGE_JOBS,
  assertLiveAuthorization,
  planLiveRun,
} from "./plan";
import { redactSecrets } from "./redact";
import { recordLiveRun } from "./record";

const secret = "krea_test_secret_value_do_not_leak";

afterEach(() => {
  vi.unstubAllGlobals();
});

function authEnv(overrides: Record<string, string | undefined> = {}) {
  return {
    KREA_API_KEY: secret,
    KREA_LIVE_ACK: LIVE_ACK,
    ...overrides,
  };
}

function job(status: ProviderJob["status"], urls: string[] = []): ProviderJob {
  return {
    job_id: "job_1",
    status,
    created_at: "2026-08-16T16:00:00.000Z",
    completed_at: status === "completed" ? "2026-08-16T16:00:02.000Z" : null,
    result: urls.length ? { urls } : null,
  };
}

describe("live:plan dry-run", () => {
  it("validates six Krea 2 Medium requests and makes zero network calls", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const plan = planLiveRun();
    expect(plan.requestCount).toBe(6);
    expect(plan.items).toHaveLength(MAX_IMAGE_JOBS);
    expect(plan.motion).toBe("off");
    expect(plan.estimatedUsd).toBeLessThanOrEqual(plan.maximumEstimatedUsd);
    for (const item of plan.items) {
      expect(item.request.aspect_ratio).toBe("16:9");
      expect(item.request.resolution).toBe("1K");
      expect(item.request.prompt.length).toBeGreaterThan(20);
      expect(item.requestHash).toMatch(/^[a-f0-9]{64}$/);
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("live authorization", () => {
  it("refuses to record without acknowledgement", async () => {
    expect(() => assertLiveAuthorization({ KREA_API_KEY: secret })).toThrow(
      /KREA_LIVE_ACK/,
    );
    await expect(
      recordLiveRun({
        env: authEnv({ KREA_LIVE_ACK: undefined }),
        provider: {} as GenerationProvider,
      }),
    ).rejects.toThrow(/KREA_LIVE_ACK/);
  });

  it("refuses to record without an API key", async () => {
    expect(() => assertLiveAuthorization({ KREA_LIVE_ACK: LIVE_ACK })).toThrow(
      /KREA_API_KEY/,
    );
  });
});

describe("live:record", () => {
  it("refuses more than six image jobs before any submit", async () => {
    const submitImage = vi.fn();
    const plan = planLiveRun();
    plan.items.push({ ...plan.items[0], id: "extra" });
    await expect(
      recordLiveRun({
        env: authEnv(),
        plan,
        provider: { submitImage } as unknown as GenerationProvider,
        artifactsRoot: await mkdtemp(path.join(os.tmpdir(), "live-")),
      }),
    ).rejects.toThrow(/more than 6/);
    expect(submitImage).not.toHaveBeenCalled();
  });

  it("stops on HTTP 402 and cancels pending jobs", async () => {
    const cancelJob = vi.fn(async (id: string) => job("cancelled"));
    let submits = 0;
    const provider: GenerationProvider = {
      async submitImage() {
        submits += 1;
        if (submits === 1) {
          return {
            job_id: "job_1",
            status: "queued",
            created_at: "2026-08-16T16:00:00.000Z",
          };
        }
        throw new KreaApiError(402, "empty wallet");
      },
      async submitVideo() {
        throw new Error("motion off");
      },
      async getJob() {
        return job("queued");
      },
      cancelJob,
    };
    const tmp = await mkdtemp(path.join(os.tmpdir(), "live-"));
    const result = await recordLiveRun({
      env: authEnv(),
      provider,
      artifactsRoot: tmp,
      sleep: async () => undefined,
    });
    expect(result.manifest.stoppedReason).toBe("http_402_empty_balance");
    expect(cancelJob).toHaveBeenCalled();
  });

  it("backs off on HTTP 429 then reaches a terminal state", async () => {
    let polls = 0;
    const provider: GenerationProvider = {
      async submitImage(): Promise<SubmittedJob> {
        return {
          job_id: "job_1",
          status: "queued",
          created_at: "2026-08-16T16:00:00.000Z",
        };
      },
      async submitVideo() {
        throw new Error("motion off");
      },
      async getJob() {
        polls += 1;
        if (polls === 1) throw new KreaApiError(429, "slow down");
        return job("completed", ["https://cdn.example/out.png"]);
      },
      async cancelJob() {
        return job("cancelled");
      },
    };
    const tmp = await mkdtemp(path.join(os.tmpdir(), "live-"));
    const sleeps: number[] = [];
    const result = await recordLiveRun({
      env: authEnv(),
      provider,
      artifactsRoot: tmp,
      plan: {
        ...planLiveRun(),
        items: planLiveRun().items.slice(0, 1),
        requestCount: 1,
      },
      sleep: async (ms) => {
        sleeps.push(ms);
      },
      fetch: (async () =>
        new Response(new Uint8Array([1, 2, 3]), {
          headers: { "content-type": "image/png" },
        })) as typeof fetch,
    });
    expect(result.manifest.jobs[0].status).toBe("completed");
    expect(sleeps.some((ms) => ms >= 2000)).toBe(true);
  });

  it("redacts secrets from the written bundle", async () => {
    const provider: GenerationProvider = {
      async submitImage(): Promise<SubmittedJob> {
        return {
          job_id: "job_1",
          status: "completed",
          created_at: "2026-08-16T16:00:00.000Z",
        };
      },
      async submitVideo() {
        throw new Error("motion off");
      },
      async getJob() {
        return job("completed");
      },
      async cancelJob() {
        return job("cancelled");
      },
    };
    const tmp = await mkdtemp(path.join(os.tmpdir(), "live-"));
    const result = await recordLiveRun({
      env: authEnv(),
      provider,
      artifactsRoot: tmp,
      plan: {
        ...planLiveRun(),
        items: planLiveRun().items.slice(0, 1),
        requestCount: 1,
      },
      sleep: async () => undefined,
    });
    const files = await readdir(result.dir);
    expect(files).toContain("manifest.json");
    const manifest = await readFile(
      path.join(result.dir, "manifest.json"),
      "utf8",
    );
    const plan = await readFile(path.join(result.dir, "plan.json"), "utf8");
    expect(manifest).not.toContain(secret);
    expect(plan).not.toContain(secret);
    expect(JSON.parse(manifest).mode).toBe("live");
  });
});

describe("KreaGenerationProvider HTTP mapping", () => {
  it("throws typed 402 and 429 errors", async () => {
    const fetch402: typeof fetch = async () =>
      new Response("empty", { status: 402 });
    const a = new KreaGenerationProvider({
      fetch: fetch402,
      getApiKey: () => secret,
    });
    await expect(
      a.submitImage({ prompt: "x", aspect_ratio: "16:9", resolution: "1K" }),
    ).rejects.toMatchObject({ status: 402 });

    const fetch429: typeof fetch = async () =>
      new Response("wait", { status: 429 });
    const b = new KreaGenerationProvider({
      fetch: fetch429,
      getApiKey: () => secret,
    });
    await expect(b.getJob("abc")).rejects.toMatchObject({ status: 429 });
  });
});

describe("redaction", () => {
  it("strips bearer tokens and known secret keys", () => {
    const out = redactSecrets(
      { Authorization: `Bearer ${secret}`, nested: { KREA_API_KEY: secret } },
      [secret],
    ) as Record<string, unknown>;
    expect(JSON.stringify(out)).not.toContain(secret);
  });
});
