import type { RequestHandler } from "./$types";
import { json, error } from "@sveltejs/kit";
import { resetReplay } from "$lib/services/studio";

export const POST: RequestHandler = ({ params }) => {
  try {
    return json(resetReplay(params.id));
  } catch (err) {
    error(400, err instanceof Error ? err.message : "Reset failed");
  }
};
