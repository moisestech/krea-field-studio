import { z } from "zod";
import { KREA_JOB_STATES, PROJECT_STATUSES } from "./types";

export const kreaJobStateSchema = z.enum(KREA_JOB_STATES);
export const projectStatusSchema = z.enum(PROJECT_STATUSES);
export const laneSchema = z.enum(["faithful", "material", "surprise"]);
export const modeSchema = z.enum(["replay", "live", "failure"]);

export const krea2MediumRequestSchema = z
  .object({
    prompt: z.string().min(1),
    aspect_ratio: z.enum([
      "1:1",
      "4:3",
      "3:2",
      "16:9",
      "2.35:1",
      "4:5",
      "2:3",
      "9:16",
    ]),
    resolution: z.literal("1K"),
    seed: z.number().nullable().optional(),
    creativity: z.enum(["raw", "low", "medium", "high"]).optional(),
    image_url: z.string().max(1024).nullable().optional(),
    strength: z.number().min(0).max(1).optional(),
    intensity: z.number().int().min(-100).max(100).optional(),
    complexity: z.number().int().min(-100).max(100).optional(),
    movement: z.number().int().min(-100).max(100).optional(),
    image_style_references: z
      .array(
        z.object({
          url: z.string().max(1024),
          strength: z.number().min(0).max(1).optional(),
        }),
      )
      .max(10)
      .optional(),
  })
  .strict();

export const kling25RequestSchema = z
  .object({
    prompt: z.string().min(1),
    start_image: z.string().max(1024).optional(),
    aspect_ratio: z.enum(["16:9", "9:16", "1:1"]).optional(),
    duration: z.union([z.literal(5), z.literal(10)]).optional(),
    end_image: z.string().url().max(1024).optional(),
  })
  .strict();

export const providerJobSchema = z.object({
  job_id: z.string().min(1),
  status: kreaJobStateSchema,
  created_at: z.string(),
  completed_at: z.string().nullable().optional(),
  result: z
    .object({
      urls: z.array(z.string()).optional(),
      error: z.string().optional(),
    })
    .nullable()
    .optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string().optional(),
    })
    .optional(),
});

export const webhookPayloadSchema = z.object({
  job_id: z.string().min(1),
  status: kreaJobStateSchema,
  created_at: z.string().optional(),
  completed_at: z.string().nullable().optional(),
  result: z
    .object({
      urls: z.array(z.string()).optional(),
    })
    .optional(),
});

export const fieldNoteSchema = z.object({
  clientGoal: z.string().min(1),
  workflowObserved: z.string().min(1),
  workedWell: z.array(z.string()),
  friction: z.array(z.string()),
  failureReproduction: z.array(z.string()),
  productOpportunity: z.array(z.string()),
  evidenceLinks: z.array(z.string()),
  author: z.string().min(1),
});

export type Krea2MediumRequest = z.infer<typeof krea2MediumRequestSchema>;
export type Kling25Request = z.infer<typeof kling25RequestSchema>;
export type ProviderJobPayload = z.infer<typeof providerJobSchema>;
