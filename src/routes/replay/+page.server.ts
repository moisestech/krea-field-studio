import { ensureSeeds, getSnapshot } from "$lib/services/studio";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = () => {
  ensureSeeds();
  const snap = getSnapshot("replay-price-of-existence");
  return { snap };
};
