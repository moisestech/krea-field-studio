import type { Krea2MediumRequest, Kling25Request } from "../domain/schemas";
import type { KreaJobState } from "../domain/types";

export type ImageGenerationInput = Krea2MediumRequest;
export type VideoGenerationInput = Kling25Request;

export type SubmittedJob = {
  job_id: string;
  status: KreaJobState;
  created_at: string;
};

export type ProviderJob = {
  job_id: string;
  status: KreaJobState;
  created_at: string;
  completed_at: string | null;
  result: { urls: string[]; error?: string } | null;
  error?: { code: string; message?: string };
};

export interface GenerationProvider {
  submitImage(input: ImageGenerationInput): Promise<SubmittedJob>;
  submitVideo(input: VideoGenerationInput): Promise<SubmittedJob>;
  getJob(jobId: string): Promise<ProviderJob>;
  cancelJob(jobId: string): Promise<ProviderJob>;
}

export const IMAGE_MODEL_ID = "image/krea/krea-2/medium";
export const VIDEO_MODEL_ID = "video/kling/kling-2.5";
