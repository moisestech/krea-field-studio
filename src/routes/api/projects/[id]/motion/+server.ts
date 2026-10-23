import type { RequestHandler } from "./$types";
import { json, error } from "@sveltejs/kit";
import { submitMotion } from "$lib/services/studio";
import { MOTION_PROMPT } from "$lib/fixtures/replay";

export const POST: RequestHandler = async ({ params, request }) => {
  const body = (await request.json().catch(() => ({}))) as {
    prompt?: string;
    approved?: boolean;
  };
  try {
    return json(
      await submitMotion(
        params.id,
        body.prompt ?? MOTION_PROMPT,
        body.approved === true,
      ),
    );
  } catch (err) {
    error(400, err instanceof Error ? err.message : "Motion failed");
  }
};
