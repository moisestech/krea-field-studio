import type { RequestHandler } from "./$types";
import { json, error } from "@sveltejs/kit";
import { getSnapshot } from "$lib/services/studio";

export const GET: RequestHandler = ({ params }) => {
  const snap = getSnapshot(params.id);
  if (!snap) error(404, "Unknown project");
  return json(snap);
};
