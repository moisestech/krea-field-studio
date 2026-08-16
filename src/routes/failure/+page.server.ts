import { ensureSeeds, getSnapshot } from "$lib/services/studio";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = () => {
  ensureSeeds();
  return { snap: getSnapshot("replay-failure") };
};
