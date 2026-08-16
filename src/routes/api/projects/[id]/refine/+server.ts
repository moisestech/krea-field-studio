import type { RequestHandler } from "./$types";
import { json, error } from "@sveltejs/kit";
import { submitRefinements } from "$lib/services/studio";
import { REFINEMENT_PROMPTS } from "$lib/fixtures/replay";

export const POST: RequestHandler = async ({ params, request }) => {
  const body = (await request.json().catch(() => ({}))) as {
    prompts?: string[];
  };
  try {
    return json(
      await submitRefinements(params.id, body.prompts ?? REFINEMENT_PROMPTS),
    );
  } catch (err) {
    error(400, err instanceof Error ? err.message : "Refine failed");
  }
};
