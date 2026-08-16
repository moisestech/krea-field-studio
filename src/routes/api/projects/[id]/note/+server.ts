import type { RequestHandler } from "./$types";
import { json, error } from "@sveltejs/kit";
import { saveFieldNote } from "$lib/services/studio";
import { fieldNoteSchema } from "$lib/domain/schemas";

export const POST: RequestHandler = async ({ params, request }) => {
  const parsed = fieldNoteSchema.safeParse(await request.json());
  if (!parsed.success) error(400, "Invalid field note");
  try {
    return json(saveFieldNote(params.id, parsed.data));
  } catch (err) {
    error(400, err instanceof Error ? err.message : "Note failed");
  }
};
