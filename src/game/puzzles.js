// Boolean matrices for each level. true = filled, false = empty

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
