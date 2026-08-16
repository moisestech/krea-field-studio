import type { RequestHandler } from "./$types";
import { getSnapshot, pollJobs } from "$lib/services/studio";
import { TERMINAL_STATES } from "$lib/domain/types";

export const GET: RequestHandler = ({ params }) => {
  const stream = new ReadableStream({
    start(controller) {
      const send = async () => {
        try {
          await pollJobs(params.id);
          const snap = getSnapshot(params.id);
          if (!snap) return;
          controller.enqueue(`data: ${JSON.stringify(snap)}\n\n`);
          const pending = snap.jobs.some(
            (j) => !TERMINAL_STATES.includes(j.providerStatus),
          );
          if (!pending) {
            controller.close();
            clearInterval(timer);
          }
        } catch {
          controller.close();
          clearInterval(timer);
        }
      };
      const timer = setInterval(send, 800);
      void send();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
};
