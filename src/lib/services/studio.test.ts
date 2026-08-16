import { beforeEach, describe, expect, it } from "vitest";
import { assertTransition } from "../domain/types";
import { krea2MediumRequestSchema } from "../domain/schemas";
import { FixtureGenerationProvider } from "../providers/fixture";
import {
  approvePlan,
  getSnapshot,
  ingestWebhook,
  seedReplay,
  submitApprovedDirections,
} from "./studio";

beforeEach(() => {
  seedReplay("replay");
  seedReplay("failure");
});

describe("project state machine", () => {
  it("fails closed on illegal transitions", () => {
    expect(() => assertTransition("draft", "exported")).toThrow(
      /Invalid project transition/,
    );
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
    const queued = await provider.getJob(submitted.job_id);
    expect(queued.status).toBe("queued");
    const cancelled = await provider.cancelJob(submitted.job_id);
    expect(cancelled.status).toBe("cancelled");
  });
});

describe("approval gate", () => {
  it("refuses generation without an approval", async () => {
    await expect(submitApprovedDirections("replay-failure")).rejects.toThrow(
      /explicit approval/,
    );
  });

  it("submits six jobs after approval", async () => {
    approvePlan("replay-price-of-existence", "ok");
    const snap = await submitApprovedDirections("replay-price-of-existence");
    expect(snap.jobs.length).toBe(6);
    expect(
      getSnapshot("replay-price-of-existence")?.approvals.length,
    ).toBeGreaterThan(0);
  });
});

describe("webhooks", () => {
  it("rejects unknown job ids", () => {
    expect(() =>
      ingestWebhook({
        job_id: "does-not-exist",
        status: "completed",
        result: { urls: [] },
      }),
    ).toThrow(/Unknown job_id/);
  });

  it("treats duplicate terminal deliveries as no-ops after recording", async () => {
    approvePlan("replay-price-of-existence", "ok");
    const snap = await submitApprovedDirections("replay-price-of-existence");
    const jobId = snap.jobs[0].providerJobId;
    const payload = {
      job_id: jobId,
      status: "completed" as const,
      result: { urls: ["/fixtures/out/faithful-1.svg"] },
    };
    const first = ingestWebhook(payload);
    const second = ingestWebhook(payload);
    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(true);
  });
});
