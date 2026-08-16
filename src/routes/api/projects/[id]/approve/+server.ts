import type { RequestHandler } from "./$types";
import { json, error } from "@sveltejs/kit";
import { approvePlan, submitApprovedDirections } from "$lib/services/studio";

export const POST: RequestHandler = async ({ params, request }) => {
  const body = (await request.json().catch(() => ({}))) as { note?: string };
  try {
    approvePlan(
      params.id,
      body.note ?? "Operator approved the six-direction plan.",
    );
    const snap = await submitApprovedDirections(params.id);
    return json(snap);
  } catch (err) {
    error(400, err instanceof Error ? err.message : "Approve failed");
  }
};
