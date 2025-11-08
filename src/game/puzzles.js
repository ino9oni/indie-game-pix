// Boolean matrices for each level. true = filled, false = empty
import { computeClues } from "./utils.js";

export const LEVELS = ["easy", "middle", "high", "hard", "ultra"];

const E = true;
const _ = false;

function clonePuzzle(grid) {
  return grid.map((row) => row.slice());
}

function cloneTemplateEntry(entry) {
  if (!entry) {
    return { grid: [], glyphMeta: null };
  }
  return {
    grid: clonePuzzle(entry.grid),
    glyphMeta: entry.glyphMeta ? { ...entry.glyphMeta } : null,
  };
}

function scaleGrid(grid, scale) {
  if (!Array.isArray(grid) || !grid.length || scale <= 1) {
    return clonePuzzle(grid);
  }
  const size = grid.length;
  const scaledSize = size * scale;
  const scaled = Array.from({ length: scaledSize }, () =>
    Array.from({ length: scaledSize }, () => false),
  );
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (!grid[y][x]) continue;
      for (let dy = 0; dy < scale; dy += 1) {
        for (let dx = 0; dx < scale; dx += 1) {
          scaled[y * scale + dy][x * scale + dx] = true;
        }
      }
    }
  }
  return scaled;
}

function createFallbackGrid(size, variant = 0) {
  const grid = Array.from({ length: size }, () => Array.from({ length: size }, () => false));
  for (let row = 0; row < size; row += 1) {
    const col = (row + variant) % size;
    grid[row][col] = true;
    const mirror = size - 1 - col;
    grid[row][mirror] = true;
  }
  return grid;
}

function transposeGrid(grid) {
  if (!grid.length) return [];
  return grid[0].map((_, col) => grid.map((row) => row[col]));
}

function countTrueCells(grid) {
  let total = 0;
  grid.forEach((row) =>
    row.forEach((cell) => {
      if (cell) total += 1;
    }),
  );
  return total;
}

function getLineSegments(line) {
  const segments = [];
  let start = null;
  for (let i = 0; i <= line.length; i += 1) {
    if (line[i]) {
      if (start == null) start = i;
    } else if (start != null) {
      segments.push({ start, length: i - start });
      start = null;
    }
  }
  return segments;
}

function breakLongRuns(line, maxRun) {
  const arr = line.slice();
  if (maxRun <= 0) return arr;
  let changed = true;
  while (changed) {
    changed = false;
    const segments = getLineSegments(arr);
    const oversized = segments.find((seg) => seg.length > maxRun);
    if (!oversized) break;
    const breakIndex = oversized.start + Math.floor(oversized.length / 2);
    arr[breakIndex] = false;
    changed = true;
  }
  return arr;
}

function limitSegmentCount(line, maxSegments) {
  if (!Number.isFinite(maxSegments) || maxSegments <= 0) return line.slice();
  const arr = line.slice();
  let segments = getLineSegments(arr);
  while (segments.length > maxSegments) {
    const seg = segments[segments.length - 1];
    const removeIndex = seg.start + Math.floor(seg.length / 2);
    arr[removeIndex] = false;
    segments = getLineSegments(arr);
  }
  return arr;
}

function applyLineAdjustments(grid, handler) {
  const next = grid.map((row) => row.slice());
  next.forEach((row, idx) => {
    next[idx] = handler(row);
  });
  const cols = transposeGrid(next);
  cols.forEach((col, idx) => {
    cols[idx] = handler(col);
  });
  const adjusted = transposeGrid(cols);
  return adjusted;
}

function getLongestRun(line) {
  const segments = getLineSegments(line);
  if (!segments.length) return 0;
  return Math.max(...segments.map((seg) => seg.length));
}

function createRowPattern(size, length, grid = null, rowIndex = -1, rng = Math.random) {
  const baseRow = Array(size).fill(false);
  const maxOffset = Math.max(0, size - length);
  if (!grid || rowIndex < 0 || maxOffset === 0) {
    const start = maxOffset > 0 ? Math.floor(rng() * (maxOffset + 1)) : 0;
    const row = baseRow.slice();
    for (let i = 0; i < length; i += 1) {
      row[start + i] = true;
    }
    return row;
  }

  const candidates = [];
  for (let start = 0; start <= maxOffset; start += 1) {
    const candidateRow = baseRow.slice();
    for (let i = 0; i < length; i += 1) {
      candidateRow[start + i] = true;
    }
    const testGrid = grid.map((existingRow, idx) => (idx === rowIndex ? candidateRow : existingRow));
    const penalty = computeUltraHintPenalty(testGrid);
    candidates.push({ penalty, row: candidateRow });
  }
  const minPenalty = Math.min(...candidates.map((c) => c.penalty));
  const best = candidates.filter((option) => option.penalty <= minPenalty + 1e-6);
  const pick = best[Math.floor(rng() * best.length)];
  return pick?.row ? pick.row.slice() : baseRow;
}

function enforceUltraRowTargets(grid, rng = Math.random, { forceReassign = false } = {}) {
  const size = grid.length;
  const next = grid.map((row) => row.slice());
  const assigned = new Set();
  const shouldReassign = forceReassign || computeUltraHintPenalty(next) > ULTRA_HINT_TOLERANCE;
  const profiles = next.map((row, index) => ({
    index,
    longest: getLongestRun(row),
  }));

  ULTRA_ROW_TARGETS.forEach((target) => {
    let remaining = target.count;
    const pickLength = () =>
      target.max === target.min
        ? target.max
        : target.min + Math.floor(rng() * (target.max - target.min + 1));
    profiles.forEach((profile) => {
      if (remaining <= 0) return;
      if (assigned.has(profile.index)) return;
      if (profile.longest >= target.min && profile.longest <= target.max) {
        if (shouldReassign) {
          const targetLength = pickLength();
          next[profile.index] = createRowPattern(size, targetLength, next, profile.index, rng);
        }
        assigned.add(profile.index);
        remaining -= 1;
      }
    });
    while (remaining > 0) {
      const candidates = profiles
        .map((profile) => profile.index)
        .filter((index) => !assigned.has(index));
      if (!candidates.length) break;
      const pick = candidates[Math.floor(rng() * candidates.length)];
      const targetLength = pickLength();
      next[pick] = createRowPattern(size, targetLength, next, pick, rng);
      assigned.add(pick);
      remaining -= 1;
    }
  });

  return next;
}

function enforceUltraHintDistribution(grid, rng = Math.random) {
  let adjusted = grid.map((row) => row.slice());
  for (let i = 0; i < 2; i += 1) {
    adjusted = enforceUltraRowTargets(adjusted, rng, { forceReassign: true });
    const transposed = transposeGrid(adjusted);
    const normalizedCols = enforceUltraRowTargets(transposed, rng, { forceReassign: true });
    adjusted = transposeGrid(normalizedCols);
  }
  return adjusted;
}

function rebalanceUltraHints(grid, rng = Math.random, iterations = 20000) {
  const size = grid.length;
  let current = grid.map((row) => row.slice());
  let penalty = computeUltraHintPenalty(current);
  let bestPenalty = penalty;
  let bestGrid = current.map((row) => row.slice());

  for (let i = 0; i < iterations && penalty > ULTRA_HINT_TOLERANCE; i += 1) {
    const r = Math.floor(rng() * size);
    const c = Math.floor(rng() * size);
    current[r][c] = !current[r][c];
    const nextPenalty = computeUltraHintPenalty(current);
    const delta = nextPenalty - penalty;
    const temperature = Math.max(0.0001, 1 - i / iterations);
    if (delta <= 0 || rng() < Math.exp(-Math.max(0, delta) / temperature)) {
      penalty = nextPenalty;
      if (nextPenalty < bestPenalty) {
        bestPenalty = nextPenalty;
        bestGrid = current.map((row) => row.slice());
      }
    } else {
      current[r][c] = !current[r][c];
    }
  }

  return bestPenalty < penalty ? bestGrid : current;
}

function isHorizontallySymmetric(grid) {
  return grid.every((row) => row.every((cell, idx) => cell === row[row.length - 1 - idx]));
}

function isVerticallySymmetric(grid) {
  const height = grid.length;
  return grid.every((row, rIdx) => row.every((cell, cIdx) => cell === grid[height - 1 - rIdx][cIdx]));
}

const DIFFICULTY_LIMITS = {
  middle: {
    minDensity: 0.28,
    maxDensity: 0.42,
    maxRunRatio: 0.5,
    maxSegments: 4,
    preventSymmetry: true,
  },
  hard: {
    minDensity: 0.35,
    maxDensity: 0.55,
    maxRunRatio: 1,
    maxSegments: 0,
    preventSymmetry: true,
  },
  ultra: {
    minDensity: 0.35,
    maxDensity: 0.55,
    maxRunRatio: 1,
    maxSegments: 0,
    preventSymmetry: true,
  },
};

const DIFFICULTY_TIERS = {
  practice: "intro",
  easy: "intro",
  middle: "core",
  hard: "advanced",
  ultra: "master",
};

const ULTRA_ROW_TARGETS = [
  { count: 1, min: 10, max: 10 },
  { count: 1, min: 7, max: 9 },
  { count: 4, min: 4, max: 6 },
  { count: 3, min: 2, max: 3 },
  { count: 1, min: 1, max: 1 },
];

const ULTRA_HINT_PERCENTS = {
  10: 0.1,
  9: 0.0334,
  8: 0.0333,
  7: 0.0333,
  6: 0.1334,
  5: 0.1333,
  4: 0.1333,
  3: 0.15,
  2: 0.15,
  1: 0.1,
};

const ULTRA_HINT_TOLERANCE = 0.05;

function buildHintHistogram(grid) {
  const histogram = {};
  let total = 0;
  const { rows, cols } = computeClues(grid);
  rows.concat(cols).forEach((clues) => {
    clues.forEach((value) => {
      if (value <= 0) return;
      histogram[value] = (histogram[value] || 0) + 1;
      total += 1;
    });
  });
  return { histogram, total };
}

function computeUltraHintPenalty(grid) {
  const { histogram, total } = buildHintHistogram(grid);
  if (!total) return 0;
  let penalty = 0;
  Object.entries(ULTRA_HINT_PERCENTS).forEach(([hint, target]) => {
    const actual = (histogram[hint] || 0) / total;
    const diff = Math.abs(actual - target);
    const overTolerance = Math.max(0, diff - ULTRA_HINT_TOLERANCE);
    penalty += overTolerance * overTolerance;
  });
  const size = grid.length;
  for (let col = 0; col < size; col += 1) {
    let run = 0;
    let maxRun = 0;
    for (let row = 0; row < size; row += 1) {
      if (grid[row][col]) {
        run += 1;
        if (run > maxRun) {
          maxRun = run;
        }
      } else {
        run = 0;
      }
    }
    if (maxRun > size * 0.9) {
      penalty += (maxRun - size * 0.9) * 0.05;
    }
  }
  return penalty;
}

function randomIndex(list, rng = Math.random) {
  if (!list.length) return -1;
  return Math.floor(rng() * list.length);
}

function enforceDensity(grid, { minDensity, maxDensity }, rng = Math.random) {
  const totalCells = grid.length * grid.length;
  const flatIndices = [];
  grid.forEach((row, r) =>
    row.forEach((cell, c) => {
      flatIndices.push({ r, c, filled: cell });
    }),
  );
  let filled = countTrueCells(grid);
  const desiredMin = Math.floor(totalCells * minDensity);
  const desiredMax = Math.ceil(totalCells * maxDensity);
  const next = grid.map((row) => row.slice());

  while (filled > desiredMax) {
    const candidates = flatIndices.filter((cell) => next[cell.r][cell.c]);
    if (!candidates.length) break;
    const idx = randomIndex(candidates, rng);
    const pick = candidates[idx];
    next[pick.r][pick.c] = false;
    filled -= 1;
  }
  const emptyCells = flatIndices.filter((cell) => !next[cell.r][cell.c]);
  while (filled < desiredMin && emptyCells.length) {
    const idx = randomIndex(emptyCells, rng);
    const pick = emptyCells.splice(idx, 1)[0];
    next[pick.r][pick.c] = true;
    filled += 1;
  }
  return next;
}

function breakSymmetry(grid) {
  const next = grid.map((row) => row.slice());
  if (isHorizontallySymmetric(next)) {
    const size = next.length;
    for (let r = 0; r < size; r += 1) {
      for (let c = Math.floor(size / 2); c < size; c += 1) {
        if (next[r][c]) {
          next[r][c] = false;
          return next;
        }
      }
    }
  }
  if (isVerticallySymmetric(next)) {
    const size = next.length;
    for (let r = Math.floor(size / 2); r < size; r += 1) {
      for (let c = 0; c < size; c += 1) {
        if (next[r][c]) {
          next[r][c] = false;
          return next;
        }
      }
    }
  }
  return next;
}

function normalizeGridForDifficulty(grid, difficulty, rng = Math.random) {
  const limits = DIFFICULTY_LIMITS[difficulty];
  if (!limits) return clonePuzzle(grid);
  const size = grid.length;
  const maxRun = Math.max(2, Math.floor(size * limits.maxRunRatio));
  const useAdvancedHintBalancing =
    size >= 10 && (difficulty === "hard" || difficulty === "ultra");
  const shouldAdjustSegments = !useAdvancedHintBalancing;

  let normalized = clonePuzzle(grid);
  if (limits.preventSymmetry) {
    normalized = breakSymmetry(normalized);
  }
  normalized = enforceDensity(normalized, limits, rng);
  if (useAdvancedHintBalancing && size === 10) {
    normalized = enforceUltraHintDistribution(normalized, rng);
    normalized = rebalanceUltraHints(normalized, rng, 20000);
    normalized = enforceDensity(normalized, limits, rng);
    let penalty = computeUltraHintPenalty(normalized);
    let safeguard = 0;
    while (penalty > ULTRA_HINT_TOLERANCE && safeguard < 3) {
      normalized = enforceUltraHintDistribution(normalized, rng);
      normalized = rebalanceUltraHints(normalized, rng, 12000);
      normalized = enforceDensity(normalized, limits, rng);
      penalty = computeUltraHintPenalty(normalized);
      safeguard += 1;
    }
  } else if (shouldAdjustSegments) {
    normalized = applyLineAdjustments(normalized, (line) => {
      let adjusted = breakLongRuns(line, maxRun);
      adjusted = limitSegmentCount(adjusted, limits.maxSegments);
      return adjusted;
    });
  }
  normalized = enforceDensity(normalized, limits, rng);
  return normalized;
}

function pattern(rows) {
  return rows.map((row) => row.split("").map((ch) => ch === "#"));
}

function pickTemplateVariant(
  template,
  size,
  rng,
  { allowTransforms, overlays, requireUniqueSolution, difficulty },
) {
  if (!template) return null;
  const modes = allowTransforms
    ? [
        { transform: true, overlay: true },
        { transform: true, overlay: false },
        { transform: false, overlay: true },
        { transform: false, overlay: false },
      ]
    : [
        { transform: false, overlay: true },
        { transform: false, overlay: false },
      ];

  for (const mode of modes) {
    const attempts = mode.transform ? 8 : 2;
    for (let i = 0; i < attempts; i += 1) {
      const baseVariant = mode.transform
        ? applyTemplateTransform(template.grid, size, rng)
        : clonePuzzle(template.grid);
      if (!baseVariant) continue;
      const candidate =
        mode.overlay && overlays?.length
          ? applyOverlays(baseVariant, overlays, size, rng)
          : baseVariant;
      if (requireUniqueSolution && !hasUniqueSolution(candidate)) {
        continue;
      }
      const appliedDifficulty = template?.glyphMeta?.difficulty || difficulty || null;
      const normalizedVariant = normalizeGridForDifficulty(candidate, appliedDifficulty, rng);
      return clonePuzzle(normalizedVariant);
    }
  }
  return null;
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
    [_, E, E, _, _],
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

const PRACTICE_STORY = [
  pattern([
    "..#..",
    ".###.",
    "#####",
    ".###.",
    "#..##",
  ]),
  pattern([
    "..#..",
    ".#.#.",
    "#####",
    ".#.#.",
    "..#.#",
  ]),
  pattern([
    "#....",
    "##...",
    ".###.",
    "...##",
    "..#.#",
  ]),
  pattern([
    "###..",
    "#..#.",
    "####.",
    "...#.",
    ".###.",
  ]),
  pattern([
    ".#.#.",
    "###..",
    ".####",
    "..#.#",
    "..##.",
  ]),
];

const MIDDLE_STORY = [
  pattern([
    "#.###",
    "###..",
    ".####",
    "..###",
    ".###.",
  ]),
  pattern([
    ".###.",
    "#...#",
    "#####",
    ".#.#.",
    ".###.",
  ]),
  pattern([
    "..#..",
    ".###.",
    "#####",
    ".#.#.",
    "##.##",
  ]),
  pattern([
    "#..#.",
    "####.",
    ".###.",
    ".####",
    "#..#.",
  ]),
  pattern([
    ".####",
    "###..",
    ".#..#",
    "..###",
    "###..",
  ]),
];


const EASY_STORY_TEMPLATES = [
  pattern([
    ".##..",
    "####.",
    ".###.",
    "..##.",
    "...#.",
  ]),
  pattern([
    "..##.",
    ".###.",
    "#####",
    ".###.",
    "..#..",
  ]),
  pattern([
    ".###.",
    "##.##",
    "#####",
    ".###.",
    ".#.#.",
  ]),
  pattern([
    "###..",
    "##.#.",
    ".####",
    "...##",
    "...#.",
  ]),
  pattern([
    "..#..",
    ".###.",
    "##.##",
    ".###.",
    ".#.#.",
  ]),
  pattern([
    ".#.#.",
    "#####",
    ".###.",
    "##.##",
    "#...#",
  ]),
];

const HARD_STORY_TEMPLATES_BASE = [
  pattern([
    "####.",
    "###.#",
    "#####",
    ".####",
    "..###",
  ]),
  pattern([
    "###.#",
    "#####",
    "##.##",
    ".####",
    "..###",
  ]),
  pattern([
    "#####",
    "##.##",
    ".####",
    "..###",
    "...##",
  ]),
  pattern([
    "####.",
    "##.##",
    "#.###",
    "####.",
    ".###.",
  ]),
  pattern([
    "###.#",
    "#.###",
    "#####",
    "###.#",
    ".####",
  ]),
  pattern([
    "#####",
    ".####",
    "..###",
    ".####",
    "#####",
  ]),
];

const HARD_EXTRA_TEMPLATES_BASE = [
  pattern([
    ".###.",
    "#...#",
    "#####",
    ".#.#.",
    ".###.",
  ]),
  pattern([
    "..#..",
    ".###.",
    "#####",
    ".#.#.",
    "##.##",
  ]),
];

const ULTRA_STORY_TEMPLATES_BASE = [
  pattern([
    "#####",
    "#.###",
    "#####",
    "###.#",
    "#####",
  ]),
  pattern([
    "####.",
    "#####",
    "##.##",
    "#####",
    ".####",
  ]),
  pattern([
    "#####",
    "##.##",
    ".###.",
    "##.##",
    "#####",
  ]),
  pattern([
    "####.",
    "###.#",
    "#.###",
    "###.#",
    ".####",
  ]),
  pattern([
    ".####",
    "#####",
    "###.#",
    "#####",
    "####.",
  ]),
  pattern([
    "#####",
    "#.###",
    "#####",
    "#.###",
    "#####",
  ]),
];

const ULTRA_EXTRA_TEMPLATES_BASE = [
  pattern([
    "##.##",
    ".###.",
    "#####",
    ".###.",
    "##.##",
  ]),
  pattern([
    ".#.#.",
    "#####",
    "##.##",
    "#####",
    ".#.#.",
  ]),
  pattern([
    "###.#",
    "##.##",
    "#.###",
    "##.##",
    "###.#",
  ]),
  pattern([
    ".###.",
    "##.##",
    "#####",
    "##.##",
    ".###.",
  ]),
];

const HARD_STORY_TEMPLATES = HARD_STORY_TEMPLATES_BASE.map((grid) => scaleGrid(grid, 2));
const HARD_EXTRA_TEMPLATES = HARD_EXTRA_TEMPLATES_BASE.map((grid) => scaleGrid(grid, 2));
const ULTRA_STORY_TEMPLATES = ULTRA_STORY_TEMPLATES_BASE.map((grid) => scaleGrid(grid, 2));
const ULTRA_EXTRA_TEMPLATES = ULTRA_EXTRA_TEMPLATES_BASE.map((grid) => scaleGrid(grid, 2));

const PRACTICE_OVERLAYS = [
  pattern([
    ".....",
    "..#..",
    ".###.",
    "..#..",
    ".....",
  ]),
  pattern([
    "...#.",
    "..##.",
    "...#.",
    ".....",
    ".....",
  ]),
  pattern([
    "#....",
    ".#...",
    "..#..",
    "...#.",
    "....#",
  ]),
];

const MIDDLE_OVERLAYS = [
  pattern([
    ".....",
    "..#..",
    ".....",
    "..#..",
    ".....",
  ]),
  pattern([
    "#....",
    ".#...",
    "..#..",
    ".#...",
    "#....",
  ]),
];

const EASY_OVERLAYS = [
  pattern([
    ".....",
    "..#..",
    ".###.",
    "..#..",
    ".....",
  ]),
  pattern([
    ".....",
    ".#.#.",
    "..#..",
    ".#.#.",
    ".....",
  ]),
  pattern([
    ".....",
    "..##.",
    ".####",
    "..##.",
    ".....",
  ]),
];

const HARD_OVERLAY_BASES = [
  pattern([
    ".#.#.",
    "#####",
    ".#.#.",
    "#####",
    ".#.#.",
  ]),
  pattern([
    "##..#",
    ".###.",
    "..#..",
    ".###.",
    "#..##",
  ]),
  pattern([
    ".###.",
    "#####",
    "##.##",
    "#####",
    ".###.",
  ]),
];

const ULTRA_OVERLAY_BASES = [
  pattern([
    "#####",
    "#.#.#",
    "##.##",
    "#.#.#",
    "#####",
  ]),
  pattern([
    ".###.",
    "#####",
    "##.##",
    "#####",
    ".###.",
  ]),
  pattern([
    "#.###",
    "#####",
    ".###.",
    "#####",
    "###.#",
  ]),
];

const HARD_OVERLAYS = HARD_OVERLAY_BASES.map((grid) => scaleGrid(grid, 2));
const ULTRA_OVERLAYS = ULTRA_OVERLAY_BASES.map((grid) => scaleGrid(grid, 2));

function createGlyphTemplate({
  grid,
  glyphId,
  glyphLabel,
  meaningText,
  collectionIndex,
  difficulty,
}) {
  const normalizedGrid = normalizeGridForDifficulty(grid, difficulty);
  return {
    grid: normalizedGrid,
    glyphMeta: {
      glyphId,
      glyphLabel,
      meaningText,
      collectionIndex,
      difficulty,
      difficultyTier: DIFFICULTY_TIERS[difficulty] || "intro",
    },
  };
}

const GLYPH_TEMPLATE_DEFS = [
  createGlyphTemplate({
    grid: PRACTICE_STORY[0],
    glyphId: "practice_arrow",
    glyphLabel: "AR",
    meaningText: "導きの矢印",
    collectionIndex: 0,
    difficulty: "practice",
  }),
  createGlyphTemplate({
    grid: PRACTICE_STORY[1],
    glyphId: "practice_lantern",
    glyphLabel: "LT",
    meaningText: "森灯の火種",
    collectionIndex: 1,
    difficulty: "practice",
  }),
  createGlyphTemplate({
    grid: EASY[0],
    glyphId: "easy_heart",
    glyphLabel: "HT",
    meaningText: "森のハート",
    collectionIndex: 2,
    difficulty: "easy",
  }),
  createGlyphTemplate({
    grid: EASY[1],
    glyphId: "easy_smile",
    glyphLabel: "SM",
    meaningText: "木霊の笑顔",
    collectionIndex: 3,
    difficulty: "easy",
  }),
  createGlyphTemplate({
    grid: EASY[2],
    glyphId: "easy_cross",
    glyphLabel: "PL",
    meaningText: "祝福の十字",
    collectionIndex: 4,
    difficulty: "easy",
  }),
  createGlyphTemplate({
    grid: EASY[3],
    glyphId: "easy_swift_arrow",
    glyphLabel: "SW",
    meaningText: "疾風の矢羽",
    collectionIndex: 5,
    difficulty: "easy",
  }),
  createGlyphTemplate({
    grid: MIDDLE[0],
    glyphId: "middle_crest",
    glyphLabel: "CR",
    meaningText: "紋章の盾",
    collectionIndex: 6,
    difficulty: "middle",
  }),
  createGlyphTemplate({
    grid: MIDDLE[1],
    glyphId: "middle_wings",
    glyphLabel: "WG",
    meaningText: "翼の紋章",
    collectionIndex: 7,
    difficulty: "middle",
  }),
  createGlyphTemplate({
    grid: MIDDLE[2],
    glyphId: "middle_spiral",
    glyphLabel: "SR",
    meaningText: "古代の螺旋符",
    collectionIndex: 8,
    difficulty: "middle",
  }),
  createGlyphTemplate({
    grid: MIDDLE[3],
    glyphId: "middle_leaves",
    glyphLabel: "LV",
    meaningText: "双葉の護符",
    collectionIndex: 9,
    difficulty: "middle",
  }),
  createGlyphTemplate({
    grid: MIDDLE[4],
    glyphId: "middle_moon",
    glyphLabel: "MN",
    meaningText: "月光の符",
    collectionIndex: 10,
    difficulty: "middle",
  }),
  createGlyphTemplate({
    grid: MIDDLE_STORY[0],
    glyphId: "middle_orbit",
    glyphLabel: "OR",
    meaningText: "祈りの円環",
    collectionIndex: 11,
    difficulty: "middle",
  }),
  createGlyphTemplate({
    grid: HARD_STORY_TEMPLATES[0],
    glyphId: "hard_flame",
    glyphLabel: "HL",
    meaningText: "焔守の紋",
    collectionIndex: 12,
    difficulty: "hard",
  }),
  createGlyphTemplate({
    grid: HARD_STORY_TEMPLATES[1],
    glyphId: "hard_bulwark",
    glyphLabel: "HD",
    meaningText: "大盾の刻印",
    collectionIndex: 13,
    difficulty: "hard",
  }),
  createGlyphTemplate({
    grid: HARD_STORY_TEMPLATES[2],
    glyphId: "hard_chain",
    glyphLabel: "CL",
    meaningText: "拘束の鎖環",
    collectionIndex: 14,
    difficulty: "hard",
  }),
  createGlyphTemplate({
    grid: HARD_STORY_TEMPLATES[3],
    glyphId: "hard_sapling",
    glyphLabel: "ST",
    meaningText: "聖樹の枝葉",
    collectionIndex: 15,
    difficulty: "hard",
  }),
  createGlyphTemplate({
    grid: HARD_STORY_TEMPLATES[4],
    glyphId: "hard_ring",
    glyphLabel: "RG",
    meaningText: "輪守の環",
    collectionIndex: 16,
    difficulty: "hard",
  }),
  createGlyphTemplate({
    grid: HARD_STORY_TEMPLATES[5],
    glyphId: "hard_starway",
    glyphLabel: "CS",
    meaningText: "星路の結界",
    collectionIndex: 17,
    difficulty: "hard",
  }),
  createGlyphTemplate({
    grid: HARD_EXTRA_TEMPLATES[0],
    glyphId: "hard_breeze",
    glyphLabel: "BR",
    meaningText: "森笛の調べ",
    collectionIndex: 18,
    difficulty: "hard",
  }),
  createGlyphTemplate({
    grid: HARD_EXTRA_TEMPLATES[1],
    glyphId: "hard_key",
    glyphLabel: "KN",
    meaningText: "秘鍵の影",
    collectionIndex: 19,
    difficulty: "hard",
  }),
  createGlyphTemplate({
    grid: ULTRA_STORY_TEMPLATES[0],
    glyphId: "ultra_crown",
    glyphLabel: "GL",
    meaningText: "星辰の冠",
    collectionIndex: 20,
    difficulty: "ultra",
  }),
  createGlyphTemplate({
    grid: ULTRA_STORY_TEMPLATES[1],
    glyphId: "ultra_cycle",
    glyphLabel: "CN",
    meaningText: "円環の碑",
    collectionIndex: 21,
    difficulty: "ultra",
  }),
  createGlyphTemplate({
    grid: ULTRA_STORY_TEMPLATES[2],
    glyphId: "ultra_core",
    glyphLabel: "NX",
    meaningText: "霊核の結晶",
    collectionIndex: 22,
    difficulty: "ultra",
  }),
  createGlyphTemplate({
    grid: ULTRA_STORY_TEMPLATES[3],
    glyphId: "ultra_trident",
    glyphLabel: "TR",
    meaningText: "審判の三叉",
    collectionIndex: 23,
    difficulty: "ultra",
  }),
  createGlyphTemplate({
    grid: ULTRA_STORY_TEMPLATES[4],
    glyphId: "ultra_dawn",
    glyphLabel: "DA",
    meaningText: "黎明の扉",
    collectionIndex: 24,
    difficulty: "ultra",
  }),
  createGlyphTemplate({
    grid: ULTRA_STORY_TEMPLATES[5],
    glyphId: "ultra_protector",
    glyphLabel: "PR",
    meaningText: "守護者の楯",
    collectionIndex: 25,
    difficulty: "ultra",
  }),
  createGlyphTemplate({
    grid: ULTRA_EXTRA_TEMPLATES[0],
    glyphId: "ultra_loom",
    glyphLabel: "LM",
    meaningText: "星紋の織機",
    collectionIndex: 26,
    difficulty: "ultra",
  }),
  createGlyphTemplate({
    grid: ULTRA_EXTRA_TEMPLATES[1],
    glyphId: "ultra_pulse",
    glyphLabel: "PL",
    meaningText: "脈動の星盤",
    collectionIndex: 27,
    difficulty: "ultra",
  }),
  createGlyphTemplate({
    grid: ULTRA_EXTRA_TEMPLATES[2],
    glyphId: "ultra_spire",
    glyphLabel: "SP",
    meaningText: "黎星の尖塔",
    collectionIndex: 28,
    difficulty: "ultra",
  }),
  createGlyphTemplate({
    grid: ULTRA_EXTRA_TEMPLATES[3],
    glyphId: "ultra_aegis",
    glyphLabel: "AG",
    meaningText: "森羅の護環",
    collectionIndex: 29,
    difficulty: "ultra",
  }),
];

const ALL_GLYPH_TEMPLATES = GLYPH_TEMPLATE_DEFS.slice().sort(
  (a, b) => a.glyphMeta.collectionIndex - b.glyphMeta.collectionIndex,
);

const PRACTICE_TEMPLATES = ALL_GLYPH_TEMPLATES.filter(
  (tpl) => tpl.glyphMeta.difficulty === "practice",
);
const EASY_TEMPLATES = ALL_GLYPH_TEMPLATES.filter(
  (tpl) => tpl.glyphMeta.difficulty === "easy",
);
const MIDDLE_TEMPLATES = ALL_GLYPH_TEMPLATES.filter(
  (tpl) => tpl.glyphMeta.difficulty === "middle",
);
const HARD_TEMPLATES = ALL_GLYPH_TEMPLATES.filter(
  (tpl) => tpl.glyphMeta.difficulty === "hard",
);
const ULTRA_TEMPLATES = ALL_GLYPH_TEMPLATES.filter(
  (tpl) => tpl.glyphMeta.difficulty === "ultra",
);

const GLYPH_META_BY_INDEX = new Map();
ALL_GLYPH_TEMPLATES.forEach((tpl) => {
  GLYPH_META_BY_INDEX.set(tpl.glyphMeta.collectionIndex, tpl.glyphMeta);
});

export const GLYPH_COLLECTION = ALL_GLYPH_TEMPLATES.map((tpl) => ({
  ...tpl.glyphMeta,
  grid: clonePuzzle(tpl.grid),
}));

export function getGlyphMetaByIndex(index) {
  const meta = GLYPH_META_BY_INDEX.get(index);
  return meta ? { ...meta } : null;
}

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
  practice: PRACTICE_TEMPLATES,
  easy: EASY_TEMPLATES,
  middle: MIDDLE_TEMPLATES,
  high: HIGH,
  hard: HARD20,
  ultra: ULTRA25,
};

export const PUZZLES_BY_SIZE = {
  5: ALL_GLYPH_TEMPLATES,
  15: HIGH,
  20: HARD20,
  25: ULTRA25,
};

const NODE_PUZZLES = {
  "elf-practice": PRACTICE_TEMPLATES,
  "elf-easy": EASY_TEMPLATES,
  "elf-middle": MIDDLE_TEMPLATES,
  "elf-hard": HARD_TEMPLATES,
  "elf-ultra": ULTRA_TEMPLATES,
};

const NODE_TO_DIFFICULTY = {
  "elf-practice": "practice",
  "elf-easy": "easy",
  "elf-middle": "middle",
  "elf-hard": "hard",
  "elf-ultra": "ultra",
};

const DIFFICULTY_TEMPLATES = {
  practice: PRACTICE_TEMPLATES,
  easy: EASY_TEMPLATES,
  middle: MIDDLE_TEMPLATES,
  hard: HARD_TEMPLATES,
  ultra: ULTRA_TEMPLATES,
};

const DIFFICULTY_OVERLAYS = {
  practice: PRACTICE_OVERLAYS,
  easy: EASY_OVERLAYS,
  middle: MIDDLE_OVERLAYS,
  hard: HARD_OVERLAYS,
  ultra: ULTRA_OVERLAYS,
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

function mergeGrids(primary, secondary) {
  const size = primary.length;
  return primary.map((row, y) =>
    row.map((cell, x) => cell || Boolean(secondary?.[y]?.[x])),
  );
}

function deriveSeed(seed, salt) {
  return normalizeSeed((seed + salt) >>> 0);
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

function pruneSparseCells(grid, rng, maxRemovals = 2) {
  const size = grid.length;
  const candidateCells = [];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (!grid[y][x]) continue;
      let neighbors = 0;
      if (y > 0 && grid[y - 1][x]) neighbors += 1;
      if (y < size - 1 && grid[y + 1][x]) neighbors += 1;
      if (x > 0 && grid[y][x - 1]) neighbors += 1;
      if (x < size - 1 && grid[y][x + 1]) neighbors += 1;
      if (neighbors <= 1) {
        candidateCells.push({ x, y });
      }
    }
  }
  if (!candidateCells.length) return grid;

  const removals = Math.min(maxRemovals, 1 + Math.floor(rng() * candidateCells.length));
  if (removals <= 0) return grid;

  const result = grid.map((row) => row.slice());
  for (let i = 0; i < removals && candidateCells.length; i += 1) {
    const index = Math.floor(rng() * candidateCells.length);
    const { x, y } = candidateCells.splice(index, 1)[0];
    result[y][x] = false;
  }

  const hasFilled = result.some((row) => row.some(Boolean));
  return hasFilled ? result : grid;
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

function applyOverlays(grid, overlays, size, rng) {
  if (!overlays || !overlays.length) return grid;
  let combined = grid;
  if (rng() < 0.6) {
    const overlayTemplate = overlays[Math.floor(rng() * overlays.length)];
    const overlayVariant = applyTemplateTransform(overlayTemplate, size, rng);
    if (overlayVariant) {
      const merged = mergeGrids(grid, overlayVariant);
      if (gridKey(merged) !== gridKey(grid)) {
        combined = merged;
      }
    }
  }
  if (rng() < 0.35) {
    const pruned = pruneSparseCells(combined, rng, 2);
    if (gridKey(pruned) !== gridKey(combined)) {
      combined = pruned;
    }
  }
  return combined;
}

export function generateBattlePuzzles(nodeId, size, count, options = {}) {
  const difficulty = NODE_TO_DIFFICULTY[nodeId] || null;
  const templates =
    difficulty && DIFFICULTY_TEMPLATES[difficulty]?.length
      ? DIFFICULTY_TEMPLATES[difficulty]
      : ALL_GLYPH_TEMPLATES;
  const useAdvancedTransforms = difficulty === "hard" || difficulty === "ultra";
  const overlays = useAdvancedTransforms ? DIFFICULTY_OVERLAYS[difficulty] : null;
  const seedValue = normalizeSeed(options.seed ?? Math.random() * 0xffffffff);
  const rng = createRng(seedValue);
  const allowTransforms = useAdvancedTransforms;
  const requireUniqueSolution =
    difficulty !== "practice" && difficulty !== "easy" && size <= 5;

  if (!useAdvancedTransforms) {
    const baseSelection = templates.slice(0, Math.min(count, templates.length)).map((entry) => ({
      grid: clonePuzzle(entry.grid),
      glyphMeta: entry.glyphMeta ? { ...entry.glyphMeta } : null,
    }));
    while (baseSelection.length < count) {
      const fallbackGrid = createFallbackGrid(size, baseSelection.length);
      baseSelection.push({ grid: fallbackGrid, glyphMeta: null });
    }
    const heroPuzzles = baseSelection.map((entry) => cloneTemplateEntry(entry));
    const enemyPuzzles = baseSelection.map((entry) => clonePuzzle(entry.grid));
    return {
      seed: seedValue,
      heroPuzzles,
      enemyPuzzles,
    };
  }

  const sortedTemplates = templates
    .slice()
    .sort((a, b) => {
      const aIndex = a?.glyphMeta?.collectionIndex ?? Number.MAX_SAFE_INTEGER;
      const bIndex = b?.glyphMeta?.collectionIndex ?? Number.MAX_SAFE_INTEGER;
      return aIndex - bIndex;
    });
  const selection = sortedTemplates.slice(0, Math.min(count, sortedTemplates.length));
  const results = [];
  const seen = new Set();
  const enforceRecentGuard = templates.length > count;

  const variantOptions = { allowTransforms, overlays, requireUniqueSolution, difficulty };

  for (let i = 0; i < selection.length && results.length < count; i += 1) {
    const template = selection[i];
    const candidate = pickTemplateVariant(template, size, rng, variantOptions);
    if (!candidate) continue;
    const key = gridKey(candidate);
    if (seen.has(key)) continue;
    if (enforceRecentGuard && wasRecentlyGenerated(nodeId, key)) continue;
    seen.add(key);
    rememberLayout(nodeId, key);
    results.push({
      grid: clonePuzzle(candidate),
      glyphMeta: template.glyphMeta ? { ...template.glyphMeta } : null,
    });
  }

  if (results.length < count) {
    for (let i = selection.length; i < sortedTemplates.length && results.length < count; i += 1) {
      const entry = sortedTemplates[i];
      if (!entry) continue;
      const candidate = pickTemplateVariant(entry, size, rng, variantOptions);
      if (!candidate) continue;
      const key = gridKey(candidate);
      if (seen.has(key)) continue;
      if (enforceRecentGuard && wasRecentlyGenerated(nodeId, key)) continue;
      seen.add(key);
      rememberLayout(nodeId, key);
      results.push({
        grid: clonePuzzle(candidate),
        glyphMeta: entry.glyphMeta ? { ...entry.glyphMeta } : null,
      });
    }
  }

  if (results.length < count) {
    const fallbackTemplates = drawRandomTemplates(templates, count - results.length, rng);
    fallbackTemplates.forEach((entry) => {
      const candidate = pickTemplateVariant(entry, size, rng, variantOptions);
      if (!candidate) return;
      const key = gridKey(candidate);
      if (seen.has(key)) return;
      if (enforceRecentGuard && wasRecentlyGenerated(nodeId, key)) return;
      seen.add(key);
      rememberLayout(nodeId, key);
      results.push({
        grid: clonePuzzle(candidate),
        glyphMeta: entry.glyphMeta ? { ...entry.glyphMeta } : null,
      });
    });
  }

  if (results.length < count) {
    let variant = 0;
    const maxAttempts = size * size;
    while (results.length < count && variant < maxAttempts) {
      const fallbackGrid = createFallbackGrid(size, variant);
      variant += 1;
      if (requireUniqueSolution && !hasUniqueSolution(fallbackGrid)) {
        continue;
      }
      const key = gridKey(fallbackGrid);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      rememberLayout(nodeId, key);
      results.push({
        grid: clonePuzzle(fallbackGrid),
        glyphMeta: null,
      });
    }
  }

  const heroRng = createRng(deriveSeed(seedValue, 0x9e3779b9));
  const enemyRng = createRng(deriveSeed(seedValue, 0x41c64e6d));

  const heroPuzzles = shuffleWithRng(results, heroRng).map((entry) => cloneTemplateEntry(entry));
  const enemyPuzzles = shuffleWithRng(results, enemyRng).map((entry) => clonePuzzle(entry.grid));

  return {
    seed: seedValue,
    heroPuzzles,
    enemyPuzzles,
  };
}
function drawRandomTemplates(pool, count, rng = Math.random) {
  if (!Array.isArray(pool) || !pool.length || count <= 0) return [];
  const random = typeof rng === "function" ? rng : Math.random;
  const shuffled = shuffleWithRng(pool, () => random());
  const slice = shuffled.slice(0, Math.min(count, shuffled.length));
  return slice.map((entry) => cloneTemplateEntry(entry));
}

export function getPuzzlesForSize(n) {
  return PUZZLES_BY_SIZE[n] || [];
}
export function getRandomPuzzleForSize(n) {
  const arr = getPuzzlesForSize(n);
  if (!arr.length) return null;
  const idx = Math.floor(Math.random() * arr.length);
  return cloneTemplateEntry(arr[idx]);
}

export function getRandomPuzzlesForSize(n, count) {
  const pool = getPuzzlesForSize(n);
  return drawRandomTemplates(pool, count);
}

export function getRandomPuzzlesForNode(nodeId, size, count) {
  const pool = NODE_PUZZLES[nodeId];
  if (Array.isArray(pool) && pool.length) {
    const sizedPool = pool.filter(
      (entry) =>
        entry?.grid?.length === size &&
        entry.grid.every((row) => Array.isArray(row) && row.length === size),
    );
    if (sizedPool.length) {
      return drawRandomTemplates(sizedPool, count);
    }
  }
  const fallbackPool = PUZZLES_BY_SIZE[size] || ALL_GLYPH_TEMPLATES;
  return drawRandomTemplates(fallbackPool, count);
}
