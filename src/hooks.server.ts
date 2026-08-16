import type { Handle } from "@sveltejs/kit";

export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  if (process.env.KREA_API_KEY) {
    const leaked = JSON.stringify([...response.headers]).includes(
      process.env.KREA_API_KEY,
    );
    if (leaked) {
      return new Response(
        "Refusing to send a response that would leak credentials.",
        { status: 500 },
      );
    }
  }
  return response;
};
