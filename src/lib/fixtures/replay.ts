import {
  ARTWORK,
  GALLERY,
  IMAGE_MODEL,
  LANE_COPY,
  type Lane,
} from "./constants";
import type { Direction, ProjectSnapshot } from "../domain/types";

const now = "2026-08-16T14:00:00.000Z";

function direction(
  id: string,
  lane: Lane,
  n: 1 | 2,
  prompt: string,
  parametersJson: Record<string, unknown>,
  status: Direction["status"] = "proposed",
): Direction {
  return {
    id,
    projectId: "replay-price-of-existence",
    lane,
    label: `${LANE_COPY[lane].title} ${n === 1 ? "A" : "B"}`,
    rationale: LANE_COPY[lane].why,
    prompt,
    modelId: IMAGE_MODEL,
    parametersJson,
    status,
  };
}

const sitePrompt =
  "White-cube gallery previz, 16:9. Keep the room architecture, ceiling track lights, and grey concrete floor. Place Price of Existence — a medical skeleton wrapped in Venezuelan bolívares — at human scale in the left bay. Museum-quiet. No logos, no CAD measurements.";

export function buildReplaySnapshot(): ProjectSnapshot {
  return {
    project: {
      id: "replay-price-of-existence",
      title: "Price of Existence — exhibition previz",
      mode: "replay",
      status: "plan_ready",
      createdAt: now,
      updatedAt: now,
    },
    brief: {
      projectId: "replay-price-of-existence",
      goal: "Help a curator see how Price of Existence could sit in a white-cube bay before a site visit — as communication, not as a construction document.",
      audience:
        "Curator and exhibition designer reviewing a first spatial conversation.",
      siteConstraints: [
        "Single rectangular bay, ~6 m wall",
        "Track lighting from ceiling, no floor spots",
        "Public circulation must remain clear of the sculpture",
      ],
      mustPreserve: [
        "Artwork identity: skeleton + bolívar wrapping",
        "Gallery as a readable room, not a fantasy set",
        "Human scale — do not miniaturize the figure",
      ],
      mayChange: [
        "Wall color temperature",
        "Reflection and material of the floor",
        "One controlled lighting or material departure",
      ],
      outputRequirements: [
        "Six still directions (two per lane)",
        "One approved refinement set",
        "Proposal board with limitations and provenance",
      ],
    },
    assets: [
      {
        id: "asset-site",
        projectId: "replay-price-of-existence",
        kind: "site",
        source: "fixture",
        url: GALLERY,
        sha256: "fixture-site-gallery-v1",
        rightsNote:
          "Synthetic white-cube drawing created for this unofficial demo. Not a real venue survey.",
        createdAt: now,
      },
      {
        id: "asset-art",
        projectId: "replay-price-of-existence",
        kind: "artwork",
        source: "fixture",
        url: ARTWORK,
        sha256: "cloudinary-price-of-existence-wideshot",
        rightsNote:
          "Moises Sanabria, Price of Existence, 2024. Artist-owned documentation. Used with permission of the artist.",
        createdAt: now,
      },
    ],
    directions: [
      direction(
        "dir-faithful-a",
        "faithful",
        1,
        `${sitePrompt} Straight-on elevation. Preserve wall color and lighting. Sculpture centered on the left bay.`,
        {
          aspect_ratio: "16:9",
          resolution: "1K",
          creativity: "raw",
          strength: 0.35,
          seed: 2401,
        },
      ),
      direction(
        "dir-faithful-b",
        "faithful",
        2,
        `${sitePrompt} Slight three-quarter view from the doorway. Keep architecture literal.`,
        {
          aspect_ratio: "16:9",
          resolution: "1K",
          creativity: "raw",
          strength: 0.38,
          seed: 2402,
        },
      ),
      direction(
        "dir-material-a",
        "material",
        1,
        `${sitePrompt} Warm museum tungsten, polished concrete reflections, paper currency catching specular light.`,
        {
          aspect_ratio: "16:9",
          resolution: "1K",
          creativity: "low",
          strength: 0.55,
          intensity: 12,
          seed: 2403,
        },
      ),
      direction(
        "dir-material-b",
        "material",
        2,
        `${sitePrompt} Cool daylight from the clerestory, matte walls, currency texture emphasized.`,
        {
          aspect_ratio: "16:9",
          resolution: "1K",
          creativity: "low",
          strength: 0.58,
          complexity: 18,
          seed: 2404,
        },
      ),
      direction(
        "dir-surprise-a",
        "surprise",
        1,
        `${sitePrompt} One departure: a long dusk shadow of the skeleton across the floor, architecture otherwise faithful.`,
        {
          aspect_ratio: "16:9",
          resolution: "1K",
          creativity: "high",
          strength: 0.72,
          movement: 20,
          seed: 2405,
        },
      ),
      direction(
        "dir-surprise-b",
        "surprise",
        2,
        `${sitePrompt} One departure: bolívar notes appear as a faint wall mural behind the sculpture, room still a gallery.`,
        {
          aspect_ratio: "16:9",
          resolution: "1K",
          creativity: "high",
          strength: 0.74,
          seed: 2406,
        },
      ),
    ],
    jobs: [],
    approvals: [],
    receipts: [],
  };
}

export const REFINEMENT_PROMPTS = [
  "Keep the approved still. Tighten sculpture silhouette. Reduce background invention. Museum lighting only.",
  "Keep the approved still. Slightly lower camera, more floor, circulation path visible.",
  "Keep the approved still. Soften any extra props. Preserve currency wrapping detail.",
];

export const MOTION_PROMPT =
  "Slow lateral dolly, subtle parallax on gallery walls, sculpture remains still, museum-quiet motion, no camera shake.";
