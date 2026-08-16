import type { RequestHandler } from "./$types";
import { json, error } from "@sveltejs/kit";
import { pollJobs } from "$lib/services/studio";

export const POST: RequestHandler = async ({ params }) => {
  try {
    return json(await pollJobs(params.id));
  } catch (err) {
    error(400, err instanceof Error ? err.message : "Poll failed");
  }
};
