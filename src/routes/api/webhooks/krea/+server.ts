import type { RequestHandler } from "./$types";
import { json, error } from "@sveltejs/kit";
import { ingestWebhook } from "$lib/services/studio";
import { webhookPayloadSchema } from "$lib/domain/schemas";

export const POST: RequestHandler = async ({ request }) => {
  const parsed = webhookPayloadSchema.safeParse(await request.json());
  if (!parsed.success) error(400, "Invalid webhook payload");
  try {
    return json(ingestWebhook(parsed.data));
  } catch (err) {
    error(404, err instanceof Error ? err.message : "Unknown job");
  }
};
