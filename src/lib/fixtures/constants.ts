export const ARTWORK =
  "https://res.cloudinary.com/dck5rzi4h/image/upload/v1738035709/art/moisestech-website/price_of_existence_wideshot.png";

export const ARTWORK_ALT =
  "Price of Existence — medical skeleton wrapped in Venezuelan bolívares, 2024, Moises Sanabria";

export const GALLERY = "/fixtures/site-gallery.svg";

export const IMAGE_MODEL = "image/krea/krea-2/medium";
export const VIDEO_MODEL = "video/kling/kling-2.5";

export type Lane = "faithful" | "material" | "surprise";

export const LANE_COPY: Record<
  Lane,
  { title: string; why: string; not: string }
> = {
  faithful: {
    title: "Faithful placement",
    why: "Preserve artwork identity and site legibility so the curator can recognize both the room and the work.",
    not: "Not a claim that this is the only correct install.",
  },
  material: {
    title: "Material transformation",
    why: "Test light, reflection, texture, and how the currency wrapping meets the room — the usual last-mile conversation.",
    not: "Not a materials-and-finishes specification.",
  },
  surprise: {
    title: "Productive surprise",
    why: "One controlled departure while keeping the stated constraints. Taste stays with the human reviewer.",
    not: "Not an automated “best of” score.",
  },
};

export const UNOFFICIAL =
  "Unofficial proof of work. Not affiliated with or endorsed by Krea.";
