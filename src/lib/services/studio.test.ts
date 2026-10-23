import { beforeEach, describe, expect, it, vi } from "vitest";
import { assertTransition } from "../domain/types";
import { krea2MediumRequestSchema } from "../domain/schemas";
import { FixtureGenerationProvider } from "../providers/fixture";
import {
  approvePlan,
  createReplaySession,
  getSnapshot,
  ingestWebhook,
  pollJobs,
  seedReplay,
  selectDirection,
  submitApprovedDirections,
  submitMotion,
} from "./studio";

beforeEach(() => {
  vi.useRealTimers();
  seedReplay("replay");
  seedReplay("failure");
});

describe("project state machine", () => {
  it("fails closed on illegal transitions", () => {
    expect(() => assertTransition("draft", "exported")).toThrow(/Invalid project transition/);
  });

  it("creates isolated public replay sessions", () => {
    const first = createReplaySession();
    const second = createReplaySession();
    expect(first.project.id).not.toBe(second.project.id);
    expect(first.jobs).toHaveLength(0);
    expect(second.jobs).toHaveLength(0);
  });
});

describe("Krea 2 request contract", () => {
  it("rejects undocumented fields", () => {
    const parsed = krea2MediumRequestSchema.safeParse({
      prompt: "x",
      aspect_ratio: "16:9",
      resolution: "1K",
      unknown_field: true,
    });
    expect(parsed.success).toBe(false);
  });
});

describe("fixture provider contract", () => {
  it("submits, reaches a terminal state, and supports cancel while queued", async () => {
    const provider = new FixtureGenerationProvider();
    const submitted = await provider.submitImage({
      prompt: "test",
      aspect_ratio: "16:9",
      resolution: "1K",
      seed: 2401,
    });
    expect(submitted.job_id).toBeTruthy();
    expect((await provider.getJob(submitted.job_id)).status).toBe("queued");
    expect((await provider.cancelJob(submitted.job_id)).status).toBe("cancelled");
  });
});

describe("approval and selection gates", () => {
  it("refuses generation without an approval", async () => {
    await expect(submitApprovedDirections("replay-failure")).rejects.toThrow(/explicit approval/);
  });

  it("rejects selection before a completed review set", async () => {
    approvePlan("replay-price-of-existence", "ok");
    await submitApprovedDirections("replay-price-of-existence");
    expect(() =>
      selectDirection("replay-price-of-existence", "dir-faithful-a", "pick"),
    ).toThrow(/review is ready/);
  });

  it("requires explicit approval for motion", async () => {
    vi.useFakeTimers();
    approvePlan("replay-price-of-existence", "ok");
    await submitApprovedDirections("replay-price-of-existence");
    await vi.advanceTimersByTimeAsync(3000);
    const reviewed = await pollJobs("replay-price-of-existence");
    const completed = reviewed.directions.find((d) => d.status === "generated");
    expect(completed).toBeTruthy();
    selectDirection("replay-price-of-existence", completed!.id, "pick");
    await expect(
      submitMotion("replay-price-of-existence", "slow dolly", false),
    ).rejects.toThrow(/Explicit motion approval/);
  });
});

describe("webhooks", () => {
  it("rejects unknown and nonterminal deliveries", () => {
    expect(() =>
      ingestWebhook({ job_id: "does-not-exist", status: "completed", result: { urls: [] } }),
    ).toThrow(/Unknown job_id/);
    expect(() =>
      ingestWebhook({ job_id: "does-not-exist", status: "processing" }),
    ).toThrow(/terminal job states/);
  });

  it("records duplicate terminal deliveries without changing the job", async () => {
    approvePlan("replay-price-of-existence", "ok");
    const snap = await submitApprovedDirections("replay-price-of-existence");
    const jobId = snap.jobs[0].providerJobId;
    const completed = {
      job_id: jobId,
      status: "completed" as const,
      result: { urls: ["/fixtures/out/faithful-1.svg"] },
    };
    expect(ingestWebhook(completed).duplicate).toBe(false);
    expect(ingestWebhook(completed).duplicate).toBe(true);
    expect(
      ingestWebhook({ job_id: jobId, status: "failed" as const }).duplicate,
    ).toBe(true);
    expect(getSnapshot("replay-price-of-existence")?.jobs[0].providerStatus).toBe("completed");
  });
});
