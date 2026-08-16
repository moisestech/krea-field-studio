function board(id, title, wall, floor, accent, note) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" role="img">
  <rect width="1600" height="900" fill="${wall}"/>
  <rect x="70" y="70" width="1460" height="700" fill="${wall}" stroke="#151515" stroke-width="3"/>
  <rect x="70" y="700" width="1460" height="70" fill="${floor}"/>
  <rect x="180" y="210" width="280" height="490" fill="${accent}" stroke="#151515" stroke-width="2"/>
  <circle cx="320" cy="250" r="38" fill="#F2F0E9" stroke="#151515"/>
  <rect x="250" y="300" width="140" height="280" fill="#F2F0E9" stroke="#151515"/>
  <text x="90" y="50" font-family="ui-monospace,monospace" font-size="22" fill="#151515">REPLAY / ${id}</text>
  <text x="90" y="840" font-family="Georgia,serif" font-size="36" fill="#151515">${title}</text>
  <text x="90" y="875" font-family="ui-monospace,monospace" font-size="18" fill="#151515">${note}</text>
</svg>`;
}

const fs = require("fs");
const path = require("path");
const dir = path.join(__dirname, "../static/fixtures/out");
fs.mkdirSync(dir, { recursive: true });
const files = {
  "faithful-1.svg": board(
    "faithful-a",
    "Faithful A -- elevation",
    "#F7F5EE",
    "#C9C6BC",
    "#7A6A4F",
    "Preserve room + artwork identity",
  ),
  "faithful-2.svg": board(
    "faithful-b",
    "Faithful B -- doorway",
    "#F4F1E8",
    "#B7B3A7",
    "#6E5C45",
    "Three-quarter, architecture literal",
  ),
  "material-1.svg": board(
    "material-a",
    "Material A -- tungsten",
    "#F3E6D2",
    "#8C7A62",
    "#C45C32",
    "Warm light, specular currency",
  ),
  "material-2.svg": board(
    "material-b",
    "Material B -- daylight",
    "#E4EEF4",
    "#9AA7B0",
    "#2F4D63",
    "Cool clerestory, matte walls",
  ),
  "surprise-1.svg": board(
    "surprise-a",
    "Surprise A -- long shadow",
    "#1C1C1C",
    "#3A322C",
    "#FF6B5E",
    "One departure: dusk shadow",
  ),
  "surprise-2.svg": board(
    "surprise-b",
    "Surprise B -- mural",
    "#F2F0E9",
    "#C9C6BC",
    "#B9E8C0",
    "One departure: faint wall mural",
  ),
  "refine-1.svg": board(
    "refine-1",
    "Refinement 1 -- tighter silhouette",
    "#F7F5EE",
    "#C9C6BC",
    "#7A6A4F",
    "Bounded change",
  ),
  "refine-2.svg": board(
    "refine-2",
    "Refinement 2 -- more floor",
    "#F7F5EE",
    "#C9C6BC",
    "#7A6A4F",
    "Circulation visible",
  ),
  "refine-3.svg": board(
    "refine-3",
    "Refinement 3 -- fewer extras",
    "#F7F5EE",
    "#C9C6BC",
    "#7A6A4F",
    "Currency wrapping held",
  ),
  "motion-poster.svg": board(
    "motion",
    "Motion study poster",
    "#151515",
    "#7FA8FF",
    "#FF6B5E",
    "Optional 5s dolly / not a finished film",
  ),
};
for (const [name, svg] of Object.entries(files))
  fs.writeFileSync(path.join(dir, name), svg);
console.log("wrote", Object.keys(files).length);
