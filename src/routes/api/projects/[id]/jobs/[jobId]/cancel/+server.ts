import type { RequestHandler } from "./$types";
import { json, error } from "@sveltejs/kit";
import { cancelJob } from "$lib/services/studio";

export const POST: RequestHandler = async ({ params }) => {
  try {
    return json(await cancelJob(params.id, params.jobId));
  } catch (err) {
    error(400, err instanceof Error ? err.message : "Cancel failed");
  }
};
