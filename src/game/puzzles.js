// Boolean matrices for each level. true = filled, false = empty
import { computeClues } from "./utils.js";

export const LEVELS = ["easy", "middle", "high", "hard", "ultra"];

const E = true;
const _ = false;

function clonePuzzle(grid) {
  return grid.map((row) => row.slice());
}

// 5x5 puzzles (easy) — 5 puzzles
const EASY = [
  // Heart
  [
    [_, E, _, E, _],
    [E, E, E, E, E],
    [E, E, E, E, E],
    [_, E, E, E, _],
    [_, _, E, _, _],
  ],
  // Smiley
  [
    [_, E, _, E, _],
    [_, E, _, E, _],
    [_, _, _, _, _],
    [E, _, _, _, E],
    [_, E, E, E, _],
  ],
  // Plus
  [
    [_, _, E, _, _],
    [_, _, E, _, _],
    [E, E, E, E, E],
    [_, _, E, _, _],
    [_, _, E, _, _],
  ],
  // Arrow
  [
    [_, _, E, _, _],
    [_, E, E, E, _],
    [E, _, E, _, E],
    [_, _, E, _, _],
    [_, _, E, _, _],
  ],
  // X
  [
    [E, _, _, _, E],
    [_, E, _, E, _],
    [_, _, E, _, _],
    [_, E, _, E, _],
    [E, _, _, _, E],
  ],
];

// 5x5 puzzles (middle) — 5 puzzles
const MIDDLE = [
  // Crest
  [
    [E, E, E, E, E],
    [E, _, E, _, E],
    [E, E, E, E, E],
    [_, E, _, E, _],
    [E, _, _, _, E],
  ],
  // Winged sigil
  [
    [_, E, _, E, _],
    [E, E, E, E, E],
    [_, E, E, E, _],
    [E, _, E, _, E],
    [_, _, E, _, _],
  ],
  // Spiral rune
  [
    [E, E, E, E, _],
    [E, _, _, E, _],
    [E, E, _, E, _],
    [E, _, _, E, _],
    [E, E, E, E, _],
  ],
  // Twin leaves
  [
    [_, E, _, E, _],
    [E, _, E, _, E],
    [E, _, E, _, E],
    [E, _, E, _, E],
    [_, E, _, E, _],
  ],
  // Moon sigil
  [
    [E, E, E, _, _],
    [E, _, _, _, _],
    [E, _, E, E, _],
    [E, _, _, _, _],
    [E, E, E, _, _],
  ],
];

// 10x10 puzzles — reused for hard/ultra adjustments
const TEN_BY_TEN = [
  // Space Invader
  [
    [_, _, E, E, _, _, E, E, _, _],
    [_, E, E, E, E, E, E, E, E, _],
    [E, E, _, E, E, E, E, _, E, E],
    [E, E, E, E, E, E, E, E, E, E],
    [E, _, E, _, _, _, _, E, _, E],
    [E, E, E, E, E, E, E, E, E, E],
    [_, _, E, _, _, _, _, E, _, _],
    [_, E, _, E, _, _, E, _, E, _],
    [E, _, _, _, E, E, _, _, _, E],
    [_, E, E, E, _, _, E, E, E, _],
  ],
  // Diamond
  [
    [_, _, _, _, E, _, _, _, _, _],
    [_, _, _, E, E, E, _, _, _, _],
    [_, _, E, E, E, E, E, _, _, _],
    [_, E, E, E, E, E, E, E, _, _],
    [E, E, E, E, E, E, E, E, E, _],
    [_, E, E, E, E, E, E, E, _, _],
    [_, _, E, E, E, E, E, _, _, _],
    [_, _, _, E, E, E, _, _, _, _],
    [_, _, _, _, E, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _],
  ],
  // Musical Note
  [
    [_, _, _, _, _, _, _, _, _, _],
    [_, _, _, E, E, E, _, _, _, _],
    [_, _, _, E, E, E, _, _, _, _],
    [_, _, _, E, E, E, _, _, _, _],
    [_, _, _, E, E, E, E, E, _, _],
    [_, _, _, E, _, _, _, E, _, _],
    [_, _, _, E, _, _, _, E, _, _],
    [_, _, E, E, _, _, _, E, _, _],
    [_, E, _, E, _, _, _, E, _, _],
    [E, _, _, E, E, E, E, E, _, _],
  ],
  // Spiral
  [
    [E, E, E, E, E, E, E, E, E, E],
    [E, _, _, _, _, _, _, _, _, E],
    [E, _, E, E, E, E, E, E, _, E],
    [E, _, E, _, _, _, _, E, _, E],
    [E, _, E, _, E, E, _, E, _, E],
    [E, _, E, _, E, _, _, E, _, E],
    [E, _, E, _, E, E, E, E, _, E],
    [E, _, E, _, _, _, _, _, _, E],
    [E, _, E, E, E, E, E, E, E, E],
    [E, E, E, E, E, E, E, E, E, E],
  ],
  // Star
  [
    [_, _, _, _, E, _, _, _, _, _],
    [_, _, _, E, E, E, _, _, _, _],
    [_, _, E, _, E, _, E, _, _, _],
    [_, E, _, E, E, E, _, E, _, _],
    [E, E, E, E, E, E, E, E, E, _],
    [_, E, _, E, E, E, _, E, _, _],
    [_, _, E, _, E, _, E, _, _, _],
    [_, _, _, E, E, E, _, _, _, _],
    [_, _, _, _, E, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _],
  ],
];

const HARD10 = TEN_BY_TEN.slice(0, 3);
const ULTRA10 = TEN_BY_TEN;

// 15x15 puzzles (high) — 5 puzzles
const HIGH = [
  // Big Heart
  [
    [_, _, _, E, E, _, _, _, _, E, E, _, _, _, _],
    [_, _, E, E, E, E, _, _, _, E, E, E, E, _, _],
    [_, E, E, E, E, E, E, _, E, E, E, E, E, E, _],
    [E, E, E, E, E, E, E, E, E, E, E, E, E, E, E],
    [E, E, E, E, E, E, E, E, E, E, E, E, E, E, E],
    [E, E, E, E, E, E, E, E, E, E, E, E, E, E, E],
    [_, E, E, E, E, E, E, E, E, E, E, E, E, E, _],
    [_, _, E, E, E, E, E, E, E, E, E, E, E, _, _],
    [_, _, _, E, E, E, E, E, E, E, E, E, _, _, _],
    [_, _, _, _, E, E, E, E, E, E, E, _, _, _, _],
    [_, _, _, _, _, E, E, E, E, E, _, _, _, _, _],
    [_, _, _, _, _, _, E, E, E, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, E, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
  ],
  // Cat
  [
    [_, _, _, _, _, _, E, E, _, _, _, _, _, _, _],
    [_, _, _, _, _, E, E, E, E, _, _, _, _, _, _],
    [_, _, _, _, E, E, E, E, E, E, _, _, _, _, _],
    [_, _, _, E, E, _, E, E, _, E, E, _, _, _, _],
    [_, _, E, E, E, E, E, E, E, E, E, E, _, _, _],
    [_, _, E, _, E, E, E, E, E, E, E, _, E, _, _],
    [_, E, E, _, _, _, E, E, E, _, _, _, E, E, _],
    [E, E, E, E, E, E, E, E, E, E, E, E, E, E, E],
    [E, _, _, E, _, _, _, E, _, _, _, E, _, _, E],
    [E, E, E, E, E, E, E, E, E, E, E, E, E, E, E],
    [_, E, _, _, _, _, E, E, E, _, _, _, _, E, _],
    [_, _, E, E, E, E, _, _, _, E, E, E, E, _, _],
    [_, _, _, _, _, E, E, E, E, E, _, _, _, _, _],
    [_, _, _, _, E, E, E, E, E, E, E, _, _, _, _],
    [_, _, _, E, E, E, E, E, E, E, E, E, _, _, _],
  ],
  // Treble clef-ish
  [
    [_, _, _, _, _, _, _, E, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, E, E, _, _, _, _, _, _, _],
    [_, _, _, _, _, E, E, E, _, _, _, _, _, _, _],
    [_, _, _, _, E, E, E, E, _, _, _, _, _, _, _],
    [_, _, _, E, E, E, E, E, _, _, _, _, _, _, _],
    [_, _, E, _, _, E, E, _, _, _, _, _, _, _, _],
    [_, E, _, _, _, E, _, _, _, _, _, _, _, _, _],
    [E, _, _, _, E, E, E, E, E, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, E, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, E, E, _, _, _, _, _, _],
    [_, _, _, _, _, _, E, E, _, _, _, _, _, _, _],
    [_, _, _, _, _, E, E, _, _, _, _, _, _, _, _],
    [_, _, _, _, E, E, _, _, _, _, _, _, _, _, _],
    [_, _, _, E, E, _, _, _, _, _, _, _, _, _, _],
    [_, _, E, E, _, _, _, _, _, _, _, _, _, _, _],
  ],
  // Big X
  [
    [E, _, _, _, _, _, _, _, _, _, _, _, _, _, E],
    [_, E, _, _, _, _, _, _, _, _, _, _, _, E, _],
    [_, _, E, _, _, _, _, _, _, _, _, _, E, _, _],
    [_, _, _, E, _, _, _, _, _, _, _, E, _, _, _],
    [_, _, _, _, E, _, _, _, _, _, E, _, _, _, _],
    [_, _, _, _, _, E, _, _, _, E, _, _, _, _, _],
    [_, _, _, _, _, _, E, _, E, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, E, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, E, _, E, _, _, _, _, _, _],
    [_, _, _, _, _, E, _, _, _, E, _, _, _, _, _],
    [_, _, _, _, E, _, _, _, _, _, E, _, _, _, _],
    [_, _, _, E, _, _, _, _, _, _, _, E, _, _, _],
    [_, _, E, _, _, _, _, _, _, _, _, _, E, _, _],
    [_, E, _, _, _, _, _, _, _, _, _, _, _, E, _],
    [E, _, _, _, _, _, _, _, _, _, _, _, _, _, E],
  ],
  // Checker heart
  [
    [_, _, E, E, _, _, _, _, E, E, _, _, _, _, _],
    [_, E, _, _, E, _, _, E, _, _, E, _, _, _, _],
    [E, _, _, _, _, E, E, _, _, _, _, E, _, _, _],
    [E, _, E, E, _, _, _, _, _, E, E, _, E, _, _],
    [_, E, _, _, E, _, _, _, E, _, _, E, _, E, _],
    [_, _, E, E, _, E, E, _, _, E, E, _, E, _, _],
    [_, _, _, _, E, _, _, E, _, _, _, E, _, _, _],
    [_, _, _, _, _, E, E, E, E, E, _, _, _, _, _],
    [_, _, _, _, E, _, _, E, _, _, _, E, _, _, _],
    [_, _, E, E, _, E, E, _, _, E, E, _, E, _, _],
    [_, E, _, _, E, _, _, _, E, _, _, E, _, E, _],
    [E, _, E, E, _, _, _, _, _, E, E, _, E, _, _],
    [E, _, _, _, _, E, E, _, _, _, _, E, _, _, _],
    [_, E, _, _, E, _, _, E, _, _, E, _, _, _, _],
    [_, _, E, E, _, _, _, _, E, E, _, _, _, _, _],
  ],
];

// 20x20 puzzles (hard) — 3 puzzles
const HARD20 = [
  // Forest crest
  [
    [_, _, _, _, _, _, _, _, _, E, E, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, E, E, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, E, _, E, E, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, E, E, _, E, E, _, E, _, _, _, _, _, _, _],
    [_, _, _, _, _, E, E, E, _, E, E, _, E, E, _, _, _, _, _, _],
    [_, _, _, _, E, E, E, E, _, E, E, _, E, E, E, _, _, _, _, _],
    [_, _, _, E, E, E, E, E, _, E, E, _, E, E, E, E, _, _, _, _],
    [_, _, E, E, E, E, E, E, _, E, E, _, E, E, E, E, E, _, _, _],
    [_, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, _, _],
    [E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, _],
    [E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, _],
    [_, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, _, _],
    [_, _, E, E, E, E, E, E, _, E, E, _, E, E, E, E, E, _, _, _],
    [_, _, _, E, E, E, E, E, _, E, E, _, E, E, E, E, _, _, _, _],
    [_, _, _, _, E, E, E, E, _, E, E, _, E, E, E, _, _, _, _, _],
    [_, _, _, _, _, E, E, E, _, E, E, _, E, E, _, _, _, _, _, _],
    [_, _, _, _, _, _, E, E, _, E, E, _, E, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, E, _, E, E, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, E, E, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, E, E, _, _, _, _, _, _, _, _, _],
  ],
  // Sealed archway
  [
    [_, _, _, _, _, _, E, E, E, E, E, E, E, E, _, _, _, _, _, _],
    [_, _, _, _, _, E, E, E, E, E, E, E, E, E, E, _, _, _, _, _],
    [_, _, _, _, E, E, E, E, E, E, E, E, E, E, E, E, _, _, _, _],
    [_, _, _, E, E, E, E, E, E, E, E, E, E, E, E, E, E, _, _, _],
    [_, _, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, _, _],
    [_, _, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, _, _],
    [_, _, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, _, _],
    [_, _, E, E, _, _, _, _, _, E, E, _, _, _, _, _, E, E, _, _],
    [_, _, E, E, _, _, _, _, _, E, E, _, _, _, _, _, E, E, _, _],
    [_, _, E, E, _, _, _, _, _, E, E, _, _, _, _, _, E, E, _, _],
    [_, _, E, E, _, _, _, _, _, E, E, _, _, _, _, _, E, E, _, _],
    [_, _, E, E, _, E, E, E, E, E, E, E, E, E, E, _, E, E, _, _],
    [_, _, E, E, _, _, _, _, _, E, E, _, _, _, _, _, E, E, _, _],
    [_, _, E, E, _, _, _, _, _, E, E, _, _, _, _, _, E, E, _, _],
    [_, _, E, E, _, _, _, _, _, E, E, _, _, _, _, _, E, E, _, _],
    [_, _, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, _, _],
    [_, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, _],
    [_, _, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, _, _],
    [_, _, _, E, E, E, E, E, E, E, E, E, E, E, E, E, E, _, _, _],
    [_, _, _, _, E, E, E, E, E, E, E, E, E, E, E, E, _, _, _, _],
  ],
  // Guardian stag
  [
    [_, _, E, E, _, E, E, _, E, E, _, _, _, _, _, _, _, _, _, _],
    [_, E, E, _, E, E, _, E, E, E, _, _, _, _, _, _, _, _, _, _],
    [_, _, E, E, _, E, E, _, E, E, E, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, E, E, E, E, E, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, E, E, E, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, E, E, E, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, E, E, E, E, E, _, _, E, E, E, E, E, E, E, _, _, _],
    [_, _, E, E, E, _, E, E, _, E, E, E, E, E, E, E, E, _, _, _],
    [_, _, E, _, _, _, E, E, E, E, E, E, E, E, E, E, E, E, _, _],
    [_, _, _, _, _, _, _, E, E, E, E, E, E, E, E, E, E, E, _, _],
    [_, _, _, _, _, _, _, E, E, E, E, E, E, E, E, E, E, E, _, _],
    [_, _, _, _, _, _, _, E, E, E, E, E, E, E, E, E, E, E, _, _],
    [_, _, _, _, _, _, _, _, E, E, E, E, E, E, E, E, E, _, _, _],
    [_, _, _, _, _, _, _, _, E, E, E, E, E, E, _, E, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, E, E, E, E, E, E, E, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, E, _, _, _, E, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, E, E, _, _, _, E, E, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, E, E, _, _, _, E, E, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, E, E, _, _, _, E, E, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, E, E, _, _, _, E, E, _, _, _, _],
  ],
];

// 25x25 puzzles (ultra) — 2 puzzles
const ULTRA25 = [
  // Celestial tree
  [
    [_, _, _, _, _, _, _, _, _, _, _, E, E, E, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, E, E, E, E, E, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, E, E, E, E, E, E, E, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, E, E, E, E, E, E, E, E, E, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, E, E, E, E, E, E, E, E, E, E, E, E, E, _, _, _, _, _, _],
    [_, _, _, _, _, E, E, E, E, E, _, E, E, E, _, E, E, E, E, E, _, _, _, _, _],
    [_, _, _, _, _, _, E, E, E, E, _, E, E, E, _, E, E, E, E, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, E, E, E, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, E, E, E, E, E, _, E, E, E, _, E, E, E, E, E, _, _, _, _, _],
    [_, _, _, _, E, E, E, E, E, E, _, E, E, E, _, E, E, E, E, E, E, _, _, _, _],
    [_, _, _, E, E, E, E, E, E, E, _, E, E, E, _, E, E, E, E, E, E, E, _, _, _],
    [_, _, E, E, E, E, E, E, E, E, _, E, E, E, _, E, E, E, E, E, E, E, E, _, _],
    [_, E, E, E, E, E, E, E, E, E, _, E, E, E, _, E, E, E, E, E, E, E, E, E, _],
    [_, _, _, _, _, _, _, _, _, _, _, E, E, E, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, E, E, E, E, E, E, E, _, E, E, E, _, E, E, E, E, E, E, E, _, _, _],
    [_, _, E, E, E, E, E, E, E, E, _, E, E, E, _, E, E, E, E, E, E, E, E, _, _],
    [_, E, E, E, E, E, E, E, E, E, _, E, E, E, _, E, E, E, E, E, E, E, E, E, _],
    [E, E, E, E, E, E, E, E, E, E, _, E, E, E, _, E, E, E, E, E, E, E, E, E, E],
    [E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E],
    [_, _, _, _, _, _, _, _, _, _, E, E, E, E, E, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, E, E, E, E, E, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, E, E, E, E, E, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, E, E, E, E, E, E, E, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, E, E, E, E, _, _, E, E, E, E, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, E, E, E, _, _, _, _, _, _, E, E, E, E, _, _, _, _, _, _],
  ],
  // Starwarden halo
  [
    [E, _, _, _, _, _, _, _, _, _, _, _, E, _, _, _, _, _, _, _, _, _, _, _, E],
    [_, E, _, _, _, _, _, _, _, E, E, E, E, E, E, E, _, _, _, _, _, _, _, E, _],
    [_, _, E, _, _, _, _, E, E, E, E, E, E, E, E, E, E, E, _, _, _, _, E, _, _],
    [_, _, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, _, _],
    [_, _, _, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, _, _, _],
    [_, _, _, E, E, E, E, E, E, _, _, E, E, E, _, _, E, E, E, E, E, E, _, _, _],
    [_, _, _, E, E, E, E, E, _, _, _, E, E, E, _, _, _, E, E, E, E, E, _, _, _],
    [_, _, E, E, E, E, E, E, E, _, _, E, E, E, _, _, E, E, E, E, E, E, E, _, _],
    [_, _, E, E, E, E, _, E, E, E, _, E, E, E, _, E, E, E, _, E, E, E, E, _, _],
    [_, E, E, E, E, _, _, _, E, E, E, _, E, _, E, E, E, _, _, _, E, E, E, E, _],
    [_, E, E, E, E, _, _, _, _, E, E, _, E, _, E, E, _, _, _, _, E, E, E, E, _],
    [_, E, E, E, E, E, E, E, E, _, _, E, E, E, _, _, E, E, E, E, E, E, E, E, _],
    [E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E],
    [_, E, E, E, E, E, E, E, E, _, _, E, E, E, _, _, E, E, E, E, E, E, E, E, _],
    [_, E, E, E, E, _, _, _, _, E, E, _, E, _, E, E, _, _, _, _, E, E, E, E, _],
    [_, E, E, E, E, _, _, _, E, E, E, _, E, _, E, E, E, _, _, _, E, E, E, E, _],
    [_, _, E, E, E, E, _, E, E, E, _, E, E, E, _, E, E, E, _, E, E, E, E, _, _],
    [_, _, E, E, E, E, E, E, E, _, _, E, E, E, _, _, E, E, E, E, E, E, E, _, _],
    [_, _, _, E, E, E, E, E, _, _, _, E, E, E, _, _, _, E, E, E, E, E, _, _, _],
    [_, _, _, E, E, E, E, E, E, _, _, E, E, E, _, _, E, E, E, E, E, E, _, _, _],
    [_, _, _, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, _, _, _],
    [_, _, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, _, _],
    [_, _, E, _, _, _, _, E, E, E, E, E, E, E, E, E, E, E, _, _, _, _, E, _, _],
    [_, E, _, _, _, _, _, _, _, E, E, E, E, E, E, E, _, _, _, _, _, _, _, E, _],
    [E, _, _, _, _, _, _, _, _, _, _, _, E, _, _, _, _, _, _, _, _, _, _, _, E],
  ],
  // Radiant sigil
  [
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, E, E, E, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, E, E, E, E, E, E, E, E, E, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, E, E, E, E, E, E, E, E, E, E, E, E, E, _, _, _, _, _, _],
    [_, _, _, _, _, E, E, E, _, _, _, E, E, E, _, _, _, E, E, E, _, _, _, _, _],
    [_, _, _, _, E, E, E, _, _, _, _, E, E, E, _, _, _, _, E, E, E, _, _, _, _],
    [_, _, _, E, E, E, _, _, _, _, _, E, E, E, _, _, _, _, _, E, E, E, _, _, _],
    [_, _, _, E, E, _, _, _, _, _, _, E, E, E, _, _, _, _, _, _, E, E, _, _, _],
    [_, _, E, E, _, _, _, _, _, _, _, E, E, E, _, _, _, _, _, _, _, E, E, _, _],
    [_, _, E, E, _, _, _, _, _, _, _, E, E, E, _, _, _, _, _, _, _, E, E, _, _],
    [_, _, E, E, _, _, _, _, _, _, _, E, E, E, _, _, _, _, _, _, _, E, E, _, _],
    [_, _, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, _, _],
    [_, _, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, _, _],
    [_, _, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, _, _],
    [_, _, E, E, _, _, _, _, _, _, _, E, E, E, _, _, _, _, _, _, _, E, E, _, _],
    [_, _, E, E, _, _, _, _, _, _, _, E, E, E, _, _, _, _, _, _, _, E, E, _, _],
    [_, _, E, E, _, _, _, _, _, _, _, E, E, E, _, _, _, _, _, _, _, E, E, _, _],
    [_, _, _, E, E, _, _, _, _, _, _, E, E, E, _, _, _, _, _, _, E, E, _, _, _],
    [_, _, _, E, E, E, _, _, _, _, _, E, E, E, _, _, _, _, _, E, E, E, _, _, _],
    [_, _, _, _, E, E, E, _, _, _, _, E, E, E, _, _, _, _, E, E, E, _, _, _, _],
    [_, _, _, _, _, E, E, E, _, _, _, E, E, E, _, _, _, E, E, E, _, _, _, _, _],
    [_, _, _, _, _, _, E, E, E, E, E, E, E, E, E, E, E, E, E, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, E, E, E, E, E, E, E, E, E, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, E, E, E, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
  ],
];

export const PUZZLES = {
  easy: EASY,
  middle: MIDDLE,
  high: HIGH,
  hard: HARD20,
  ultra: ULTRA25,
};

export const PUZZLES_BY_SIZE = {
  5: EASY,
  10: TEN_BY_TEN,
  15: HIGH,
  20: HARD20,
  25: ULTRA25,
};

const NODE_PUZZLES = {
  "elf-practice": EASY,
  "elf-easy": TEN_BY_TEN,
  "elf-middle": MIDDLE,
  "elf-hard": HARD10,
  "elf-ultra": ULTRA10,
};

const NODE_TO_DIFFICULTY = {
  "elf-practice": "practice",
  "elf-easy": "easy",
  "elf-middle": "middle",
  "elf-hard": "hard",
  "elf-ultra": "ultra",
};

const DIFFICULTY_TEMPLATES = {
  practice: EASY,
  easy: TEN_BY_TEN,
  middle: MIDDLE,
  hard: HARD10,
  ultra: ULTRA10,
};

const RECENT_LAYOUT_CACHE = new Map();
const RECENT_CACHE_LIMIT = 40;

function normalizeSeed(seed) {
  if (typeof seed === "number" && Number.isFinite(seed)) {
    return seed >>> 0;
  }
  if (typeof seed === "string" && seed.length) {
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    return hash >>> 0;
  }
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}

function mulberry32(a) {
  return function rng() {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createRng(seed) {
  return mulberry32(normalizeSeed(seed));
}

function shuffleWithRng(array, rng) {
  const next = array.slice();
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function gridKey(grid) {
  return grid
    .map((row) => row.map((cell) => (cell ? "1" : "0")).join(""))
    .join("\n");
}

function gridToCoords(grid) {
  const coords = [];
  for (let y = 0; y < grid.length; y += 1) {
    const row = grid[y];
    for (let x = 0; x < row.length; x += 1) {
      if (row[x]) coords.push({ x, y });
    }
  }
  return coords;
}

function coordsToGrid(coords, size) {
  const grid = Array.from({ length: size }, () => Array.from({ length: size }, () => false));
  coords.forEach(({ x, y }) => {
    if (x >= 0 && x < size && y >= 0 && y < size) {
      grid[y][x] = true;
    }
  });
  return grid;
}

function rotateCoord({ x, y }, size, rotation) {
  switch (rotation % 4) {
    case 1:
      return { x: size - 1 - y, y: x };
    case 2:
      return { x: size - 1 - x, y: size - 1 - y };
    case 3:
      return { x: y, y: size - 1 - x };
    case 0:
    default:
      return { x, y };
  }
}

function applyTemplateTransform(template, size, rng) {
  if (!template || !template.length) return null;
  const templateSize = template.length;
  if (templateSize !== size) return null;

  const baseCoords = gridToCoords(template);
  if (!baseCoords.length) return null;

  const rotation = Math.floor(rng() * 4);
  const flip = rng() < 0.5;
  const rotated = baseCoords.map((coord) => rotateCoord(coord, size, rotation));

  const flipped = flip
    ? rotated.map(({ x, y }) => ({ x: size - 1 - x, y }))
    : rotated;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  flipped.forEach(({ x, y }) => {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  });

  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  const maxDx = Math.max(0, size - width);
  const maxDy = Math.max(0, size - height);

  const offsetX = Math.floor(rng() * (maxDx + 1));
  const offsetY = Math.floor(rng() * (maxDy + 1));

  const translated = flipped.map(({ x, y }) => ({
    x: x - minX + offsetX,
    y: y - minY + offsetY,
  }));

  return coordsToGrid(translated, size);
}

function isMirrorSymmetric(grid) {
  const size = grid.length;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (grid[y][x] !== grid[y][size - 1 - x]) {
        return false;
      }
    }
  }
  return true;
}

function wasRecentlyGenerated(nodeId, key) {
  const entry = RECENT_LAYOUT_CACHE.get(nodeId);
  return entry ? entry.set.has(key) : false;
}

function rememberLayout(nodeId, key) {
  let entry = RECENT_LAYOUT_CACHE.get(nodeId);
  if (!entry) {
    entry = { set: new Set(), order: [] };
    RECENT_LAYOUT_CACHE.set(nodeId, entry);
  }
  if (entry.set.has(key)) return;
  entry.set.add(key);
  entry.order.push(key);
  while (entry.order.length > RECENT_CACHE_LIMIT) {
    const oldest = entry.order.shift();
    if (oldest) entry.set.delete(oldest);
  }
}

function generateLinePatterns(length, clues) {
  if (!clues || clues.length === 0 || (clues.length === 1 && clues[0] === 0)) {
    return [Array.from({ length }, () => false)];
  }
  const results = [];
  const totalFilled = clues.reduce((sum, val) => sum + val, 0);
  const minSpaces = clues.length - 1;

  function build(clueIndex, position, acc) {
    if (clueIndex >= clues.length) {
      if (position <= length) {
        const tail = Array.from({ length: length - position }, () => false);
        results.push(acc.concat(tail));
      }
      return;
    }
    const clue = clues[clueIndex];
    const remainingFilled = clues.slice(clueIndex + 1).reduce((sum, val) => sum + val, 0);
    const remainingSpaces = Math.max(0, clues.length - clueIndex - 1);
    const maxStart = length - (clue + remainingFilled + remainingSpaces);
    for (let start = position; start <= maxStart; start += 1) {
      const padding = Array.from({ length: start - position }, () => false);
      const filled = Array.from({ length: clue }, () => true);
      const nextAcc = acc.concat(padding, filled);
      const nextPos = start + clue;
      if (clueIndex === clues.length - 1) {
        build(clueIndex + 1, nextPos, nextAcc);
      } else {
        build(clueIndex + 1, nextPos + 1, nextAcc.concat(false));
      }
    }
  }

  build(0, 0, []);
  return results;
}

function isColumnPrefixValid(values, clues, size, filledRows) {
  if (!clues || clues.length === 0 || (clues.length === 1 && clues[0] === 0)) {
    return values.every((cell) => !cell);
  }

  let clueIndex = 0;
  let run = 0;

  for (let i = 0; i < values.length; i += 1) {
    const cell = values[i];
    if (cell) {
      run += 1;
      if (clueIndex >= clues.length || run > clues[clueIndex]) {
        return false;
      }
    } else if (run > 0) {
      if (run !== clues[clueIndex]) {
        return false;
      }
      clueIndex += 1;
      run = 0;
    }
  }

  if (run > 0 && clueIndex >= clues.length) {
    return false;
  }

  const rowsRemaining = size - filledRows;
  let required = 0;
  if (run > 0) {
    required += clues[clueIndex] - run;
  }
  const nextClueStart = run > 0 ? clueIndex + 1 : clueIndex;
  for (let i = nextClueStart; i < clues.length; i += 1) {
    required += clues[i];
  }
  const remainingGroups = clues.length - nextClueStart;
  if (run > 0) {
    if (remainingGroups > 0) required += 1 + (remainingGroups - 1);
  } else if (remainingGroups > 1) {
    required += remainingGroups - 1;
  }

  return required <= rowsRemaining;
}

function countSolutions(rowClues, colClues, size, maxCount = 2) {
  const rowOptions = rowClues.map((clues) => generateLinePatterns(size, clues));
  const columnStates = Array.from({ length: size }, () => []);
  let count = 0;

  function backtrack(rowIndex) {
    if (rowIndex === size) {
      count += 1;
      return count;
    }
    const options = rowOptions[rowIndex];
    for (let i = 0; i < options.length; i += 1) {
      const option = options[i];
      let valid = true;
      for (let col = 0; col < size; col += 1) {
        columnStates[col].push(option[col]);
        if (!isColumnPrefixValid(columnStates[col], colClues[col], size, rowIndex + 1)) {
          valid = false;
        }
        if (!valid) break;
      }
      if (valid) {
        backtrack(rowIndex + 1);
        if (count >= maxCount) return count;
      }
      for (let col = 0; col < size; col += 1) {
        columnStates[col].pop();
      }
    }
    return count;
  }

  backtrack(0);
  return count;
}

function hasUniqueSolution(grid) {
  const { rows, cols } = computeClues(grid);
  const size = grid.length;
  const solutions = countSolutions(rows, cols, size, 2);
  return solutions === 1;
}

export function generateBattlePuzzles(nodeId, size, count, options = {}) {
  const difficulty = NODE_TO_DIFFICULTY[nodeId] || null;
  const templates = difficulty ? DIFFICULTY_TEMPLATES[difficulty] : null;
  const seedValue = normalizeSeed(options.seed ?? Math.random() * 0xffffffff);
  const rng = createRng(seedValue);
  const results = [];
  const seen = new Set();
  const maxAttempts = options.maxAttempts ?? 5000;
  let attempts = 0;

  while (results.length < count && attempts < maxAttempts) {
    attempts += 1;
    const templatePool = templates && templates.length ? templates : getPuzzlesForSize(size);
    if (!templatePool || !templatePool.length) break;
    const template = templatePool[Math.floor(rng() * templatePool.length)];
    const variant = applyTemplateTransform(template, size, rng);
    if (!variant) continue;
    const key = gridKey(variant);
    if (seen.has(key) || wasRecentlyGenerated(nodeId, key)) continue;
    if (isMirrorSymmetric(variant) && attempts < maxAttempts / 2) continue;
    if (!hasUniqueSolution(variant)) continue;
    seen.add(key);
    rememberLayout(nodeId, key);
    results.push(clonePuzzle(variant));
  }

  if (results.length < count) {
    const fallbackNeeded = count - results.length;
    const fallback = getRandomPuzzlesForNode(nodeId, size, fallbackNeeded);
    fallback.forEach((grid) => {
      results.push(clonePuzzle(grid));
    });
  }

  const heroPuzzles = results.map((grid) => clonePuzzle(grid));
  const enemyPuzzles = shuffleWithRng(results, rng).map((grid) => clonePuzzle(grid));

  return {
    seed: seedValue,
    heroPuzzles,
    enemyPuzzles,
  };
}

function drawRandomFromPool(pool, count) {
  if (!Array.isArray(pool) || !pool.length || count <= 0) return [];
  const picks = [];
  const used = new Set();
  while (picks.length < count) {
    if (used.size === pool.length) {
      const idx = Math.floor(Math.random() * pool.length);
      picks.push(clonePuzzle(pool[idx]));
      continue;
    }
    const idx = Math.floor(Math.random() * pool.length);
    if (used.has(idx)) continue;
    used.add(idx);
    picks.push(clonePuzzle(pool[idx]));
  }
  return picks;
}

export function getPuzzlesForSize(n) {
  return PUZZLES_BY_SIZE[n] || [];
}
export function getRandomPuzzleForSize(n) {
  const arr = getPuzzlesForSize(n);
  if (!arr.length) return null;
  const idx = Math.floor(Math.random() * arr.length);
  return clonePuzzle(arr[idx]);
}

export function getRandomPuzzlesForSize(n, count) {
  const pool = getPuzzlesForSize(n);
  return drawRandomFromPool(pool, count);
}

export function getRandomPuzzlesForNode(nodeId, size, count) {
  const pool = NODE_PUZZLES[nodeId];
  if (Array.isArray(pool) && pool.length) {
    const sizedPool = pool.filter(
      (grid) =>
        Array.isArray(grid) &&
        grid.length === size &&
        grid.every((row) => Array.isArray(row) && row.length === size),
    );
    if (sizedPool.length) {
      return drawRandomFromPool(sizedPool, count);
    }
  }
  return getRandomPuzzlesForSize(size, count);
}
