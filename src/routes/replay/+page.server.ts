import { createReplaySession } from "$lib/services/studio";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = () => {
  return { snap: createReplaySession("replay") };
};
