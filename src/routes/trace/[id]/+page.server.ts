import { ensureSeeds, getSnapshot } from "$lib/services/studio";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = ({ params }) => {
  ensureSeeds();
  return { snap: getSnapshot(params.id) };
};
