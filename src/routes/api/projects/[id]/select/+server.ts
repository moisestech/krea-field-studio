import type { RequestHandler } from "./$types";
import { json, error } from "@sveltejs/kit";
import { selectDirection } from "$lib/services/studio";

export const POST: RequestHandler = async ({ params, request }) => {
  const body = (await request.json()) as {
    directionId?: string;
    note?: string;
  };
  if (!body.directionId) error(400, "directionId required");
  try {
    return json(
      selectDirection(
        params.id,
        body.directionId,
        body.note ?? "Selected in compare view.",
      ),
    );
  } catch (err) {
    error(400, err instanceof Error ? err.message : "Select failed");
  }
};
