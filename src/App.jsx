import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Opening from "./components/Opening.jsx";
import Prologue from "./components/Prologue.jsx";
import NameEntry from "./components/NameEntry.jsx";
import GameStart from "./components/GameStart.jsx";
import RouteMap from "./components/RouteMap.jsx";
import Conversation from "./components/Conversation.jsx";
import Background from "./components/Background.jsx";
import GameBoard from "./components/GameBoard.jsx";
import EnemyBoard from "./components/EnemyBoard.jsx";
import Timer from "./components/Timer.jsx";
import LevelClear from "./components/LevelClear.jsx";
import PicrossClear from "./components/PicrossClear.jsx";
import Ending from "./components/Ending.jsx";
import GameOver from "./components/GameOver.jsx";
import EnemyVictory from "./components/EnemyVictory.jsx";
import ScoreDisplay from "./components/ScoreDisplay.jsx";
import Tutorial from "./components/Tutorial.jsx";
import { generateBattlePuzzles, GLYPH_COLLECTION } from "./game/puzzles.js";
import { ROUTE, CHARACTERS } from "./game/route.js";
import { computeClues, emptyGrid, equalsSolution, toggleCell } from "./game/utils.js";
import audio from "./audio/AudioManager.js";
import bgm from "./audio/BgmPlayer.js";
import { TRACKS } from "./audio/tracks.js";
import { assetPath } from "./utils/assetPath.js";
import { DEFAULT_HERO_NAME } from "./constants/heroName.js";

const GAME_SECONDS = 30 * 60; // 30 minutes
const SCORE_BONUS = {
  "elf-practice": 1000,
  "elf-easy": 5000,
  "elf-middle": 10000,
  "elf-hard": 15000,
  "elf-ultra": 20000,
};
const REALTIME_CORRECT_BONUS = 100;
const FONT_SIZE_CHOICES = [
  { label: "100%", value: 1 },
  { label: "150%", value: 1.5 },
  { label: "200%", value: 2 },
];
const ROUTE_NODE_IDS = Object.keys(ROUTE.nodes);
const ENEMY_NODE_IDS = ROUTE_NODE_IDS.filter((id) => ROUTE.nodes[id]?.type === "elf");
const ENDING_OPTIONS = [
  { id: "elf-true-ending", label: ROUTE.nodes["elf-true-ending"]?.label || "True Ending" },
  { id: "elf-bad-ending", label: ROUTE.nodes["elf-bad-ending"]?.label || "Bad Ending" },
];
const DEBUG_MENU_BOUNDS = { width: 320, height: 360 };
const DEFAULT_PUZZLES_PER_BATTLE = 2;
const PUZZLES_PER_BATTLE_BY_NODE = {
  "elf-practice": 2,
  "elf-easy": 4,
  "elf-middle": 6,
  "elf-hard": 2,
  "elf-ultra": 4,
};
const FINAL_NODE_IDS = new Set(["elf-bad-ending", "elf-true-ending"]);
const LEGACY_FINAL_NODE_ID = "elf-ending";
const DEFAULT_TRUE_ENDING_NODE = "elf-true-ending";
const AUTO_BGM_SCREENS = new Set([
  "prologue",
  "gamestart",
  "name",
  "route",
  "conversation",
  "picross",
  "picross-clear",
  "ending",
  "gameover",
  "enemy-victory",
  "tutorial",
]);
const OPENING_OPTION_COUNT = 4;
const HERO_IMAGES = {
  normal: assetPath("assets/img/character/hero/hero_normal.png"),
  angry: assetPath("assets/img/character/hero/hero_angry.png"),
  smile: assetPath("assets/img/character/hero/hero_smile.png"),
  fullbody: assetPath("assets/img/character/hero/hero_fullbody.png"),
};
const TITLE_IMAGE = assetPath("assets/img/title.png");
const HERO_FULLBODY = assetPath("assets/img/character/hero/hero_fullbody.png");
const ENDING_BACKGROUND_IMAGE = assetPath("assets/img/background/ending.png");
const MAP_BACKGROUND_IMAGE = assetPath("assets/img/background/map.png");

const GAMEPAD_BUTTON = {
  A: 0,
  B: 1,
  X: 2,
  Y: 3,
  SELECT: 8,
  START: 9,
  UP: 12,
  DOWN: 13,
  LEFT: 14,
  RIGHT: 15,
};
const GAMEPAD_REPEAT_MS = 180;
const SPELL_FREEZE_DURATION = 2200;
const SPELL_CINEMATIC_DURATION = 2100;
const SPELL_THEME_MAP = {
  practice: "radiant",
  easy: "tide",
  middle: "quake",
  hard: "venom",
  ultra: "inferno",
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const normalizeHeroName = (value) => {
  const trimmed = (value ?? "").trim();
  return trimmed.length ? trimmed : DEFAULT_HERO_NAME;
};

function loadGlyphCollection() {
  try {
    const raw = JSON.parse(localStorage.getItem("picrossGlyphCollection") ?? "{}");
    const indices = Array.isArray(raw.indices) ? raw.indices : [];
    const solved = raw.solved && typeof raw.solved === "object" ? raw.solved : {};
    const collectionSet = new Set(
      indices
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value >= 0),
    );
    const solvedMap = new Map();
    Object.entries(solved).forEach(([key, grid]) => {
      const index = Number(key);
      if (!Number.isFinite(index) || !Array.isArray(grid)) return;
      const normalizedGrid = grid.map((row) =>
        Array.isArray(row) ? row.map((cell) => Boolean(cell)) : [],
      );
      solvedMap.set(index, normalizedGrid);
    });
    return { collectionSet, solvedMap };
  } catch {
    return { collectionSet: new Set(), solvedMap: new Map() };
  }
}

function persistGlyphCollection(collection, solved) {
  try {
    const indices = Array.from(collection ?? []);
    const solvedObject = {};
    if (solved instanceof Map) {
      solved.forEach((grid, index) => {
        solvedObject[index] = Array.isArray(grid)
          ? grid.map((row) => (Array.isArray(row) ? row.map((cell) => Boolean(cell)) : []))
          : [];
      });
    }
    localStorage.setItem(
      "picrossGlyphCollection",
      JSON.stringify({
        indices,
        solved: solvedObject,
      }),
    );
  } catch {
    /* ignore storage errors */
  }
}

const ENEMY_AI_CONFIG = {
  "elf-practice": { interval: 1400, errorRate: 0.15 },
  "elf-easy": { interval: 1100, errorRate: 0.1 },
  "elf-middle": { intervalRange: [5000, 10000], errorRate: 0.16 },
  "elf-hard": {
    intervalRange: [5000, 9000],
    successRate: 0.9, // effective成功率 ≒0.75 (errorRate込み)
    targetCompletionRatio: 0.75,
    errorRate: 0.15,
  },
  "elf-ultra": { interval: 600, errorRate: 0.03 },
};

const SPELL_SPEECH_DURATION = 1200;
const SPELL_BOARD_FOCUS_DELAY = 1100;
const SPELL_BOARD_FOCUS_DURATION = 650;

const COMBO_STAGE_DEFS = [
  { id: "stage1", threshold: 10 },
  { id: "stage2", threshold: 15 },
  { id: "stage3", threshold: 20 },
  { id: "stage4", threshold: 25 },
  { id: "overdrive", threshold: 30 },
];

const ENDLESS_INITIAL_BATCH = 30;
const ENDLESS_REFILL_BATCH = 15;
const ENDLESS_REFILL_RATIO = 0.1;

const HERO_STAGE_SET = [
  {
    id: "stage1",
    name: "霧散の矢",
    description: "敵の横1列を浄化して初期状態に戻す",
    speech: "「霧散の矢、邪気を払え！」",
  },
  {
    id: "stage2",
    name: "光脈の連鎖",
    description: "敵の縦1列と横1列を同時に初期化する",
    speech: "「光脈の連鎖、絡め取れ！」",
  },
  {
    id: "stage3",
    name: "星槍の奔流",
    description: "敵の縦2列と横2列を一気に崩す",
    speech: "「星槍の奔流、すべてを穿て！」",
  },
  {
    id: "stage4",
    name: "黎明の審判",
    description: "敵盤の縦横破壊に加え斜め（／）を初期化する",
    speech: "「黎明の審判、道を照らせ！」",
  },
  {
    id: "overdrive",
    name: "森羅オーバードライブ",
    description: "全方位の列と斜めを浄化する究極奥義",
    speech: "「森羅よ、今こそ裁きを！」",
  },
];

const ENEMY_STAGE_SETS = {
  "elf-practice": [
    {
      id: "stage1",
      name: "翠封の霊弓",
      description: "横1列を封じて未回答に戻す",
      speech: "「翠封の霊弓、旅人を惑わせよ！」",
    },
    {
      id: "stage2",
      name: "森門の交差陣",
      description: "縦横1列ずつを封緘する",
      speech: "「森門の交差陣、路を閉ざせ！」",
    },
    {
      id: "stage3",
      name: "巫女の星環",
      description: "縦横2列を同時に巻き戻す",
      speech: "「巫女の星環、侵入者を退けよ！」",
    },
    {
      id: "stage4",
      name: "翠霧の鎖紋",
      description: "縦横に加え斜め（／）を封緘する",
      speech: "「翠霧の鎖紋、視界を断て！」",
    },
    {
      id: "overdrive",
      name: "翠巫の神託",
      description: "全方位の森羅封印で盤面を初期化する",
      speech: "「翠巫の神託、全てを巡らせ！」",
    },
  ],
  "elf-easy": [
    {
      id: "stage1",
      name: "木霊の軌跡",
      description: "横1列の記憶を跳ね飛ばす",
      speech: "「木霊たちよ、足跡を消し去って！」",
    },
    {
      id: "stage2",
      name: "花弧の跳躍",
      description: "縦横1列を揺らし初期化する",
      speech: "「花弧の跳躍、盤面を乱して！」",
    },
    {
      id: "stage3",
      name: "蔦冠の連舞",
      description: "縦横2列を蔦で絡め取る",
      speech: "「蔦冠の連舞、絡め取れ！」",
    },
    {
      id: "stage4",
      name: "花嵐の弧光",
      description: "縦横と斜め（／）を花嵐でかき消す",
      speech: "「花嵐の弧光、道標を散らせ！」",
    },
    {
      id: "overdrive",
      name: "妖精の祝祭",
      description: "縦横斜めすべてを消し去る大乱舞",
      speech: "「妖精の祝祭、全てを舞い散らせ！」",
    },
  ],
  "elf-middle": [
    {
      id: "stage1",
      name: "紋章の灯",
      description: "横1列の刻印を初期化する",
      speech: "「紋章の灯よ、記憶を消しなさい！」",
    },
    {
      id: "stage2",
      name: "秘鍵の交差陣",
      description: "縦横1列を秘鍵で封じる",
      speech: "「秘鍵の交差陣、謎を秘せよ！」",
    },
    {
      id: "stage3",
      name: "星律の共鳴",
      description: "縦横2列を封緘する",
      speech: "「星律の共鳴、紋章を揺るがせ！」",
    },
    {
      id: "stage4",
      name: "古碑の星路",
      description: "縦横に加え斜め（／）を封印する",
      speech: "「古碑の星路、光を遮れ！」",
    },
    {
      id: "overdrive",
      name: "黎紋の終律",
      description: "全方位の紋章を一斉に初期化する",
      speech: "「黎紋の終律、刻印を無に還せ！」",
    },
  ],
  "elf-hard": [
    {
      id: "stage1",
      name: "花冠の矢雨",
      description: "横1列を花粉で覆い初期化する",
      speech: "「花冠の矢雨、視界を霞ませ！」",
    },
    {
      id: "stage2",
      name: "守護樹の蔓撃",
      description: "縦横1列を蔓で打ち払う",
      speech: "「守護樹の蔓撃、彼の者を絡めよ！」",
    },
    {
      id: "stage3",
      name: "精霊の輪舞",
      description: "縦横2列を精霊の力で戻す",
      speech: "「精霊の輪舞、盤を揺るがせ！」",
    },
    {
      id: "stage4",
      name: "森花の螺旋",
      description: "縦横に加え斜め（／）を花弁で覆う",
      speech: "「森花の螺旋、すべてを舞わせ！」",
    },
    {
      id: "overdrive",
      name: "森羅の護輪",
      description: "縦横斜めすべてを護輪で初期化する",
      speech: "「森羅の護輪、侵入者を退けよ！」",
    },
  ],
  "elf-ultra": [
    {
      id: "stage1",
      name: "森羅の号砲",
      description: "横1列を裁きの雷で初期化する",
      speech: "「森羅の号砲、踏破を阻め！」",
    },
    {
      id: "stage2",
      name: "星羅の審槍",
      description: "縦横1列を雷槍で打ち払う",
      speech: "「星羅の審槍、罪を断て！」",
    },
    {
      id: "stage3",
      name: "審判の双閃",
      description: "縦横2列を同時に巻き戻す",
      speech: "「審判の双閃、全てを焼き払え！」",
    },
    {
      id: "stage4",
      name: "星河の断罪",
      description: "縦横に加え斜め（／）を裁く",
      speech: "「星河の断罪、道筋を絶て！」",
    },
    {
      id: "overdrive",
      name: "森羅終焉陣",
      description: "全方位を光の裁きで初期化する",
      speech: "「森羅終焉陣、侵入者を赦さない！」",
    },
  ],
  default: [
    {
      id: "stage1",
      name: "古森の囁き",
      description: "横1列を初期化する",
      speech: "「古森の囁き、路を隠せ！」",
    },
    {
      id: "stage2",
      name: "樹霊の交差",
      description: "縦横1列を戻す",
      speech: "「樹霊の交差、絡み付け！」",
    },
    {
      id: "stage3",
      name: "精霊の集束",
      description: "縦横2列を初期化する",
      speech: "「精霊の集束、形を崩せ！」",
    },
    {
      id: "stage4",
      name: "森影の斜光",
      description: "縦横に加え斜め（／）を封じる",
      speech: "「森影の斜光、道を迷わせ！」",
    },
    {
      id: "overdrive",
      name: "森羅の咆哮",
      description: "全方位を初期化する",
      speech: "「森羅の咆哮、全てを飲み込め！」",
    },
  ],
};

const DEFAULT_ENEMY_CONFIG = { interval: 1200, errorRate: 0.08 };

function deriveDifficultyFromSize(n) {
  if (n <= 5) return "easy";
  if (n <= 10) return "middle";
  if (n <= 15) return "high";
  if (n <= 20) return "hard";
  return "ultra";
}

function normalizeNodeId(id) {
  if (id === LEGACY_FINAL_NODE_ID) return DEFAULT_TRUE_ENDING_NODE;
  return id;
}

function getPuzzleGoalForNode(nodeId) {
  if (!nodeId) return DEFAULT_PUZZLES_PER_BATTLE;
  const normalized = normalizeNodeId(nodeId);
  return PUZZLES_PER_BATTLE_BY_NODE[normalized] ?? DEFAULT_PUZZLES_PER_BATTLE;
}

function readStoredNode() {
  try {
    const stored = localStorage.getItem("routeNode") || "start";
    const normalized = normalizeNodeId(stored);
    if (normalized !== stored) {
      localStorage.setItem("routeNode", normalized);
    }
    return normalized;
  } catch {
    return "start";
  }
}

function readStoredClearedSet() {
  try {
    const raw = JSON.parse(localStorage.getItem("clearedNodes") || "[]");
    const items = Array.isArray(raw) ? raw : [];
    const normalized = items.map((id) => normalizeNodeId(id));
    if (
      Array.isArray(raw) &&
      normalized.length === items.length &&
      normalized.some((id, idx) => id !== items[idx])
    ) {
      localStorage.setItem("clearedNodes", JSON.stringify(normalized));
    }
    return new Set(normalized);
  } catch {
    return new Set();
  }
}

function readStoredScore() {
  try {
    const raw = localStorage.getItem("score");
    if (!raw) return 0;
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

function cloneSolution(grid) {
  return grid.map((row) => row.slice());
}

function createFallbackSolution(n) {
  return Array.from({ length: n }, (_, r) =>
    Array.from({ length: n }, (_, c) => r === c || r + c === n - 1),
  ).map((row) => row.map((v) => Boolean(v)));
}

function makeRandomAnchoredGrid(n, seed = 0) {
  const rng = () => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };
  const density = 0.35 + (rng() * 0.25);
  const grid = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => rng() < density),
  );
  const anchorLen = Math.max(1, Math.ceil(n * 0.6));
  const anchorRow = seed % n;
  const anchorCol = (seed * 3) % n;
  for (let c = 0; c < anchorLen; c += 1) {
    const col = (anchorCol + c) % n;
    grid[anchorRow][col] = true;
  }
  for (let r = 0; r < anchorLen; r += 1) {
    const row = (anchorRow + r) % n;
    grid[row][anchorCol] = true;
  }
  return grid.map((row) => row.slice());
}

function hasAnchorLine(grid) {
  if (!Array.isArray(grid) || !grid.length) return false;
  const size = grid.length;
  const clues = computeClues(grid);
  const anchorMatches = (clue) => {
    if (!Array.isArray(clue) || !clue.length) return false;
    const key = clue.join(",");
    if (size <= 5 && (key === "4" || key === "5" || key === "3,1" || key === "1,3" || key === "1,1,1")) {
      return true;
    }
    const sum = clue.reduce((acc, v) => acc + v, 0);
    const max = Math.max(...clue);
    const threshold = Math.max(1, Math.ceil(size * 0.6));
    return max >= threshold || sum >= threshold;
  };
  return (
    clues.rows.some((clue) => anchorMatches(clue)) ||
    clues.cols.some((clue) => anchorMatches(clue))
  );
}

function shuffle(array) {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function computeReadyStages(count, prevReady = []) {
  const readySet = new Set(prevReady);
  COMBO_STAGE_DEFS.forEach(({ id, threshold }) => {
    if (count >= threshold) readySet.add(id);
  });
  return COMBO_STAGE_DEFS.filter(({ id }) => readySet.has(id)).map(({ id }) => id);
}

function getStageSet(side, nodeId) {
  if (side === "hero") {
    return HERO_STAGE_SET;
  }
  return ENEMY_STAGE_SETS[nodeId] || ENEMY_STAGE_SETS.default;
}

function getStageMeta(side, nodeId, stageId) {
  const stages = getStageSet(side, nodeId);
  return stages.find((stage) => stage.id === stageId) || null;
}

function getStageThreshold(stageId) {
  const entry = COMBO_STAGE_DEFS.find((stage) => stage.id === stageId);
  return entry ? entry.threshold : Infinity;
}

function selectUniqueIndices(size, count) {
  const max = Math.max(0, size);
  if (!max) return [];
  const target = Math.min(count, max);
  const indices = new Set();
  while (indices.size < target) {
    indices.add(Math.floor(Math.random() * max));
  }
  return Array.from(indices);
}

function resolveStageEffect(stageId, size) {
  const base = {
    rows: [],
    cols: [],
    slash: false,
    backslash: false,
  };
  switch (stageId) {
    case "stage1":
      base.rows = selectUniqueIndices(size, 1);
      break;
    case "stage2":
      base.rows = selectUniqueIndices(size, 1);
      base.cols = selectUniqueIndices(size, 1);
      break;
    case "stage3":
      base.rows = selectUniqueIndices(size, Math.min(2, size));
      base.cols = selectUniqueIndices(size, Math.min(2, size));
      break;
    case "stage4":
      base.rows = selectUniqueIndices(size, Math.min(2, size));
      base.cols = selectUniqueIndices(size, Math.min(2, size));
      base.slash = true;
      break;
    case "overdrive":
      base.rows = selectUniqueIndices(size, Math.min(2, size));
      base.cols = selectUniqueIndices(size, Math.min(2, size));
      base.slash = true;
      base.backslash = true;
      break;
    default:
      base.rows = selectUniqueIndices(size, 1);
      break;
  }
  return base;
}

function countCorrectFilled(grid, solution) {
  let count = 0;
  for (let r = 0; r < solution.length; r += 1) {
    for (let c = 0; c < solution[r].length; c += 1) {
      if (!solution[r][c]) continue;
      if (grid[r]?.[c] === 1) count += 1;
    }
  }
  return count;
}

function hashGrid(grid) {
  if (!Array.isArray(grid)) return "";
  return grid
    .map((row) => (Array.isArray(row) ? row.map((v) => (v ? 1 : 0)).join("") : ""))
    .join("|");
}

function deferTick() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function resolveSpellTheme(difficulty) {
  const key = (difficulty || "").toLowerCase();
  if (key.includes("ultra")) return SPELL_THEME_MAP.ultra;
  if (key.includes("hard")) return SPELL_THEME_MAP.hard;
  if (key.includes("middle") || key.includes("normal")) return SPELL_THEME_MAP.middle;
  if (key.includes("easy")) return SPELL_THEME_MAP.easy;
  if (key.includes("practice")) return SPELL_THEME_MAP.practice;
  return SPELL_THEME_MAP.practice;
}

function createComboTrack() {
  return {
    count: 0,
    show: false,
    label: 0,
    pulse: 0,
    readyStages: [],
  };
}

export default function App() {
  const [screen, setScreen] = useState("prologue");
  const [level, setLevel] = useState("easy");
  const [grid, setGrid] = useState([]);
  const [solution, setSolution] = useState([]);
  const [startedAt, setStartedAt] = useState(null);
  const [remaining, setRemaining] = useState(GAME_SECONDS);
  const [bgSeed, setBgSeed] = useState(0);
  const [inputMode, setInputMode] = useState("mouse");
  const [gamepadConnected, setGamepadConnected] = useState(false);
  const [openingFocus, setOpeningFocus] = useState(0);
  const [gamepadCursor, setGamepadCursor] = useState({ row: 0, col: 0 });
  const [gameStartNameVisible, setGameStartNameVisible] = useState(false);
  const [gameStartPhase, setGameStartPhase] = useState("before");
  const [soundOn, setSoundOn] = useState(() => {
    try {
      return localStorage.getItem("soundOn") === "1";
    } catch {
      return false;
    }
  });
  const [fontScale, setFontScale] = useState(() => {
    try {
      const stored = parseFloat(localStorage.getItem("fontScale") || "1.5");
      if (!Number.isFinite(stored)) return 1.5;
      return FONT_SIZE_CHOICES.some((opt) => opt.value === stored) ? stored : 1.5;
    } catch {
      return 1.5;
    }
  });
  const [score, setScore] = useState(() => readStoredScore());
  const [displayScore, setDisplayScore] = useState(() => readStoredScore());
  const [scoreAnimating, setScoreAnimating] = useState(false);
  const [enemyScore, setEnemyScore] = useState(0);
  const [displayEnemyScore, setDisplayEnemyScore] = useState(0);
  const [enemyScoreAnimating, setEnemyScoreAnimating] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [debugMenuOpen, setDebugMenuOpen] = useState(false);
  const [debugMenuPosition, setDebugMenuPosition] = useState({ x: 0, y: 0 });
  const debugMenuRef = useRef(null);
  const debugMenuOpenRef = useRef(false);
  const pointerPositionRef = useRef({ x: 0, y: 0 });
  const [debugRevealMap, setDebugRevealMap] = useState(false);
  const routeJumpOptions = useMemo(
    () =>
      ROUTE_NODE_IDS.map((id) => ({
        id,
        label: ROUTE.nodes[id]?.label || id,
      })),
    [],
  );
  const enemyJumpOptions = useMemo(
    () =>
      ENEMY_NODE_IDS.map((id) => ({
        id,
        label: ROUTE.nodes[id]?.label || id,
        name: CHARACTERS[id]?.name || null,
      })),
    [],
  );
  const openDebugMenu = useCallback(() => {
    if (typeof window === "undefined") return;
    const { innerWidth, innerHeight } = window;
    const pointer = pointerPositionRef.current || {};
    const width = DEBUG_MENU_BOUNDS.width;
    const height = DEBUG_MENU_BOUNDS.height;
    const maxX = Math.max(16, innerWidth - width - 16);
    const maxY = Math.max(16, innerHeight - height - 16);
    const fallbackX = innerWidth / 2;
    const fallbackY = innerHeight / 2;
    const safeX = Math.min(Math.max(pointer.x ?? fallbackX, 16), maxX);
    const safeY = Math.min(Math.max(pointer.y ?? fallbackY, 16), maxY);
    setDebugMenuPosition({ x: safeX, y: safeY });
    setDebugMenuOpen(true);
    debugMenuOpenRef.current = true;
  }, []);
  const closeDebugMenu = useCallback(() => {
    setDebugMenuOpen(false);
    debugMenuOpenRef.current = false;
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handlePointerMove = (event) => {
      pointerPositionRef.current = { x: event.clientX, y: event.clientY };
    };
    window.addEventListener("pointermove", handlePointerMove);
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handleKeyDown = (event) => {
      if (event.defaultPrevented) return;
      if (
        event.key === "Control" &&
        !event.repeat &&
        !event.altKey &&
        !event.metaKey &&
        !event.shiftKey
      ) {
        event.preventDefault();
        if (debugMenuOpenRef.current) {
          closeDebugMenu();
        } else {
          openDebugMenu();
        }
      } else if (event.key === "Escape" && debugMenuOpenRef.current) {
        event.preventDefault();
        closeDebugMenu();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeDebugMenu, openDebugMenu]);

  useEffect(() => {
    try {
      if (debugMode) {
        localStorage.setItem("debugMode", "1");
      } else {
        localStorage.removeItem("debugMode");
      }
    } catch {
      /* ignore storage errors */
    }
  }, [debugMode]);

  useEffect(() => {
    try {
      if (debugRevealMap) {
        localStorage.setItem("debugRevealMap", "1");
      } else {
        localStorage.removeItem("debugRevealMap");
      }
    } catch {
      /* ignore storage errors */
    }
  }, [debugRevealMap]);
  useEffect(() => {
    if (!debugMenuOpen) return;
    const menuEl = debugMenuRef.current;
    if (!menuEl) return;
    const firstFocusable = menuEl.querySelector("button, [tabindex]");
    if (firstFocusable && typeof firstFocusable.focus === "function") {
      firstFocusable.focus({ preventScroll: true });
    }
  }, [debugMenuOpen]);
  const handleDebugMenuKeyDown = useCallback((event) => {
    if (
      ![
        "ArrowDown",
        "ArrowUp",
        "ArrowLeft",
        "ArrowRight",
        "Home",
        "End",
      ].includes(event.key)
    ) {
      return;
    }
    const menuEl = debugMenuRef.current;
    if (!menuEl) return;
    const focusable = Array.from(menuEl.querySelectorAll("button"));
    if (!focusable.length) return;
    const currentIndex = focusable.indexOf(document.activeElement);
    if (currentIndex === -1) {
      focusable[0]?.focus();
      event.preventDefault();
      return;
    }
    event.preventDefault();
    let nextIndex = currentIndex;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % focusable.length;
    } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + focusable.length) % focusable.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = focusable.length - 1;
    }
    focusable[nextIndex]?.focus();
  }, []);
  const handleDebugMenuOverlayMouseDown = useCallback(
    (event) => {
      if (event.target === event.currentTarget) {
        closeDebugMenu();
      }
    },
    [closeDebugMenu],
  );
  const toggleDebugInstantClear = useCallback(() => {
    setDebugMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("debugMode", next ? "1" : "0");
      } catch {}
      return next;
    });
  }, []);
  const toggleDebugRevealMap = useCallback(() => {
    setDebugRevealMap((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("debugRevealMap", next ? "1" : "0");
      } catch {}
      return next;
    });
  }, []);
  const [heroName, setHeroName] = useState(() => {
    try {
      const stored = localStorage.getItem("heroName");
      if (stored && stored.trim()) return stored;
    } catch {}
    return DEFAULT_HERO_NAME;
  });
  const updateHeroName = useCallback((value) => {
    const normalized = normalizeHeroName(value);
    setHeroName(normalized);
    try {
      localStorage.setItem("heroName", normalized);
    } catch {}
  }, []);
  const spedUpRef = useRef(false);
  const resumeOnceRef = useRef(false);
  const initialPrologueBgmRef = useRef(false);
  const glyphStorageRef = useRef(loadGlyphCollection());
  const glyphUnlocksRef = useRef(new Map());
  const [currentNode, setCurrentNode] = useState(() => readStoredNode());
  const [lastNode, setLastNode] = useState("");
  const [pendingNode, setPendingNode] = useState(null);
  const [battleNode, setBattleNode] = useState(null);
  const [cleared, setCleared] = useState(() => readStoredClearedSet());
  const [endingNode, setEndingNode] = useState(null);
  const [puzzleSequence, setPuzzleSequence] = useState([]);
  const [enemyPuzzleSequence, setEnemyPuzzleSequence] = useState([]);
  const [heroPuzzleIndex, setHeroPuzzleIndex] = useState(0);
  const [playerWins, setPlayerWins] = useState(0);
  const [enemyWins, setEnemyWins] = useState(0);
  const [enemyGrid, setEnemyGrid] = useState([]);
  const [activeSpell, setActiveSpell] = useState(null);
  const [spellSpeech, setSpellSpeech] = useState({ hero: null, enemy: null });
  const [spellFreeze, setSpellFreeze] = useState(false);
  const [spellCinematic, setSpellCinematic] = useState(null);
  const [conversationTransition, setConversationTransition] = useState("none");
  const [postClearAction, setPostClearAction] = useState(null);
  const [glyphCollection, setGlyphCollection] = useState(
    () => glyphStorageRef.current.collectionSet,
  );
  const [glyphSolved, setGlyphSolved] = useState(() => glyphStorageRef.current.solvedMap);
  const [recentGlyphUnlocks, setRecentGlyphUnlocks] = useState([]);
  const [tutorialCompleted, setTutorialCompleted] = useState(false);
  const [hiddenRowClues, setHiddenRowClues] = useState([]);
  const [hiddenColClues, setHiddenColClues] = useState([]);
  const [lockedRowClues, setLockedRowClues] = useState([]);
  const [lockedColClues, setLockedColClues] = useState([]);
  const [fadedCells, setFadedCells] = useState([]);
  const [enemyFadedCells, setEnemyFadedCells] = useState([]);
  const [paused, setPaused] = useState(false);
  const [projectiles, setProjectiles] = useState([]);
  const [comboState, setComboState] = useState(() => ({
    hero: createComboTrack(),
    enemy: createComboTrack(),
  }));
  const [boardLocks, setBoardLocks] = useState({ hero: false, enemy: false });
  const [endlessSize, setEndlessSize] = useState(null);
  const [endlessQueue, setEndlessQueue] = useState([]);
  const [endlessGrid, setEndlessGrid] = useState([]);
  const [endlessSolution, setEndlessSolution] = useState([]);
  const [endlessClues, setEndlessClues] = useState({ rows: [], cols: [] });
  const [endlessSolvedCount, setEndlessSolvedCount] = useState(0);
  const [endlessLoading, setEndlessLoading] = useState(false);
  const [endlessError, setEndlessError] = useState(null);
  const boardLocksRef = useRef(boardLocks);
  const comboStateRef = useRef(comboState);
  const endlessSolutionRef = useRef([]);
  const endlessCurrentRef = useRef(null);
  const endlessSeenRef = useRef(new Set());
  const size = solution.length;
  const clues = useMemo(() => computeClues(solution), [solution]);

  const resetCombo = useCallback((side) => {
    setComboState((prev) => {
      const nextTrack = createComboTrack();
      if (
        prev[side].count === 0 &&
        !prev[side].show &&
        !(prev[side].readyStages && prev[side].readyStages.length)
      ) {
        return prev;
      }
      return { ...prev, [side]: nextTrack };
    });
  }, []);

  const resetAllCombos = useCallback(() => {
    setComboState({
      hero: createComboTrack(),
      enemy: createComboTrack(),
    });
  }, []);

  const incrementCombo = useCallback((side) => {
    setComboState((prev) => {
      const current = prev[side];
      const nextCount = current.count + 1;
      const shouldShow = nextCount >= 2;
      const readyStages = computeReadyStages(nextCount, current.readyStages);
      const unlocked = readyStages.length > current.readyStages.length;
      const nextTrack = {
        count: nextCount,
        show: shouldShow,
        label: nextCount,
        pulse: shouldShow ? current.pulse + 1 : current.pulse,
        readyStages,
      };
      if (unlocked && !shouldShow) {
        nextTrack.show = true;
      }
      return { ...prev, [side]: nextTrack };
    });
  }, []);

  const lockBoard = useCallback((side, duration = 1200) => {
    boardLocksRef.current = { ...boardLocksRef.current, [side]: true };
    setBoardLocks((prev) => {
      if (prev[side]) return prev;
      const next = { ...prev, [side]: true };
      return next;
    });
    if (boardLockTimeoutRef.current[side]) {
      clearTimeout(boardLockTimeoutRef.current[side]);
    }
    boardLockTimeoutRef.current[side] = setTimeout(() => {
      setBoardLocks((prev) => {
        if (!prev[side]) return prev;
        const next = { ...prev, [side]: false };
        boardLocksRef.current = next;
        return next;
      });
      boardLockTimeoutRef.current[side] = null;
    }, duration);
  }, []);

  const launchProjectile = useCallback((variant) => {
    setProjectiles((prev) => {
      const id = `${variant}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const next = [...prev, { id, variant }];
      setTimeout(() => {
        setProjectiles((state) => state.filter((p) => p.id !== id));
      }, 1000);
      return next;
    });
  }, []);

  const startSpellFreeze = useCallback(() => {
    if (spellFreezeTimeoutRef.current) {
      clearTimeout(spellFreezeTimeoutRef.current);
      spellFreezeTimeoutRef.current = null;
    }
    setSpellFreeze(true);
    spellFreezeTimeoutRef.current = setTimeout(() => {
      setSpellFreeze(false);
      spellFreezeTimeoutRef.current = null;
    }, SPELL_FREEZE_DURATION);
  }, []);

  const showSpellOverlay = useCallback(
    (payload) => {
      if (spellOverlayTimeoutRef.current) {
        clearTimeout(spellOverlayTimeoutRef.current);
        spellOverlayTimeoutRef.current = null;
      }
      setActiveSpell(payload);
      startSpellFreeze();

      const caster = payload?.caster;
      const speechText = typeof payload?.speech === "string" ? payload.speech.trim() : "";
      const casterImage =
        payload?.image ||
        (caster === "hero"
          ? HERO_IMAGES.fullbody
          : CHARACTERS[battleNode]?.images?.angry || HERO_IMAGES.angry);
      const nodeDifficulty = CHARACTERS[battleNode]?.difficulty || level;
      const theme = resolveSpellTheme(nodeDifficulty);
      const impactCells = Array.isArray(payload?.impactCells) ? payload.impactCells : [];
      const boardSize = payload?.boardSize || 10;
      // Expand impact cells to a small halo so近傍セルも光る
      const haloCells = [];
      const seen = new Set();
      impactCells.forEach(({ r, c }) => {
        for (let dr = -1; dr <= 1; dr += 1) {
          for (let dc = -1; dc <= 1; dc += 1) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr < 0 || nr >= boardSize || nc < 0 || nc >= boardSize) continue;
            const key = `${nr}-${nc}`;
            if (seen.has(key)) continue;
            seen.add(key);
            haloCells.push({ r: nr, c: nc });
          }
        }
      });

      setSpellCinematic({
        caster,
        target: payload?.target || (caster === "hero" ? "enemy" : "hero"),
        theme,
        image: casterImage,
        name: payload?.name || "Spell",
        description: payload?.description || "",
        speech: speechText || "",
        impact: impactCells,
        impactHalo: haloCells,
        boardSize,
        showBoard: false,
        attachToBoard: payload?.attachToBoard ?? payload?.target === "enemy",
      });
      if (spellCinematicTimeoutRef.current) {
        clearTimeout(spellCinematicTimeoutRef.current);
      }
      spellCinematicTimeoutRef.current = setTimeout(() => {
        setSpellCinematic(null);
        spellCinematicTimeoutRef.current = null;
      }, SPELL_CINEMATIC_DURATION);

      if (caster && speechText) {
        if (speechTimeoutRef.current[caster]) {
          clearTimeout(speechTimeoutRef.current[caster]);
        }
        setSpellSpeech((prev) => ({ ...prev, [caster]: speechText }));
        speechTimeoutRef.current[caster] = setTimeout(() => {
          setSpellSpeech((prev) => ({ ...prev, [caster]: null }));
          speechTimeoutRef.current[caster] = null;
        }, SPELL_SPEECH_DURATION);
      }

      spellOverlayTimeoutRef.current = setTimeout(() => {
        setActiveSpell(null);
        spellOverlayTimeoutRef.current = null;
      }, SPELL_SPEECH_DURATION);

      if (spellBoardFocusTimeoutRef.current.delay) {
        clearTimeout(spellBoardFocusTimeoutRef.current.delay);
      }
      if (spellBoardFocusTimeoutRef.current.hide) {
        clearTimeout(spellBoardFocusTimeoutRef.current.hide);
      }
      spellBoardFocusTimeoutRef.current.delay = setTimeout(() => {
        setSpellCinematic((prev) => (prev ? { ...prev, showBoard: true } : prev));
        spellBoardFocusTimeoutRef.current.delay = null;
        spellBoardFocusTimeoutRef.current.hide = setTimeout(() => {
          setSpellCinematic((prev) => (prev ? { ...prev, showBoard: false } : prev));
          spellBoardFocusTimeoutRef.current.hide = null;
        }, SPELL_BOARD_FOCUS_DURATION);
      }, SPELL_BOARD_FOCUS_DELAY);
    },
    [battleNode, level, startSpellFreeze],
  );

  const applyStageEffect = useCallback(
    (caster, stageId) => {
      if (!battleNode || !stageId) return;
      const target = caster === "hero" ? "enemy" : "hero";
      const stageMeta = getStageMeta(caster, battleNode, stageId);
      const stageEffectTarget =
        target === "enemy" ? enemySolutionRef.current : solution;
      const size = stageEffectTarget?.length || 0;
      if (!size) return;

      const effect = resolveStageEffect(stageId, size);
      const affected = new Set();
      const coords = [];
      const register = (r, c) => {
        if (r < 0 || r >= size || c < 0 || c >= size) return;
        const key = `${r}-${c}`;
        if (affected.has(key)) return;
        affected.add(key);
        coords.push({ r, c, key });
      };

      (effect.rows || []).forEach((rowIdx) => {
        for (let c = 0; c < size; c += 1) {
          register(rowIdx, c);
        }
      });
      (effect.cols || []).forEach((colIdx) => {
        for (let r = 0; r < size; r += 1) {
          register(r, colIdx);
        }
      });
      if (effect.slash) {
        for (let i = 0; i < size; i += 1) {
          register(i, size - 1 - i);
        }
      }
      if (effect.backslash) {
        for (let i = 0; i < size; i += 1) {
          register(i, i);
        }
      }

      if (!coords.length) return;

      if (target === "enemy") {
        const solutionMask = enemySolutionRef.current || [];
        const removalQueue = [];
        setEnemyGrid((prev) => {
          if (!prev.length) return prev;
          const next = prev.map((row) => row.slice());
          coords.forEach(({ r, c, key }) => {
            if (!solutionMask?.[r]?.[c]) return;
            if (next[r]?.[c] !== 0) {
              if (next[r][c] === 1) {
                removalQueue.push({ r, c });
              }
              next[r][c] = 0;
            }
          });
          return next;
        });
        if (removalQueue.length) {
          enemyProgressRef.current.filled = Math.max(
            0,
            enemyProgressRef.current.filled - removalQueue.length,
          );
        }
        const state = enemyOrderRef.current;
        const remaining = state.list.slice(state.index);
        const appended = [...removalQueue, ...remaining];
        const dedupe = new Map();
        appended.forEach(({ r, c }) => {
          const key = `${r}-${c}`;
          dedupe.set(key, { r, c });
        });
        enemyOrderRef.current = {
          list: Array.from(dedupe.values()),
          index: 0,
        };
        if (coords.length) {
          const keys = coords.map(({ key }) => key);
          setEnemyFadedCells(keys);
          if (hiddenTimersRef.current.enemyFaded) {
            clearTimeout(hiddenTimersRef.current.enemyFaded);
          }
          hiddenTimersRef.current.enemyFaded = setTimeout(() => {
            setEnemyFadedCells([]);
            hiddenTimersRef.current.enemyFaded = null;
          }, 1200);
        }
        lockBoard("enemy");
      } else {
        const highlight = new Set();
        setGrid((prev) => {
          if (!prev.length) return prev;
          const next = prev.map((row) => row.slice());
          coords.forEach(({ r, c, key }) => {
            if (next[r]?.[c] !== 0) {
              next[r][c] = 0;
            }
            highlight.add(key);
          });
          return next;
        });
        coords.forEach(({ r, c }) => {
          realtimeBonusRef.current.delete(`${r}:${c}`);
        });
        if (highlight.size) {
          setFadedCells(Array.from(highlight));
          if (hiddenTimersRef.current.faded) {
            clearTimeout(hiddenTimersRef.current.faded);
          }
          hiddenTimersRef.current.faded = setTimeout(() => {
            setFadedCells([]);
            hiddenTimersRef.current.faded = null;
          }, 1200);
        }
        lockBoard("hero");
      }

      const casterMeta =
        caster === "hero"
          ? { image: HERO_IMAGES.angry }
          : { image: CHARACTERS[battleNode]?.images?.angry };

      showSpellOverlay({
        caster,
        spellId: stageId,
        name: stageMeta?.name || "Spell",
        description: stageMeta?.description || "",
        image: casterMeta.image,
        speech: stageMeta?.speech,
        impactCells: coords.map(({ r, c }) => ({ r, c })),
        boardSize: size,
        target,
      });
      audio.playSpellAttack(caster === "hero" ? "hero" : "enemy");
      launchProjectile(caster === "hero" ? "hero" : "enemy");
    },
    [audio, battleNode, launchProjectile, lockBoard, showSpellOverlay, solution],
  );

  const triggerComboStage = useCallback(
    (side, stageId) => {
      if (!stageId) return;
      applyStageEffect(side, stageId);
      resetCombo(side);
    },
    [applyStageEffect, resetCombo],
  );

  const handleHeroStageSelect = useCallback(
    (stageId) => {
      if (!stageId) return;
      const track = comboState.hero || createComboTrack();
      if (!track.readyStages?.includes(stageId)) return;
      if (boardLocks.enemy) return;
      triggerComboStage("hero", stageId);
    },
    [boardLocks.enemy, comboState.hero, triggerComboStage],
  );

  const playerAvatar = useMemo(
    () => ({
      src: HERO_IMAGES.normal,
      alt: heroName?.trim() ? heroName : "主人公",
    }),
    [heroName],
  );

  const enemyAvatar = useMemo(() => {
    if (!battleNode) return null;
    const meta = CHARACTERS[battleNode];
    if (!meta?.images?.normal) return null;
    return {
      src: meta.images.normal,
      alt: meta.name || "敵キャラクター",
    };
  }, [battleNode]);

  const cancelCelebration = useCallback(() => {
    if (typeof audio.stopClearFanfare === "function") {
      audio.stopClearFanfare();
    }
  }, []);

  const scoreRef = useRef(score);
  const displayScoreRef = useRef(displayScore);
  const scoreAnimTimerRef = useRef(null);
  const enemyScoreRef = useRef(enemyScore);
  const displayEnemyScoreRef = useRef(displayEnemyScore);
  const enemyScoreAnimTimerRef = useRef(null);
  const realtimeBonusRef = useRef(new Set());
  const enemySolverRef = useRef(null);
  const hiddenTimersRef = useRef({ hidden: null, locked: null, faded: null, enemyFaded: null });
  const spellOverlayTimeoutRef = useRef(null);
  const spellFreezeTimeoutRef = useRef(null);
  const spellCinematicTimeoutRef = useRef(null);
  const spellBoardFocusTimeoutRef = useRef({ delay: null, hide: null });
  const speechTimeoutRef = useRef({ hero: null, enemy: null });
  const conversationControlsRef = useRef(null);
  const lastGamepadButtonsRef = useRef({});
  const gamepadRepeatRef = useRef({});
  const gamepadCursorRef = useRef({ row: 0, col: 0 });
  const lastGamepadUsedRef = useRef(0);
  const heroStateRef = useRef({});
  const enemyProgressRef = useRef({ filled: 0, total: 0 });
  const totalCellsRef = useRef(0);
  const boardLockTimeoutRef = useRef({ hero: null, enemy: null });
  const enemyStageCooldownRef = useRef(null);
  const enemyCastingRef = useRef(false);
  const enemyOrderRef = useRef({ list: [], index: 0 });
  const puzzleSolvedRef = useRef(false);
  const enemySolutionRef = useRef([]);
  const [enemySolutionVersion, setEnemySolutionVersion] = useState(0);

  useEffect(() => {
    gamepadCursorRef.current = gamepadCursor;
  }, [gamepadCursor]);

  useEffect(() => {
    if (screen === "picross" && size > 0) {
      const center = Math.floor(size / 2);
      setGamepadCursor({ row: center, col: center });
    }
  }, [screen, size]);

  useEffect(() => {
    const handlePointerInput = () => {
      lastGamepadUsedRef.current = 0;
      if (inputMode !== "mouse") {
        setInputMode("mouse");
      }
    };

    window.addEventListener("mousemove", handlePointerInput);
    window.addEventListener("mousedown", handlePointerInput);
    window.addEventListener("touchstart", handlePointerInput, { passive: true });

    return () => {
      window.removeEventListener("mousemove", handlePointerInput);
      window.removeEventListener("mousedown", handlePointerInput);
      window.removeEventListener("touchstart", handlePointerInput);
    };
  }, [inputMode]);

  const stopEnemySolver = useCallback(() => {
    if (enemySolverRef.current) {
      clearInterval(enemySolverRef.current);
      enemySolverRef.current = null;
    }
  }, []);

  const clearSpellEffects = useCallback(() => {
    const timers = hiddenTimersRef.current;
    if (timers.hidden) {
      clearTimeout(timers.hidden);
      timers.hidden = null;
    }
    if (timers.locked) {
      clearTimeout(timers.locked);
      timers.locked = null;
    }
    if (timers.faded) {
      clearTimeout(timers.faded);
      timers.faded = null;
    }
    if (timers.enemyFaded) {
      clearTimeout(timers.enemyFaded);
      timers.enemyFaded = null;
    }
    Object.keys(boardLockTimeoutRef.current).forEach((side) => {
      const timer = boardLockTimeoutRef.current[side];
      if (timer) {
        clearTimeout(timer);
        boardLockTimeoutRef.current[side] = null;
      }
    });
    setBoardLocks({ hero: false, enemy: false });
    boardLocksRef.current = { hero: false, enemy: false };
    enemyCastingRef.current = false;
    if (enemyStageCooldownRef.current) {
      clearTimeout(enemyStageCooldownRef.current);
      enemyStageCooldownRef.current = null;
    }
    setHiddenRowClues([]);
    setHiddenColClues([]);
    setLockedRowClues([]);
    setLockedColClues([]);
    setFadedCells([]);
    setEnemyFadedCells([]);
    setSpellSpeech({ hero: null, enemy: null });
    setSpellFreeze(false);
    setSpellCinematic(null);
    setActiveSpell(null);
    const speechTimers = speechTimeoutRef.current;
    Object.keys(speechTimers).forEach((side) => {
      if (speechTimers[side]) {
        clearTimeout(speechTimers[side]);
        speechTimers[side] = null;
      }
    });
    if (spellOverlayTimeoutRef.current) {
      clearTimeout(spellOverlayTimeoutRef.current);
      spellOverlayTimeoutRef.current = null;
    }
    if (spellFreezeTimeoutRef.current) {
      clearTimeout(spellFreezeTimeoutRef.current);
      spellFreezeTimeoutRef.current = null;
    }
    if (spellCinematicTimeoutRef.current) {
      clearTimeout(spellCinematicTimeoutRef.current);
      spellCinematicTimeoutRef.current = null;
    }
    if (spellBoardFocusTimeoutRef.current.delay) {
      clearTimeout(spellBoardFocusTimeoutRef.current.delay);
      spellBoardFocusTimeoutRef.current.delay = null;
    }
    if (spellBoardFocusTimeoutRef.current.hide) {
      clearTimeout(spellBoardFocusTimeoutRef.current.hide);
      spellBoardFocusTimeoutRef.current.hide = null;
    }
  }, []);
  function resetProgress() {
    cancelCelebration();
    stopEnemySolver();
    clearSpellEffects();
    resetScore();
    setCleared(new Set());
    setEndingNode(null);
    setPuzzleSequence([]);
    setEnemyPuzzleSequence([]);
    setHeroPuzzleIndex(0);
    enemySolutionRef.current = [];
    setEnemySolutionVersion((v) => v + 1);
    setPlayerWins(0);
    setEnemyWins(0);
    setActiveSpell(null);
    setEnemyGrid([]);
    setPostClearAction(null);
    glyphUnlocksRef.current = new Map();
    setRecentGlyphUnlocks([]);
    setDebugMode(false);
    setDebugRevealMap(false);
    const clearedGlyphSet = new Set();
    const clearedGlyphSolved = new Map();
    setGlyphCollection(clearedGlyphSet);
    setGlyphSolved(clearedGlyphSolved);
    persistGlyphCollection(clearedGlyphSet, clearedGlyphSolved);
  }

  useEffect(() => {
    if (screen !== "picross") return;
    if (paused || spellFreeze) return;
    const id = setInterval(() => {
      setRemaining((r) => {
        const nr = Math.max(0, r - 1);
        if (nr === 0) {
          clearInterval(id);
          handleSubmit();
        }
        return nr;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [screen, paused, spellFreeze, handleSubmit]);

  useEffect(() => {
    try {
      localStorage.setItem("soundOn", soundOn ? "1" : "0");
    } catch {}
  }, [soundOn]);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    displayScoreRef.current = displayScore;
  }, [displayScore]);

  useEffect(() => {
    enemyScoreRef.current = enemyScore;
  }, [enemyScore]);

  useEffect(() => {
    displayEnemyScoreRef.current = displayEnemyScore;
  }, [displayEnemyScore]);

  useEffect(() => {
    try {
      if (score <= 0) {
        localStorage.removeItem("score");
      } else {
        localStorage.setItem("score", String(score));
      }
    } catch {}
  }, [score]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.style.setProperty("--font-scale", String(fontScale));
    }
    try {
      localStorage.setItem("fontScale", String(fontScale));
    } catch {}
  }, [fontScale]);

  const stopEnemyScoreAnimation = useCallback((nextValue) => {
    if (enemyScoreAnimTimerRef.current) {
      clearInterval(enemyScoreAnimTimerRef.current);
      enemyScoreAnimTimerRef.current = null;
    }
    if (typeof audio.stopScoreCount === "function") {
      audio.stopScoreCount();
    }
    setEnemyScoreAnimating(false);
    if (typeof nextValue === "number") {
      setDisplayEnemyScore(nextValue);
    }
  }, []);

  const stopScoreAnimation = useCallback(
    (nextValue) => {
      if (scoreAnimTimerRef.current) {
        clearInterval(scoreAnimTimerRef.current);
        scoreAnimTimerRef.current = null;
      }
      if (typeof audio.stopScoreCount === "function") {
        audio.stopScoreCount();
      }
      setScoreAnimating(false);
      if (typeof nextValue === "number") {
        setDisplayScore(nextValue);
      }
    },
    [],
  );

  const resetScore = useCallback(() => {
    stopScoreAnimation(0);
    scoreRef.current = 0;
    setScore(0);
    setDisplayScore(0);
    stopEnemyScoreAnimation(0);
    enemyScoreRef.current = 0;
    setEnemyScore(0);
    setDisplayEnemyScore(0);
  }, [stopEnemyScoreAnimation, stopScoreAnimation]);

  const addScore = useCallback(
    (amount) => {
      const value = Math.max(0, Math.floor(amount || 0));
      if (value <= 0) {
        return { applied: 0, durationMs: 0 };
      }
      stopScoreAnimation(displayScoreRef.current);
      const target = scoreRef.current + value;
      scoreRef.current = target;
      setScore(target);
      setScoreAnimating(true);
      if (typeof audio.startScoreCount === "function") {
        audio.startScoreCount();
      }
      const from = displayScoreRef.current;
      setDisplayScore(from);
      const duration = Math.min(2400, Math.max(900, value * 4));
      const stepMs = 50;
      const steps = Math.max(1, Math.round(duration / stepMs));
      const durationMs = steps * stepMs;
      let tick = 0;
      scoreAnimTimerRef.current = setInterval(() => {
        tick += 1;
        const progress = Math.min(1, tick / steps);
        const eased = 1 - Math.pow(1 - progress, 3);
        const animated = Math.round(from + (target - from) * eased);
        setDisplayScore(animated);
        if (tick >= steps) {
          stopScoreAnimation(target);
        }
      }, stepMs);
      return { applied: value, durationMs };
    },
    [stopScoreAnimation],
  );

  const addEnemyScore = useCallback(
    (amount) => {
      const value = Math.max(0, Math.floor(amount || 0));
      if (value <= 0) {
        return { applied: 0, durationMs: 0 };
      }
      stopEnemyScoreAnimation(displayEnemyScoreRef.current);
      const target = enemyScoreRef.current + value;
      enemyScoreRef.current = target;
      setEnemyScore(target);
      setEnemyScoreAnimating(true);
      if (typeof audio.startScoreCount === "function") {
        audio.startScoreCount();
      }
      const from = displayEnemyScoreRef.current;
      setDisplayEnemyScore(from);
      const duration = Math.min(2400, Math.max(900, value * 4));
      const stepMs = 50;
      const steps = Math.max(1, Math.round(duration / stepMs));
      const durationMs = steps * stepMs;
      let tick = 0;
      enemyScoreAnimTimerRef.current = setInterval(() => {
        tick += 1;
        const progress = Math.min(1, tick / steps);
        const eased = 1 - Math.pow(1 - progress, 3);
        const animated = Math.round(from + (target - from) * eased);
        setDisplayEnemyScore(animated);
        if (tick >= steps) {
          stopEnemyScoreAnimation(target);
        }
      }, stepMs);
      return { applied: value, durationMs };
    },
    [stopEnemyScoreAnimation],
  );

  const awardScore = useCallback(
    (nodeId, remainingSeconds) => {
      const bonus = SCORE_BONUS[nodeId] ?? 0;
      const seconds = Math.max(0, Math.floor(remainingSeconds || 0));
      const earned = seconds + bonus;
      const { durationMs } = addScore(earned);
      return { earned, durationMs };
    },
    [addScore],
  );

  const awardEnemyScore = useCallback(
    (nodeId, remainingSeconds) => {
      const bonus = SCORE_BONUS[nodeId] ?? 0;
      const seconds = Math.max(0, Math.floor(remainingSeconds || 0));
      const earned = seconds + bonus;
      const { durationMs } = addEnemyScore(earned);
      return { earned, durationMs };
    },
    [addEnemyScore],
  );

  const awardRealtimeBonus = useCallback(
    (r, c) => {
      const key = `${r}:${c}`;
      if (realtimeBonusRef.current.has(key)) return;
      realtimeBonusRef.current.add(key);
      addScore(REALTIME_CORRECT_BONUS);
    },
    [addScore],
  );

  useEffect(() => {
    return () => stopScoreAnimation(scoreRef.current);
  }, [stopScoreAnimation]);

  useEffect(() => {
    return () => stopEnemyScoreAnimation(enemyScoreRef.current);
  }, [stopEnemyScoreAnimation]);

  useEffect(() => cancelCelebration, [cancelCelebration]);

  const chosenTrackRef = useRef(null);
  useEffect(() => {
    if (!soundOn) {
      try {
        bgm.stop();
      } catch {}
      chosenTrackRef.current = null;
      return;
    }

    let track = TRACKS.route;

    switch (screen) {
      case "prologue":
        track = TRACKS.prologue || TRACKS.opening || track;
        break;
      case "opening":
        track = TRACKS.opening || track;
        break;
      case "gamestart":
      case "name":
        track = TRACKS.opening || track;
        break;
      case "conversation":
        track = TRACKS.conversation || track;
        break;
      case "picross":
        track = TRACKS.picross || track;
        break;
      case "tutorial":
        track = TRACKS.tutorial || track;
        break;
      case "picross-clear":
        track = null;
        break;
      case "ending":
        track = TRACKS.ending || track;
        break;
      case "gameover":
        track = TRACKS.route || track;
        break;
      default:
        track = TRACKS.route || track;
    }

    const previousTrack = chosenTrackRef.current;
    let cancelled = false;

    const applyTrack = async () => {
      try {
        const TUTORIAL_FADE_MS = 350;

        if (!track) {
          if (previousTrack === TRACKS.picross) {
            await bgm.fadeOutAndStop(300);
          } else if (previousTrack === TRACKS.ending) {
            await bgm.fadeOutAndStop(400);
          } else if (previousTrack === TRACKS.tutorial) {
            await bgm.fadeOutAndStop(TUTORIAL_FADE_MS);
          } else {
            bgm.stop();
          }
          if (!cancelled) chosenTrackRef.current = null;
          return;
        }

        if (track === previousTrack) {
          bgm.play(track, track);
          if (!cancelled) chosenTrackRef.current = track;
          return;
        }

        if (track === TRACKS.picross) {
          await bgm.crossFadeTo(track, track, {
            fadeOutMs: previousTrack ? 350 : 0,
            fadeInMs: 350,
          });
          if (!cancelled) chosenTrackRef.current = track;
          return;
        }

        if (track === TRACKS.tutorial) {
          await bgm.crossFadeTo(track, track, {
            fadeOutMs: previousTrack ? TUTORIAL_FADE_MS : 0,
            fadeInMs: TUTORIAL_FADE_MS,
          });
          if (!cancelled) chosenTrackRef.current = track;
          return;
        }

        if (track === TRACKS.ending) {
          await bgm.crossFadeTo(track, track, {
            fadeOutMs: previousTrack ? 400 : 0,
            fadeInMs: 400,
          });
          if (!cancelled) chosenTrackRef.current = track;
          return;
        }

        if (previousTrack === TRACKS.picross) {
          await bgm.crossFadeTo(track, track, {
            fadeOutMs: 300,
            fadeInMs: 350,
          });
          if (!cancelled) chosenTrackRef.current = track;
          return;
        }

        if (previousTrack === TRACKS.tutorial) {
          await bgm.crossFadeTo(track, track, {
            fadeOutMs: TUTORIAL_FADE_MS,
            fadeInMs: TUTORIAL_FADE_MS,
          });
          if (!cancelled) chosenTrackRef.current = track;
          return;
        }

        if (previousTrack === TRACKS.ending) {
          await bgm.crossFadeTo(track, track, {
            fadeOutMs: 400,
            fadeInMs: 350,
          });
          if (!cancelled) chosenTrackRef.current = track;
          return;
        }

        bgm.play(track, track);
        if (!cancelled) chosenTrackRef.current = track;
      } catch (err) {
        // Swallow playback errors (e.g., autoplay restrictions)
      }
    };

    applyTrack();

    return () => {
      cancelled = true;
    };
  }, [screen, soundOn]);

  useEffect(() => {
    if (soundOn) bgm.setRate(1);
  }, [screen, soundOn]);

  useEffect(() => {
    if (screen !== "prologue") return;
    if (soundOn) {
      initialPrologueBgmRef.current = true;
      return;
    }
    if (initialPrologueBgmRef.current) return;
    initialPrologueBgmRef.current = true;
    (async () => {
      try {
        await audio.enable();
      } catch {}
      try {
        await bgm.resume();
      } catch {}
    })();
    setSoundOn(true);
  }, [screen, soundOn]);

  useEffect(() => {
    if (screen === "picross-clear" && soundOn) {
      audio.playStageClear();
    }
    return () => {
      audio.stopClearFanfare?.();
    };
  }, [screen, soundOn]);

  useEffect(() => {
    const handler = async () => {
      if (resumeOnceRef.current) return;
      resumeOnceRef.current = true;
      try {
        await audio.enable();
      } catch {}
      try {
        await bgm.resume();
      } catch {}
    };
    window.addEventListener("pointerdown", handler);
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("pointerdown", handler);
      window.removeEventListener("keydown", handler);
    };
  }, []);

  useEffect(() => {
    spedUpRef.current = false;
  }, [remaining, screen]);

  useEffect(() => () => {
    const timers = speechTimeoutRef.current;
    Object.keys(timers).forEach((side) => {
      if (timers[side]) {
        clearTimeout(timers[side]);
        timers[side] = null;
      }
    });
  }, []);

  useEffect(() => () => {
    if (spellFreezeTimeoutRef.current) {
      clearTimeout(spellFreezeTimeoutRef.current);
      spellFreezeTimeoutRef.current = null;
    }
    if (spellCinematicTimeoutRef.current) {
      clearTimeout(spellCinematicTimeoutRef.current);
      spellCinematicTimeoutRef.current = null;
    }
    if (spellBoardFocusTimeoutRef.current.delay) {
      clearTimeout(spellBoardFocusTimeoutRef.current.delay);
      spellBoardFocusTimeoutRef.current.delay = null;
    }
    if (spellBoardFocusTimeoutRef.current.hide) {
      clearTimeout(spellBoardFocusTimeoutRef.current.hide);
      spellBoardFocusTimeoutRef.current.hide = null;
    }
  }, []);

  function beginPicrossForNode(nodeId) {
    const normalizedId = normalizeNodeId(nodeId);
    const meta = CHARACTERS[normalizedId];
    if (!meta) return;
    const n = meta.size;

    stopEnemySolver();
    clearSpellEffects();
    setActiveSpell(null);
    puzzleSolvedRef.current = false;
    setProjectiles([]);
    resetAllCombos();
    glyphUnlocksRef.current = new Map();
    setRecentGlyphUnlocks([]);

    const puzzleGoal = getPuzzleGoalForNode(normalizedId);
    const generation = generateBattlePuzzles(normalizedId, n, puzzleGoal, {
      enforceAnchorHints: normalizedId === "elf-middle",
      requireUniqueSolution: normalizedId === "elf-middle",
    });
    if (import.meta?.env?.DEV && generation?.seed !== undefined) {
      console.debug("[picross] generated puzzles", {
        node: normalizedId,
        seed: generation.seed,
      });
    }
    const heroSourceEntries = generation?.heroPuzzles?.length
      ? generation.heroPuzzles
      : Array.from({ length: puzzleGoal }, () => {
          const fallback = createFallbackSolution(n);
          return { grid: cloneSolution(fallback), glyphMeta: null };
        });
    const prepared = heroSourceEntries.map((entry) => ({
      grid: cloneSolution(entry.grid),
      glyphMeta: entry.glyphMeta ? { ...entry.glyphMeta } : null,
    }));
    const enemySourceEntries = generation?.enemyPuzzles?.length
      ? generation.enemyPuzzles.map((grid) => ({ grid: cloneSolution(grid) }))
      : shuffle(heroSourceEntries).map((entry) => ({ grid: cloneSolution(entry.grid) }));
    const enemyPrepared = enemySourceEntries.map((entry) => cloneSolution(entry.grid));

    const firstEntry =
      prepared[0] || { grid: cloneSolution(createFallbackSolution(n)), glyphMeta: null };
    const firstSolution = firstEntry.grid;
    const enemyFirstSolution =
      enemyPrepared[0] || cloneSolution(createFallbackSolution(n));
    const boardSize = firstSolution.length;

    setLevel(meta.difficulty || deriveDifficultyFromSize(n));
    setPuzzleSequence(prepared);
    setEnemyPuzzleSequence(enemyPrepared);
    setHeroPuzzleIndex(0);
    const heroSolution = firstSolution.map((row) => row.slice());
    setSolution(heroSolution);
    setGrid(emptyGrid(boardSize));
    realtimeBonusRef.current = new Set();
    stopEnemyScoreAnimation(0);
    enemyScoreRef.current = 0;
    setEnemyScore(0);
    setDisplayEnemyScore(0);
    setEnemyScoreAnimating(false);

    const total = heroSolution.reduce((acc, row) => acc + row.filter(Boolean).length, 0);
    totalCellsRef.current = total;
    heroStateRef.current = {
      lastCorrect: null,
      crossStreak: 0,
      blockChain: { type: null, index: null, length: 1 },
      noMistakeStart: Date.now(),
      noMistakeTriggered: false,
    };
    const enemySolution = enemyFirstSolution.map((row) => row.slice());
    enemySolutionRef.current = enemySolution;
    enemyProgressRef.current = {
      filled: 0,
      total: enemySolution.reduce((acc, row) => acc + row.filter(Boolean).length, 0),
    };
    enemyOrderRef.current = { list: [], index: 0 };
    setEnemyGrid(emptyGrid(enemySolution.length));
    setEnemySolutionVersion((v) => v + 1);
    setPlayerWins(0);
    setEnemyWins(0);

    setEndingNode(null);
    setStartedAt(Date.now());
    setRemaining(GAME_SECONDS);
    setBattleNode(normalizedId);
    setPaused(false);
    setScreen("picross");
    spedUpRef.current = false;
    setBgSeed((s) => s + 1);
    try {
      bgm.resume();
    } catch {}
  }

  const loadHeroPuzzle = useCallback(
    (index) => {
      if (!puzzleSequence.length) return;
      const safeIndex = Math.min(index, puzzleSequence.length - 1);
      const next = puzzleSequence[safeIndex];
      if (!next?.grid) return;
      const nextSolution = cloneSolution(next.grid);
      const n = nextSolution.length;
      clearSpellEffects();
      puzzleSolvedRef.current = false;
      setProjectiles([]);
      resetAllCombos();
      setHeroPuzzleIndex(safeIndex);
      setSolution(nextSolution);
      setGrid(emptyGrid(n));
      realtimeBonusRef.current = new Set();
      const total = nextSolution.reduce((acc, row) => acc + row.filter(Boolean).length, 0);
      totalCellsRef.current = total;
      heroStateRef.current = {
        lastCorrect: null,
        crossStreak: 0,
        blockChain: { type: null, index: null, length: 1 },
        noMistakeStart: Date.now(),
        noMistakeTriggered: false,
      };
      setStartedAt(Date.now());
      setRemaining(GAME_SECONDS);
      setBgSeed((s) => s + 1);
      spedUpRef.current = false;
    },
    [puzzleSequence, clearSpellEffects, resetAllCombos],
  );

  const loadEnemyPuzzle = useCallback(
    (index) => {
      if (!enemyPuzzleSequence.length) return;
      const safeIndex = Math.min(index, enemyPuzzleSequence.length - 1);
      const next = enemyPuzzleSequence[safeIndex];
      if (!next) return;
      const nextSolution = cloneSolution(next);
      const n = nextSolution.length;
      stopEnemySolver();
      enemySolutionRef.current = nextSolution;
      enemyProgressRef.current = {
        filled: 0,
        total: nextSolution.reduce((acc, row) => acc + row.filter(Boolean).length, 0),
      };
      enemyOrderRef.current = { list: [], index: 0 };
      setEnemyGrid(emptyGrid(n));
      setEnemySolutionVersion((v) => v + 1);
      resetAllCombos();
    },
    [enemyPuzzleSequence, resetAllCombos, stopEnemySolver],
  );

  function enterEnding(nodeId) {
    setPendingNode(null);
    setBattleNode(null);
    setPaused(false);
    const normalizedCurrent = normalizeNodeId(currentNode);
    const normalizedTarget = normalizeNodeId(nodeId);
    const destination =
      normalizedTarget && ROUTE.nodes[normalizedTarget]
        ? normalizedTarget
        : normalizedCurrent;
    setLastNode(normalizedCurrent);
    setCurrentNode(destination);
    localStorage.setItem("routeNode", destination);
    if (FINAL_NODE_IDS.has(destination)) {
      setEndingNode(destination);
    } else {
      setEndingNode(null);
    }
    setScreen("ending");
  }

  const handleDebugJumpToRoute = (nodeId) => {
    closeDebugMenu();
    const normalized = normalizeNodeId(nodeId);
    const updatedCleared = new Set(cleared);
    if (normalized === "start") {
      updatedCleared.add("start");
    } else {
      let cursor = normalized;
      while (cursor && cursor !== "start") {
        updatedCleared.add(cursor);
        cursor = ROUTE.parents?.[cursor];
      }
      if (cursor === "start") {
        updatedCleared.add("start");
      }
    }
    setCleared(updatedCleared);
    try {
      localStorage.setItem("clearedNodes", JSON.stringify(Array.from(updatedCleared)));
    } catch {}
    const parent = ROUTE.parents?.[normalized] ?? "start";
    setLastNode(parent);
    setCurrentNode(normalized);
    try {
      localStorage.setItem("routeNode", normalized);
    } catch {}
    stopEnemySolver();
    clearSpellEffects();
    resetAllCombos();
    resetScore();
    setActiveSpell(null);
    setProjectiles([]);
    glyphUnlocksRef.current = new Map();
    setRecentGlyphUnlocks([]);
    setPendingNode(null);
    setBattleNode(null);
    setPostClearAction(null);
    setConversationTransition("none");
    setEndingNode(null);
    setPaused(false);
    setScreen("route");
  };

  const handleDebugJumpToConversation = (nodeId) => {
    closeDebugMenu();
    const normalized = normalizeNodeId(nodeId);
    if (!CHARACTERS[normalized]) return;
    stopEnemySolver();
    clearSpellEffects();
    resetAllCombos();
    setActiveSpell(null);
    setProjectiles([]);
    setBattleNode(null);
    setPostClearAction(null);
    setConversationTransition("encounter");
    setPendingNode(normalized);
    setPaused(false);
    setScreen("conversation");
  };

  const handleDebugJumpToPicross = (nodeId) => {
    closeDebugMenu();
    beginPicrossForNode(nodeId);
  };

  const handleDebugShowVictory = (nodeId) => {
    closeDebugMenu();
    const normalized = normalizeNodeId(nodeId);
    stopEnemySolver();
    clearSpellEffects();
    resetAllCombos();
    resetScore();
    setActiveSpell(null);
    setProjectiles([]);
    glyphUnlocksRef.current = new Map();
    setRecentGlyphUnlocks([]);
    setBattleNode(null);
    setPendingNode(null);
    const victoryCleared = new Set(cleared);
    if (normalized === "start") {
      victoryCleared.add("start");
    } else {
      let cursor = normalized;
      while (cursor && cursor !== "start") {
        victoryCleared.add(cursor);
        cursor = ROUTE.parents?.[cursor];
      }
      if (cursor === "start") {
        victoryCleared.add("start");
      }
    }
    setCleared(victoryCleared);
    try {
      localStorage.setItem("clearedNodes", JSON.stringify(Array.from(victoryCleared)));
    } catch {}
    setPostClearAction({ type: "route", node: normalized });
    setLastNode(ROUTE.parents?.[normalized] ?? "start");
    setCurrentNode(normalized);
    try {
      localStorage.setItem("routeNode", normalized);
    } catch {}
    setEnemyWins(0);
    setPlayerWins(0);
    setPaused(false);
    setScreen("picross-clear");
  };

  const handleDebugJumpToEnding = (nodeId) => {
    closeDebugMenu();
    enterEnding(nodeId);
  };

  function handleEndingComplete() {
    cancelCelebration();
    resetScore();
    setPendingNode(null);
    setBattleNode(null);
    setLastNode("");
    setCurrentNode("start");
    setScreen("opening");
    setCleared(new Set());
    setEndingNode(null);
    localStorage.setItem("routeNode", "start");
    localStorage.removeItem("clearedNodes");
  }

  const completePuzzle = useCallback(() => {
    if (puzzleSolvedRef.current) return;
    puzzleSolvedRef.current = true;
    stopEnemySolver();
    cancelCelebration();
    resetAllCombos();
    const currentEntry = puzzleSequence[heroPuzzleIndex];
    const collectionIndex = currentEntry?.glyphMeta?.collectionIndex;
    if (Number.isFinite(collectionIndex)) {
      glyphUnlocksRef.current.set(
        collectionIndex,
        cloneSolution(solution.length ? solution : grid),
      );
    }
    awardScore(battleNode, remaining);
    const totalNeeded =
      puzzleSequence.length || enemyPuzzleSequence.length || getPuzzleGoalForNode(battleNode);
    const nextIndex = heroPuzzleIndex + 1;
    const nextWins = playerWins + 1;
    const isFinal = nextWins >= totalNeeded;
    setPlayerWins(nextWins);
    if (isFinal) {
      handleCloseResult(true);
    } else {
      setTimeout(() => {
        loadHeroPuzzle(nextIndex);
      }, 0);
    }
  }, [
    awardScore,
    battleNode,
    cancelCelebration,
    handleCloseResult,
    heroPuzzleIndex,
    loadHeroPuzzle,
    playerWins,
    puzzleSequence.length,
    enemyPuzzleSequence.length,
    remaining,
    resetAllCombos,
    stopEnemySolver,
  ]);

  const maybeCompletePuzzle = useCallback(
    (candidateGrid) => {
      if (puzzleSolvedRef.current) return;
      if (screen !== "picross") return;
      if (!solution.length) return;
      const targetGrid = candidateGrid || grid;
      if (!targetGrid?.length) return;
      if (equalsSolution(targetGrid, solution)) {
        completePuzzle();
      }
    },
    [completePuzzle, grid, screen, solution],
  );

  const moveGamepadCursor = useCallback(
    (dx, dy) => {
      if (screen !== "picross") return;
      if (!solution.length) return;
      setGamepadCursor((prev) => {
        const max = solution.length - 1;
        const nextRow = clamp(prev.row + dy, 0, max);
        const nextCol = clamp(prev.col + dx, 0, max);
        if (nextRow === prev.row && nextCol === prev.col) return prev;
        return { row: nextRow, col: nextCol };
      });
    },
    [screen, solution.length],
  );

  function handleSubmit() {
    if (puzzleSolvedRef.current) return;
    if (debugMode) {
      completePuzzle();
      return;
    }

    if (equalsSolution(grid, solution)) {
      completePuzzle();
    } else {
      cancelCelebration();
      stopEnemySolver();
      clearSpellEffects();
      resetScore();
      setScreen("gameover");
    }
  }

  function handleCloseResult(playerVictory = false) {
    cancelCelebration();
    stopEnemySolver();
    clearSpellEffects();
    resetAllCombos();
    setActiveSpell(null);
    setPuzzleSequence([]);
    setEnemyPuzzleSequence([]);
    setHeroPuzzleIndex(0);
    enemySolutionRef.current = [];
    setEnemySolutionVersion((v) => v + 1);
    setSolution([]);
    setEnemyGrid([]);
    setPaused(false);
    puzzleSolvedRef.current = false;
    setProjectiles([]);
    if (!playerVictory) {
      glyphUnlocksRef.current = new Map();
      setRecentGlyphUnlocks([]);
      return;
    }
    const unlockEntries = Array.from(glyphUnlocksRef.current.entries()).filter(([index]) =>
      Number.isFinite(index),
    );
    unlockEntries.sort((a, b) => a[0] - b[0]);
    let nextCollectionRef = null;
    setGlyphCollection((prev) => {
      const next = new Set(prev);
      unlockEntries.forEach(([index]) => {
        next.add(index);
      });
      nextCollectionRef = next;
      return next;
    });
    let nextSolvedRef = null;
    setGlyphSolved((prev) => {
      const next = new Map(prev);
      unlockEntries.forEach(([index, grid]) => {
        next.set(index, cloneSolution(grid));
      });
      nextSolvedRef = next;
      return next;
    });
    persistGlyphCollection(nextCollectionRef ?? glyphCollection, nextSolvedRef ?? glyphSolved);
    const unlockDetails = unlockEntries
      .map(([index]) => {
        const meta = GLYPH_COLLECTION.find((entry) => entry.collectionIndex === index);
        if (!meta) return null;
        return {
          ...meta,
          solvedGrid: (nextSolvedRef ?? glyphSolved).get(index) || null,
        };
      })
      .filter(Boolean);
    setRecentGlyphUnlocks(unlockDetails);
    // 勝利ファンファーレを際立たせるため、アンロック専用SEは再生しない
    glyphUnlocksRef.current = new Map();
    let nextAction = null;
    if (pendingNode) {
      const clearedNode = normalizeNodeId(pendingNode);
      setCleared((prev) => {
        const next = new Set(prev);
        next.add(clearedNode);
        localStorage.setItem("clearedNodes", JSON.stringify(Array.from(next)));
        return next;
      });
      const isFinal = FINAL_NODE_IDS.has(clearedNode);
      if (isFinal) {
        nextAction = { type: "ending", node: clearedNode };
        setEndingNode(clearedNode);
      } else {
        nextAction = { type: "route", node: clearedNode };
        setEndingNode(null);
      }
      setLastNode(currentNode);
      setCurrentNode(clearedNode);
      localStorage.setItem("routeNode", clearedNode);
      setPendingNode(null);
    }
    if (!nextAction) {
      setEndingNode(null);
    }
    setPlayerWins(0);
    setEnemyWins(0);
    setBattleNode(null);
    setPostClearAction(nextAction || { type: "route", node: currentNode });
    setScreen("picross-clear");
  }

  function handlePicrossClearContinue() {
    audio.stopClearFanfare?.();
    const action = postClearAction;
    setPostClearAction(null);
    if (!action) {
      setEndingNode(null);
      setScreen("route");
      return;
    }
    if (action.type === "ending") {
      enterEnding(action.node);
      return;
    }
    setEndingNode(null);
    setScreen("route");
  }

  const handleEnemyPuzzleClear = useCallback(() => {
    const totalNeeded =
      enemyPuzzleSequence.length || puzzleSequence.length || getPuzzleGoalForNode(battleNode);
    const nextWins = enemyWins + 1;
    const character = battleNode ? CHARACTERS[battleNode] : null;
    const enemyName = character?.name || "敵";
    stopEnemySolver();
    resetAllCombos();
    const isFinal = nextWins >= totalNeeded;
    awardEnemyScore(battleNode, remaining);
    if (isFinal) {
      setEnemyWins(nextWins);
      showSpellOverlay({
        caster: "enemy",
        name: "Victory",
        description: `${enemyName} が勝利しました`,
        image: character?.images?.angry,
      });
      cancelCelebration();
      clearSpellEffects();
      resetScore();
      setActiveSpell(null);
      setProjectiles([]);
      setPuzzleSequence([]);
      setEnemyPuzzleSequence([]);
      setHeroPuzzleIndex(0);
     enemySolutionRef.current = [];
     setEnemySolutionVersion((v) => v + 1);
     puzzleSolvedRef.current = false;
     setPaused(false);
      glyphUnlocksRef.current = new Map();
      setRecentGlyphUnlocks([]);
      setScreen("enemy-victory");
      return;
    } else {
      setEnemyWins(nextWins);
      setTimeout(() => {
        loadEnemyPuzzle(nextWins);
      }, 0);
    }
  }, [
    awardEnemyScore,
    battleNode,
    cancelCelebration,
    clearSpellEffects,
    enemyWins,
    enemyPuzzleSequence.length,
    loadEnemyPuzzle,
    remaining,
    resetAllCombos,
    resetScore,
    setActiveSpell,
    setEnemyPuzzleSequence,
    setPaused,
    setProjectiles,
    showSpellOverlay,
    stopEnemySolver,
  ]);

  const handleHeroCorrectFill = useCallback(
    (row, col) => {
      const heroState = heroStateRef.current;
      heroState.crossStreak = 0;
      heroState.lastCorrect = { r: row, c: col };
      heroState.blockChain = { type: null, index: null, length: 1 };
      incrementCombo("hero");
    },
    [incrementCombo],
  );

  const handleHeroMistake = useCallback(() => {
    const heroState = heroStateRef.current;
    heroState.lastCorrect = null;
    heroState.crossStreak = 0;
    heroState.blockChain = { type: null, index: null, length: 1 };
    heroState.noMistakeStart = Date.now();
    heroState.noMistakeTriggered = false;
    resetCombo("hero");
  }, [resetCombo]);

  const handleHeroCross = useCallback(
    (row, col, nextGrid) => {
      const heroState = heroStateRef.current;
      heroState.lastCorrect = null;
      heroState.blockChain = { type: null, index: null, length: 1 };
      const cellValue = nextGrid?.[row]?.[col];
      const shouldFill = solution?.[row]?.[col] ?? false;
      if (cellValue === -1 && !shouldFill) {
        incrementCombo("hero");
      } else if (cellValue === -1 && shouldFill) {
        resetCombo("hero");
      }
    },
    [incrementCombo, resetCombo, solution],
  );

  const handlePlayerCorrect = useCallback(
    (row, col, nextGrid) => {
      awardRealtimeBonus(row, col);
      handleHeroCorrectFill(row, col, nextGrid);
    },
    [awardRealtimeBonus, handleHeroCorrectFill],
  );

  const handlePlayerMistakeEvent = useCallback(
    (row, col, meta, nextGrid) => {
      handleHeroMistake(row, col, meta, nextGrid);
    },
    [handleHeroMistake],
  );

  const handlePlayerCrossEvent = useCallback(
    (row, col, nextGrid) => {
      handleHeroCross(row, col, nextGrid);
    },
    [handleHeroCross],
  );

  const handlePicrossCellAction = useCallback(
    (mode) => {
      if (screen !== "picross") return;
      if (!solution.length) return;
      const { row, col } = gamepadCursorRef.current;
      if (
        row == null ||
        col == null ||
        row < 0 ||
        col < 0 ||
        row >= solution.length ||
        col >= solution.length
      ) {
        return;
      }

      if (mode === "clear") {
        setGrid((prev) => {
          const previous = prev[row]?.[col];
          if (previous == null || previous === 0) return prev;
          const next = prev.map((line) => line.slice());
          next[row][col] = 0;
          const shouldFill = solution[row]?.[col] ?? false;
          if (shouldFill && previous === 1) {
            handlePlayerMistakeEvent(row, col, { type: "unfill" }, next);
          }
          maybeCompletePuzzle(next);
          return next;
        });
        return;
      }

      setGrid((prev) => {
        const previous = prev[row]?.[col];
        if (previous == null) return prev;
        const next = toggleCell(prev, row, col, mode);
        const currentValue = next[row]?.[col];
        const shouldFill = solution[row]?.[col] ?? false;

        if (mode === "fill") {
          if (previous !== 1 && currentValue === 1) {
            if (shouldFill) {
              handlePlayerCorrect(row, col, next);
            } else {
              handlePlayerMistakeEvent(row, col, { type: "fill" }, next);
            }
          }
          if (previous === 1 && currentValue !== 1 && shouldFill) {
            handlePlayerMistakeEvent(row, col, { type: "unfill" }, next);
          }
          audio.playFill();
        } else if (mode === "cross") {
          if (currentValue === -1 && shouldFill) {
            handlePlayerMistakeEvent(row, col, { type: "cross" }, next);
          }
          audio.playMark();
        } else if (mode === "maybe") {
          audio.playMark();
        }

        maybeCompletePuzzle(next);
        return next;
      });
    },
    [handlePlayerCorrect, handlePlayerMistakeEvent, maybeCompletePuzzle, screen, solution.length, solution],
  );

  const handlePicrossReset = useCallback(() => {
    if (screen !== "picross") return;
    if (!solution.length) return;
    const fresh = emptyGrid(solution.length);
    setGrid(fresh);
    resetAllCombos();
    maybeCompletePuzzle(fresh);
  }, [maybeCompletePuzzle, resetAllCombos, screen, solution.length]);

  const togglePaused = useCallback(() => {
    setPaused((prev) => {
      const next = !prev;
      if (next) {
        stopEnemySolver();
        resetAllCombos();
      } else {
        heroStateRef.current.noMistakeStart = Date.now();
        heroStateRef.current.noMistakeTriggered = false;
      }
      return next;
    });
  }, [resetAllCombos, stopEnemySolver]);

  useEffect(() => {
    if (!paused) return;
    stopEnemySolver();
  }, [paused, stopEnemySolver]);

  const quitToOpening = useCallback(() => {
    cancelCelebration();
    stopEnemySolver();
    clearSpellEffects();
    resetScore();
    setPuzzleSequence([]);
    setEnemyPuzzleSequence([]);
    setHeroPuzzleIndex(0);
    enemySolutionRef.current = [];
    setEnemySolutionVersion((v) => v + 1);
    setPendingNode(null);
    setBattleNode(null);
    setPlayerWins(0);
    setEnemyWins(0);
    setPaused(false);
    setProjectiles([]);
    setPostClearAction(null);
    setRemaining(GAME_SECONDS);
    if (!soundOn) {
      (async () => {
        try {
          await audio.enable();
        } catch {}
        try {
          await bgm.resume();
        } catch {}
      })();
      setSoundOn(true);
    } else {
      (async () => {
        try {
          await bgm.resume();
        } catch {}
      })();
    }
    setScreen("opening");
  }, [cancelCelebration, clearSpellEffects, resetScore, setSoundOn, soundOn, stopEnemySolver]);

  const handleQuitPicross = useCallback(() => {
    quitToOpening();
  }, [quitToOpening]);

  useEffect(() => {
    setBgSeed((s) => s + 1);
  }, [screen]);

  useEffect(() => {
    comboStateRef.current = comboState;
  }, [comboState]);

  useEffect(() => {
    boardLocksRef.current = boardLocks;
  }, [boardLocks]);

  const enemyReadyStages = comboState.enemy?.readyStages || [];

  useEffect(() => {
    if (screen !== "picross") {
      resetAllCombos();
    }
  }, [screen, resetAllCombos]);

  useEffect(() => {
    if (screen !== "picross") return undefined;
    if (!enemyReadyStages.length) return undefined;
    const ordered = enemyReadyStages
      .slice()
      .sort((a, b) => getStageThreshold(b) - getStageThreshold(a));
    const stageId = ordered[0];
    if (!stageId) return undefined;
    if (enemyCastingRef.current) return undefined;
    enemyCastingRef.current = true;
    if (enemyStageCooldownRef.current) {
      clearTimeout(enemyStageCooldownRef.current);
    }
    enemyStageCooldownRef.current = setTimeout(() => {
      const latestStages = comboStateRef.current.enemy?.readyStages || [];
      if (!latestStages.includes(stageId)) {
        enemyCastingRef.current = false;
        enemyStageCooldownRef.current = null;
        return;
      }
      triggerComboStage("enemy", stageId);
      enemyCastingRef.current = false;
      enemyStageCooldownRef.current = null;
    }, 600);
    return () => {
      if (enemyStageCooldownRef.current) {
        clearTimeout(enemyStageCooldownRef.current);
        enemyStageCooldownRef.current = null;
      }
      enemyCastingRef.current = false;
    };
  }, [enemyReadyStages, screen, triggerComboStage]);

  const prevScreenRef = useRef(screen);
  useEffect(() => {
    const prev = prevScreenRef.current;
    if (prev === "picross" && screen !== "picross") {
      stopEnemySolver();
      clearSpellEffects();
      setActiveSpell(null);
      setEnemyGrid([]);
      setPuzzleSequence([]);
      setEnemyPuzzleSequence([]);
      setHeroPuzzleIndex(0);
      enemySolutionRef.current = [];
      setEnemySolutionVersion((v) => v + 1);
      setPlayerWins(0);
      setEnemyWins(0);
    }
    prevScreenRef.current = screen;
  }, [screen, stopEnemySolver, clearSpellEffects]);

  useEffect(() => {
    if (screen !== "picross") return;
    if (!battleNode) return;
    const enemySolution = enemySolutionRef.current;
    if (!enemySolution.length) return;
    if (paused || spellFreeze) {
      stopEnemySolver();
      return;
    }
    const config = ENEMY_AI_CONFIG[battleNode] || DEFAULT_ENEMY_CONFIG;
    const coords = [];
    enemySolution.forEach((row, r) =>
      row.forEach((cell, c) => {
        if (cell) coords.push({ r, c });
      }),
    );
    const alreadyInitialized =
      enemyProgressRef.current.total === coords.length && enemyOrderRef.current.list.length;
    if (!alreadyInitialized) {
      enemyOrderRef.current = { list: shuffle(coords), index: 0 };
      enemyProgressRef.current = {
        filled: 0,
        total: coords.length,
      };
      setEnemyGrid(emptyGrid(enemySolution.length));
    }
    stopEnemySolver();

    const nextDelay = () => {
      if (config.intervalRange && Array.isArray(config.intervalRange)) {
        const [min, max] = config.intervalRange;
        return Math.max(120, min + Math.random() * Math.max(0, max - min));
      }
      return Math.max(120, config.interval || 1000);
    };

    const tick = () => {
      if (boardLocksRef.current.enemy) {
        enemySolverRef.current = setTimeout(tick, nextDelay());
        return;
      }
      const totalNeeded = puzzleSequence.length || getPuzzleGoalForNode(battleNode);
      if (playerWins >= totalNeeded || enemyWins >= totalNeeded) {
        stopEnemySolver();
        return;
      }
      const state = enemyOrderRef.current;
      if (!state.list.length || state.index >= state.list.length) {
        const remainingCoords = [];
        const currentGrid = enemyGrid;
        enemySolution.forEach((row, r) =>
          row.forEach((cell, c) => {
            if (cell && currentGrid?.[r]?.[c] !== 1) {
              remainingCoords.push({ r, c });
            }
          }),
        );
        if (remainingCoords.length) {
          enemyOrderRef.current = { list: shuffle(remainingCoords), index: 0 };
          enemySolverRef.current = setTimeout(tick, nextDelay());
          return;
        }
        // filled enough? allow early finish for lowered difficulty
        const targetRatio = config.targetCompletionRatio || 1;
        const progressRatio =
          enemyProgressRef.current.total > 0
            ? enemyProgressRef.current.filled / enemyProgressRef.current.total
            : 1;
        if (progressRatio >= targetRatio) {
          stopEnemySolver();
          handleEnemyPuzzleClear();
        } else {
          enemySolverRef.current = setTimeout(tick, nextDelay());
        }
        return;
      }
      const target = state.list[state.index];
      const successRate = config.successRate ?? 1;
      if (Math.random() > successRate) {
        enemySolverRef.current = setTimeout(tick, nextDelay());
        return;
      }
      if (Math.random() < (config.errorRate || 0)) {
        state.index += 1;
        enemySolverRef.current = setTimeout(tick, nextDelay());
        return;
      }
      const { r, c } = target;
      let placed = false;
      setEnemyGrid((prev) => {
        if (prev[r]?.[c] === 1) return prev;
        const next = prev.length ? prev.map((row) => row.slice()) : emptyGrid(enemySolution.length);
        next[r][c] = 1;
        placed = true;
        return next;
      });
      if (placed) {
        incrementCombo("enemy");
      }
      state.index += 1;
      enemyProgressRef.current.filled += 1;
      const targetRatio = config.targetCompletionRatio || 1;
      const progressRatio =
        enemyProgressRef.current.total > 0
          ? enemyProgressRef.current.filled / enemyProgressRef.current.total
          : 1;
      if (progressRatio >= targetRatio) {
        stopEnemySolver();
        handleEnemyPuzzleClear();
        return;
      }
      enemySolverRef.current = setTimeout(tick, nextDelay());
    };

    enemySolverRef.current = setTimeout(tick, nextDelay());
    return () => clearTimeout(enemySolverRef.current);
  }, [
    screen,
    battleNode,
    enemySolutionVersion,
    playerWins,
    enemyWins,
    puzzleSequence.length,
    paused,
    spellFreeze,
    stopEnemySolver,
    handleEnemyPuzzleClear,
    incrementCombo,
  ]);


  useEffect(() => {
    if (!paused && screen === "picross") {
      heroStateRef.current.noMistakeStart = Date.now();
      heroStateRef.current.noMistakeTriggered = false;
    }
  }, [paused, screen]);

  useEffect(() => {
    if (screen === "picross") return;
    setSpellSpeech({ hero: null, enemy: null });
    const timers = speechTimeoutRef.current;
    Object.keys(timers).forEach((side) => {
      if (timers[side]) {
        clearTimeout(timers[side]);
        timers[side] = null;
      }
    });
  }, [screen]);

  useEffect(() => {
    if (screen !== "gamestart") {
      setGameStartNameVisible(false);
      setGameStartPhase("before");
    }
  }, [screen]);

  const handleGameStartPhase = useCallback((phase) => {
    setGameStartPhase(phase);
  }, []);

  useEffect(() => {
    if (screen === "opening") {
      setOpeningFocus(0);
    }
  }, [screen]);

  const conversationBackground = useMemo(() => {
    if (screen !== "conversation") return null;
    if (!pendingNode) return null;
    const enemy = CHARACTERS[pendingNode];
    if (!enemy?.images) return null;
    return enemy.images.fullbody || enemy.images.normal || null;
  }, [pendingNode, screen]);

  const battleBackground = useMemo(() => {
    if (screen !== "picross") return null;
    if (!battleNode) return null;
    const enemy = CHARACTERS[battleNode];
    if (!enemy?.images) return null;
    return enemy.images.fullbody || enemy.images.normal || null;
  }, [battleNode, screen]);

  const handleOpeningContinue = useCallback(async () => {
    try {
      await bgm.resume();
    } catch {}
    setScreen("gamestart");
  }, []);

  const handleOpeningNewGame = useCallback(async () => {
    resetProgress();
    updateHeroName(DEFAULT_HERO_NAME);
    localStorage.removeItem("routeNode");
    localStorage.removeItem("clearedNodes");
    setCurrentNode("start");
    setLastNode("");
    setPendingNode(null);
    setBattleNode(null);
    if (!soundOn) {
      try {
        await audio.enable();
      } catch {}
    }
    setSoundOn(true);
    try {
      await bgm.resume();
    } catch {}
    setScreen("gamestart");
  }, [resetProgress, soundOn, updateHeroName]);

  const handleOpeningEndless = useCallback(async () => {
    try {
      await bgm.resume();
    } catch {}
    setScreen("endless-select"); // TODO: implement endless flow
  }, []);

  const handleOpeningTutorial = useCallback(async () => {
    let proceed = true;
    if (tutorialCompleted) {
      proceed = window.confirm("チュートリアルを再度開始しますか？進捗はリセットされます。");
    }
    if (!proceed) return;
    try {
      await bgm.resume();
    } catch {}
    setScreen("tutorial");
  }, [tutorialCompleted]);

  const resetEndlessState = useCallback(() => {
    setEndlessSize(null);
    setEndlessQueue([]);
    setEndlessGrid([]);
    setEndlessSolution([]);
    setEndlessClues({ rows: [], cols: [] });
    setEndlessSolvedCount(0);
    endlessSolutionRef.current = [];
    endlessCurrentRef.current = null;
    endlessSeenRef.current = new Set();
    setEndlessError(null);
    setEndlessLoading(false);
  }, []);

  const generateEndlessBatch = useCallback(
    async (n, count = ENDLESS_REFILL_BATCH) => {
      const nodeId = n <= 5 ? "elf-easy" : "elf-hard";
      const seen = endlessSeenRef.current || new Set();
      const results = [];
      const maxAttempts = Math.max(count * 15, 60);
      let attempts = 0;

      const tryPush = (grid, glyphMeta = null) => {
        const hash = hashGrid(grid);
        if (seen.has(hash)) return false;
        seen.add(hash);
        results.push({ grid: cloneSolution(grid), glyphMeta });
        return true;
      };

      while (results.length < count && attempts < maxAttempts) {
        attempts += 1;
        const batchCount = Math.max(5, Math.min(20, (count - results.length) * 3));
        const generation = generateBattlePuzzles(nodeId, n, batchCount, {
          requireUniqueSolution: true,
          enforceAnchorHints: true,
        });
        const entries = generation?.heroPuzzles?.length ? generation.heroPuzzles : [];
        entries.forEach((entry) => {
          if (results.length >= count) return;
          if (!hasAnchorLine(entry.grid)) return;
          tryPush(entry.grid, entry.glyphMeta);
        });
        if (attempts % 2 === 0) {
          await deferTick();
        }
        if (results.length >= count) break;
        // fallback random anchored grids to reach the quota
        const randomGrid = makeRandomAnchoredGrid(n, attempts + Date.now());
        tryPush(randomGrid, null);
      }

      let fallbackIdx = 0;
      while (results.length < count && fallbackIdx < maxAttempts) {
        const variant = makeRandomAnchoredGrid(n, fallbackIdx + Date.now());
        fallbackIdx += 1;
        tryPush(variant, null);
        if (fallbackIdx % 3 === 0) {
          await deferTick();
        }
      }

      // 最終手段：まだ足りなければ重複許容で埋める
      while (results.length < count) {
        const variant = makeRandomAnchoredGrid(n, fallbackIdx + Date.now());
        fallbackIdx += 1;
        results.push({ grid: variant, glyphMeta: null });
        if (fallbackIdx % 3 === 0) {
          await deferTick();
        }
      }

      return results;
    },
    [],
  );

  const startEndlessMode = useCallback(
    async (n) => {
      resetEndlessState();
      setEndlessSize(n);
      setEndlessLoading(true);
      setScreen("endless");
      try {
        if (!soundOn) {
          try {
            await audio.enable();
          } catch {}
          setSoundOn(true);
        }
        await bgm.resume();
      } catch {}
      try {
        const batch = await generateEndlessBatch(n, ENDLESS_INITIAL_BATCH);
        setEndlessQueue(batch);
        setEndlessError(null);
      } catch (err) {
        console.error(err);
        setEndlessError("お題生成に失敗しました。再試行してください。");
      } finally {
        setEndlessLoading(false);
      }
    },
    [generateEndlessBatch, resetEndlessState, soundOn],
  );

  const advanceEndless = useCallback(() => {
    setEndlessQueue((prev) => {
      const next = prev.slice(1);
      // 非同期で補充を仕掛ける（UIブロックを避ける）
      if (next.length < Math.max(5, Math.ceil(ENDLESS_REFILL_BATCH * ENDLESS_REFILL_RATIO) + 1)) {
        setTimeout(() => {
          (async () => {
            const batch = await generateEndlessBatch(endlessSize || 5, ENDLESS_REFILL_BATCH);
            setEndlessQueue((current) => [...current, ...batch]);
          })();
        }, 0);
      }
      return next;
    });
  }, [endlessSize, generateEndlessBatch]);

  const handleEndlessGridChange = useCallback(
    (nextGrid) => {
      if (!endlessSolutionRef.current?.length) return;
      if (equalsSolution(nextGrid, endlessSolutionRef.current)) {
        setEndlessSolvedCount((prev) => prev + 1);
        advanceEndless();
      }
    },
    [advanceEndless],
  );

  const handleEndlessQuit = useCallback(() => {
    const confirm = window.confirm("エンドレスを終了し、オープニングに戻りますか？");
    if (!confirm) return;
    resetEndlessState();
    setScreen("opening");
  }, [resetEndlessState]);

  useEffect(() => {
    endlessSolutionRef.current = endlessSolution;
  }, [endlessSolution]);

  useEffect(() => {
    if (screen !== "endless") return;
    const head = endlessQueue[0] || null;
    if (head === endlessCurrentRef.current) return;
    endlessCurrentRef.current = head;
    if (!head) {
      setEndlessSolution([]);
      endlessSolutionRef.current = [];
      setEndlessGrid([]);
      setEndlessClues({ rows: [], cols: [] });
      return;
    }
    const solutionGrid = cloneSolution(head.grid);
    endlessSolutionRef.current = solutionGrid;
    setEndlessSolution(solutionGrid);
    setEndlessGrid(emptyGrid(solutionGrid.length));
    setEndlessClues(computeClues(solutionGrid));
  }, [endlessQueue, screen]);

  useEffect(() => {
    if (screen !== "endless") return;
    if (endlessLoading) return;
    if (!endlessSize) return;
    const remaining = endlessQueue.length;
    if (endlessError && remaining > 0) return;
    const threshold = Math.max(2, Math.ceil(ENDLESS_REFILL_BATCH * ENDLESS_REFILL_RATIO));
    if (remaining > threshold) return;
    let cancelled = false;
    (async () => {
      setEndlessLoading(true);
      try {
        const batch = await generateEndlessBatch(endlessSize, ENDLESS_REFILL_BATCH);
        if (cancelled) return;
        setEndlessQueue((prev) => [...prev, ...batch]);
        setEndlessError(null);
      } catch (err) {
        if (!cancelled) setEndlessError("お題の追加生成に失敗しました");
      } finally {
        if (!cancelled) setEndlessLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    endlessError,
    endlessQueue.length,
    endlessLoading,
    endlessSize,
    generateEndlessBatch,
    screen,
  ]);

  useEffect(() => {
    let animationId;

    const pollGamepad = () => {
      const pads =
        typeof navigator !== "undefined" && navigator.getGamepads
          ? Array.from(navigator.getGamepads()).filter(Boolean)
          : [];
      const pad = pads.find((candidate) => candidate && candidate.connected);

      if (!pad) {
        if (gamepadConnected) {
          setGamepadConnected(false);
          lastGamepadButtonsRef.current = {};
        }
        animationId = requestAnimationFrame(pollGamepad);
        return;
      }

      if (!gamepadConnected) {
        setGamepadConnected(true);
      }

      const now = performance.now();
      const previousButtons = lastGamepadButtonsRef.current;
      const nextButtons = {};
      const repeatState = gamepadRepeatRef.current;

      const markPressed = () => {
        lastGamepadUsedRef.current = now;
      };

      const processButton = (index, handler, allowRepeat = false) => {
        const pressed = !!pad.buttons[index]?.pressed;
        const wasPressed = previousButtons?.[index] || false;
        let acted = false;

        if (pressed) {
          if (!wasPressed) {
            acted = handler();
            if (acted && allowRepeat) repeatState[index] = now;
          } else if (allowRepeat) {
            const last = repeatState[index] || 0;
            if (now - last >= GAMEPAD_REPEAT_MS) {
              acted = handler();
              if (acted) repeatState[index] = now;
            }
          }
        } else {
          repeatState[index] = 0;
        }

        if (acted) {
          markPressed();
        }

        nextButtons[index] = pressed;
        return acted;
      };

      const moveHorizontal = (delta) => {
        if (screen === "opening") {
          setOpeningFocus((prev) => {
            const options = OPENING_OPTION_COUNT;
            const next = (prev + options + delta) % options;
            return next;
          });
          return true;
        }
        if (screen === "picross") {
          moveGamepadCursor(delta, 0);
          return true;
        }
        return false;
      };

      const moveVertical = (delta) => {
        if (screen === "opening") {
          setOpeningFocus((prev) => {
            const options = OPENING_OPTION_COUNT;
            const next = (prev + options + delta) % options;
            return next;
          });
          return true;
        }
        if (screen === "picross") {
          moveGamepadCursor(0, delta);
          return true;
        }
        return false;
      };

      const handleConfirm = () => {
        if (screen === "opening") {
          if (openingFocus === 0) {
            handleOpeningTutorial();
          } else if (openingFocus === 1) {
            handleOpeningNewGame();
          } else {
            handleOpeningContinue();
          }
          return true;
        }
        if (screen === "conversation") {
          conversationControlsRef.current?.advance?.();
          return true;
        }
        if (screen === "gameover" || screen === "enemy-victory") {
          if (battleNode) {
            beginPicrossForNode(battleNode);
          }
          return true;
        }
        if (screen === "picross") {
          handlePicrossCellAction("fill");
          return true;
        }
        return false;
      };

      const handleCancel = () => {
        if (screen === "conversation") {
          conversationControlsRef.current?.skip?.();
          return true;
        }
        if (screen === "gameover" || screen === "enemy-victory") {
          quitToOpening();
          return true;
        }
        if (screen === "picross") {
          handlePicrossCellAction("cross");
          return true;
        }
        return false;
      };

      const handleMaybe = () => {
        if (screen === "picross") {
          handlePicrossCellAction("maybe");
          return true;
        }
        return false;
      };

      const handleClear = () => {
        if (screen === "picross") {
          handlePicrossCellAction("clear");
          return true;
        }
        return false;
      };

      const handleStartInput = () => {
        if (screen === "conversation") {
          conversationControlsRef.current?.start?.();
          return true;
        }
        if (screen === "picross") {
          togglePaused();
          return true;
        }
        return false;
      };

      const handleSelect = () => {
        if (screen === "picross") {
          handlePicrossReset();
          return true;
        }
        return false;
      };

      const anyDirection =
        processButton(GAMEPAD_BUTTON.LEFT, () => moveHorizontal(-1), true) ||
        processButton(GAMEPAD_BUTTON.RIGHT, () => moveHorizontal(1), true) ||
        processButton(GAMEPAD_BUTTON.UP, () => moveVertical(-1), true) ||
        processButton(GAMEPAD_BUTTON.DOWN, () => moveVertical(1), true);

      const anyAction =
        processButton(GAMEPAD_BUTTON.A, handleConfirm) ||
        processButton(GAMEPAD_BUTTON.B, handleCancel) ||
        processButton(GAMEPAD_BUTTON.Y, handleMaybe) ||
        processButton(GAMEPAD_BUTTON.X, handleClear) ||
        processButton(GAMEPAD_BUTTON.START, handleStartInput) ||
        processButton(GAMEPAD_BUTTON.SELECT, handleSelect);

      if ((anyDirection || anyAction) && inputMode !== "gamepad") {
        setInputMode("gamepad");
      }

      lastGamepadButtonsRef.current = nextButtons;

      animationId = requestAnimationFrame(pollGamepad);
    };

    animationId = requestAnimationFrame(pollGamepad);
    return () => cancelAnimationFrame(animationId);
  }, [
    gamepadConnected,
    handleOpeningTutorial,
    handleOpeningContinue,
    handleOpeningNewGame,
    handlePicrossCellAction,
    handlePicrossReset,
    inputMode,
    battleNode,
    beginPicrossForNode,
    moveGamepadCursor,
    openingFocus,
    quitToOpening,
    screen,
    setInputMode,
    togglePaused,
  ]);

  const puzzleGoal =
    puzzleSequence.length || enemyPuzzleSequence.length || getPuzzleGoalForNode(battleNode);
  const currentRound = Math.max(playerWins, enemyWins);
  const displayPuzzleStep = Math.min(currentRound + 1, puzzleGoal);
  const totalCells = totalCellsRef.current || 1;
  const playerProgressCount = countCorrectFilled(grid, solution);
  const playerProgressRatio = totalCells ? playerProgressCount / totalCells : 0;
  const enemyProgressRatio = totalCells
    ? Math.min(1, enemyProgressRef.current.filled / totalCells)
    : 0;
  const endlessTotalCells = endlessSolution?.length
    ? endlessSolution.reduce(
        (acc, row) => acc + row.filter((cell) => !!cell).length,
        0,
      )
    : 0;
  const endlessProgressCount =
    endlessTotalCells && endlessGrid?.length ? countCorrectFilled(endlessGrid, endlessSolution) : 0;
  const endlessProgressRatio = endlessTotalCells ? endlessProgressCount / endlessTotalCells : 0;

  const renderSpellSlot = (side) => {
    const spell = activeSpell && activeSpell.caster === side ? activeSpell : null;
    const combo = comboState[side] || createComboTrack();
    const stageSet = getStageSet(side, battleNode);
    const readyStages = new Set(combo.readyStages || []);
    const comboSummary = combo.count > 0 ? `Combo x${combo.count}` : "Combo x0";
    const rawSpeech = spellSpeech[side];
    const speech = typeof rawSpeech === "string" ? rawSpeech.trim() : "";
    const hasSpeech = speech.length > 0;
    const stageBadges = stageSet.map((stage) => {
      const threshold = getStageThreshold(stage.id);
      const isReady = readyStages.has(stage.id);
      const reached = combo.count >= threshold;
      const classes = ["combo-stage", stage.id];
      if (reached) classes.push("reached");
      if (isReady) classes.push("ready");
      if (side === "enemy" && isReady) classes.push("pending");
      const label = (
        <>
          <span className="combo-stage-label">{stage.name}</span>
          <span className="combo-stage-threshold">{threshold}</span>
        </>
      );
      if (side === "hero") {
        const disabled = !isReady || boardLocks.enemy;
        return (
          <button
            key={stage.id}
            type="button"
            className={classes.join(" ")}
            disabled={disabled}
            onClick={() => handleHeroStageSelect(stage.id)}
            title={`${stage.name}（${threshold}コンボ）`}
          >
            {label}
          </button>
        );
      }
      return (
        <span
          key={stage.id}
          className={classes.join(" ")}
          title={`${stage.name}（${threshold}コンボ）`}
        >
          {label}
        </span>
      );
    });
    return (
      <div className={`spell-slot ${side}${spell ? " active" : ""}${hasSpeech ? " speaking" : ""}`}>
        <div className="spell-slot-body">
          {hasSpeech ? (
            <span className="spell-slot-message-text">{speech}</span>
          ) : spell ? (
            <>
              <div className="spell-slot-name">{spell.name}</div>
              <div className="spell-slot-desc">{spell.description}</div>
            </>
          ) : (
            <span className="spell-slot-placeholder">
              {side === "hero" ? "スペル待機中" : "敵スペル待機中"}
            </span>
          )}
        </div>
        <div className="combo-panel">
          <div className="combo-summary">{comboSummary}</div>
          <div className="combo-stages">{stageBadges}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="app">
      {screen === "picross" && spellCinematic && (
        <div className={`spell-cinematic-overlay ${spellCinematic.theme}`}>
          <div className="spell-cinematic-backdrop" />
          <div className="spell-cinematic-content">
            <div className={`spell-cinematic-actor ${spellCinematic.caster || "hero"}`}>
                  {spellCinematic.image ? (
                <img src={spellCinematic.image} alt={`${spellCinematic.name} caster`} />
              ) : (
                <span className="spell-cinematic-placeholder">Spell</span>
              )}
                </div>
                <div className="spell-cinematic-text">
                  <div className="spell-cinematic-name">{spellCinematic.name}</div>
                  <div className="spell-cinematic-desc">{spellCinematic.description}</div>
                  {spellCinematic.speech ? (
                    <div className="spell-cinematic-speech">{spellCinematic.speech}</div>
                  ) : null}
                </div>
              </div>
              <div className={`spell-cinematic-aurora ${spellCinematic.theme}`} aria-hidden="true">
                <span className="aurora-core" />
                <span className="aurora-ring" />
            <span className="aurora-spark" />
          </div>
          {!spellCinematic.attachToBoard && (
            <div
              className={`spell-board-impact ${spellCinematic.target || "enemy"} ${
                spellCinematic.showBoard ? "visible" : ""
              }`}
              aria-hidden="true"
            >
              <div
                className="spell-board-grid"
                style={{
                  gridTemplateColumns: `repeat(${spellCinematic.boardSize || 10}, 1fr)`,
                }}
              >
                {Array.from({ length: (spellCinematic.boardSize || 10) ** 2 }).map((_, idx) => {
                  const size = spellCinematic.boardSize || 10;
                  const r = Math.floor(idx / size);
                  const c = idx % size;
                  const impactKey = `${r}-${c}`;
                  const active = spellCinematic.impact?.some(
                    (cell) => cell.r === r && cell.c === c,
                  );
                  const halo =
                    !active &&
                    spellCinematic.impactHalo?.some((cell) => cell.r === r && cell.c === c);
                  const cls = active ? "impact" : halo ? "impact-near" : "";
                  return <span key={impactKey} className={`spell-board-cell ${cls}`} />;
                })}
              </div>
              <div className={`spell-board-flare ${spellCinematic.theme}`} />
            </div>
          )}
        </div>
      )}
      {screen !== "prologue" && (
        <Background
          seed={bgSeed}
          fixedUrl={
            (screen === "conversation" && conversationBackground)
              ? conversationBackground
              : (screen === "picross" && battleBackground)
                  ? battleBackground
                  : screen === "opening" || screen === "endless-select"
                ? TITLE_IMAGE
                : screen === "endless"
                  ? MAP_BACKGROUND_IMAGE
                : screen === "gamestart"
                  ? (gameStartPhase === "before" || gameStartPhase === "after" || gameStartNameVisible
                      ? HERO_FULLBODY
                      : null)
              : screen === "ending"
                ? ENDING_BACKGROUND_IMAGE
                : screen === "route"
                  ? MAP_BACKGROUND_IMAGE
                  : screen === "name"
                    ? HERO_FULLBODY
                    : null
          }
        />
      )}
      <header className="app-header">
        <div className="brand-stack">
          <div className="brand">
            <span className="logo">▦</span>
            <span className="title">elfpix</span>
          </div>
        </div>
        <nav className="top-actions">
          <div className="font-scale-group" role="group" aria-label="フォントサイズ">
            {FONT_SIZE_CHOICES.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`ghost ${fontScale === opt.value ? "active" : ""}`}
                aria-pressed={fontScale === opt.value}
                onClick={() =>
                  setFontScale((prev) => (prev === opt.value ? prev : opt.value))
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            className={`ghost pause ${paused ? "on" : "off"}`}
            onClick={togglePaused}
            disabled={screen !== "picross"}
          >
            {paused ? "Resume" : "Pause"}
          </button>
          <button
            className={`ghost bgm ${soundOn ? "on" : "off"}`}
            onClick={async () => {
              if (!soundOn) {
                try {
                  await audio.enable();
                } catch {}
                try {
                  await bgm.resume();
                } catch {}
                setSoundOn(true);
              } else {
                try {
                  await audio.disable();
                } catch {}
                try {
                  bgm.stop();
                } catch {}
                setSoundOn(false);
              }
            }}
          >
            BGM: {soundOn ? "On" : "Off"}
          </button>
          <ScoreDisplay value={displayScore} animating={scoreAnimating} />
        </nav>
      </header>

      {screen === "prologue" && (
        <Prologue onNext={() => setScreen("opening")} />
      )}

      {screen === "opening" && (
        <Opening
          onStart={handleOpeningContinue}
          onNewGame={handleOpeningNewGame}
          onTutorial={handleOpeningTutorial}
          onEndless={handleOpeningEndless}
          focusedIndex={openingFocus}
          usingGamepad={inputMode === "gamepad"}
        />
      )}

      {screen === "endless-select" && (
        <section className="screen endless-select">
          <div className="panel">
            <p className="eyebrow">Endless Mode</p>
            <h2 className="headline">盤面サイズを選択</h2>
            <p className="subtle">
              HERO ボードのみで、会話やマップなしにピクロスを解き続けます。サイズを選んで開始してください。
            </p>
            <div className="endless-options">
              <button
                className="primary"
                onClick={() => startEndlessMode(5)}
                disabled={endlessLoading}
              >
                5×5 ボード
              </button>
              <button
                className="ghost"
                onClick={() => startEndlessMode(10)}
                disabled={endlessLoading}
              >
                10×10 ボード
              </button>
            </div>
            <div className="endless-select-actions">
              <button className="ghost" onClick={() => setScreen("opening")}>
                戻る
              </button>
            </div>
          </div>
        </section>
      )}

      {screen === "endless" && (
        <section className="screen endless-mode">
          <div className="panel">
            <div className="endless-head">
              <div>
                <p className="eyebrow">Endless Mode</p>
                <h2 className="headline">
                  {endlessSize ? `${endlessSize}×${endlessSize}` : "プレイ中"}
                </h2>
              </div>
              <div className="endless-meta">
                <span className="status-chip">解いた数: {endlessSolvedCount}</span>
                <span className="status-chip">ストック: {Math.max(0, endlessQueue.length)}</span>
              </div>
              <div className="endless-actions">
                <button className="primary" onClick={handleEndlessQuit}>
                  Quit
                </button>
              </div>
            </div>
            {endlessError ? <div className="callout warn">{endlessError}</div> : null}
            {endlessLoading && !endlessQueue.length ? (
              <div className="endless-loading">お題を生成中です…</div>
            ) : endlessSolution.length ? (
              <div className="endless-board">
                <GameBoard
                  size={endlessSolution.length}
                  grid={endlessGrid}
                  setGrid={setEndlessGrid}
                  hintData={endlessClues}
                  solution={endlessSolution}
                  onGridChange={handleEndlessGridChange}
                />
                <div className="panel-progress hero endless-progress">
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{ width: `${Math.min(1, endlessProgressRatio) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="endless-loading">次のお題を準備しています…</div>
            )}
            {endlessLoading && endlessQueue.length ? (
              <div className="endless-loading subtle">次のお題を準備中…</div>
            ) : null}
          </div>
        </section>
      )}

      {screen === "tutorial" && (
        <Tutorial
          onExit={() => setScreen("opening")}
          onComplete={() => {
            setTutorialCompleted(true);
            setScreen("opening");
          }}
        />
      )}

      {screen === "gamestart" && (
        <GameStart
          heroName={heroName}
          onSetName={updateHeroName}
          onDone={() => setScreen("route")}
          onNameEntryVisible={setGameStartNameVisible}
          onPhaseChange={handleGameStartPhase}
        />
      )}

      {screen === "name" && (
        <NameEntry
          initial={heroName}
          onConfirm={(n) => {
            updateHeroName(n);
            setScreen("route");
          }}
          onCancel={() => setScreen("gamestart")}
        />
      )}

      {screen === "route" && (
        <RouteMap
          graph={ROUTE}
          current={currentNode}
          last={lastNode}
          cleared={cleared}
          debugMode={debugMode}
          showAllNodes={debugRevealMap}
          onMoveStart={async () => {
            if (!soundOn) return;
            try {
              await audio.playFootstep();
            } catch {}
          }}
          onArrive={async (id) => {
            const normalized = normalizeNodeId(id);
            if (CHARACTERS[normalized]) {
              if (soundOn) {
                try {
                  await audio.playEnemyEncounter();
                } catch {}
              }
              setPendingNode(normalized);
              setConversationTransition("encounter");
              setScreen("conversation");
            } else {
              enterEnding(normalized);
            }
          }}
        />
      )}

      {screen === "conversation" && pendingNode && (
        <Conversation
          heroName={heroName || "主人公"}
          enemyName={CHARACTERS[pendingNode]?.name || "敵"}
          difficultyId={pendingNode}
          transition={conversationTransition}
          onDone={() => {
            setConversationTransition("none");
            beginPicrossForNode(pendingNode);
          }}
          onSkip={() => {
            setConversationTransition("none");
            beginPicrossForNode(pendingNode);
          }}
          onRegisterGamepad={(controls) => {
            conversationControlsRef.current = controls;
          }}
        />
      )}

      {screen === "picross" && (
        <div className="game-screen">
          <div className="game-topbar">
            <div className="top-left">
              <Timer total={GAME_SECONDS} remaining={remaining} />
              <div className="puzzle-progress">
                Puzzle {displayPuzzleStep} / {puzzleGoal}
              </div>
            </div>
            <div className="top-right hud-actions">
              <button
                className="ghost"
                onClick={() => setGrid(emptyGrid(size))}
              >
                Reset
              </button>
              <button className="ghost" onClick={handleQuitPicross}>
                Quit
              </button>
              <button className="primary" onClick={handleSubmit}>
                Submit
              </button>
            </div>
          </div>
          <div className="game-center">
            <div className="battle-panels">
              <div className="player-panel">
                <div className="panel-avatar hero">
                  {playerAvatar?.src ? (
                    <img src={playerAvatar.src} alt={playerAvatar.alt} />
                  ) : (
                    <span className="panel-avatar-placeholder">―</span>
                  )}
                </div>
                <div className="panel-spell hero">
                  <div className="spell-slot-wrapper">{renderSpellSlot("hero")}</div>
                  <div className="score-meter hero">
                    <span className="score-label">Score</span>
                    <span className="score-value">{Number(displayScore || 0).toLocaleString()}</span>
                  </div>
                </div>
                <div className="panel-score hero">
                  <span className="panel-score-label">プレイヤー</span>
                  <span className="panel-score-value">{playerWins}</span>
                  <span className="panel-score-sub">/ {puzzleGoal}</span>
                </div>
                <div className="panel-board hero">
                  <div className="board-frame hero">
                    <GameBoard
                      size={size}
                      grid={grid}
                      setGrid={setGrid}
                      hintData={clues}
                      clues={clues}
                      solution={solution}
                      onCorrectFill={handlePlayerCorrect}
                      onMistake={handlePlayerMistakeEvent}
                      onCross={handlePlayerCrossEvent}
                      hiddenRowClues={hiddenRowClues}
                      hiddenColClues={hiddenColClues}
                      lockedRowClues={lockedRowClues}
                      lockedColClues={lockedColClues}
                      fadedCells={fadedCells}
                      disabled={paused || spellFreeze || boardLocks.hero}
                      onGridChange={maybeCompletePuzzle}
                      highlightCell={
                        inputMode === "gamepad" && screen === "picross"
                          ? gamepadCursor
                          : null
                      }
                    />
                  </div>
                </div>
                <div className="panel-progress hero">
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{ width: `${Math.min(1, playerProgressRatio) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="enemy-panel">
                <div className="panel-avatar enemy">
                  {enemyAvatar?.src ? (
                    <img src={enemyAvatar.src} alt={enemyAvatar.alt} />
                  ) : (
                    <span className="panel-avatar-placeholder">敵</span>
                  )}
                </div>
                <div className="panel-spell enemy">
                  <div className="spell-slot-wrapper">{renderSpellSlot("enemy")}</div>
                  <div className="score-meter enemy">
                    <span className="score-label">Enemy Score</span>
                    <span className="score-value">{Number(displayEnemyScore || 0).toLocaleString()}</span>
                  </div>
                </div>
                <div className="panel-score enemy">
                  <span className="panel-score-label">敵</span>
                  <span className="panel-score-value">{enemyWins}</span>
                  <span className="panel-score-sub">/ {puzzleGoal}</span>
                </div>
                <div className="panel-board enemy">
                  <div className="board-frame enemy">
                    {spellCinematic?.attachToBoard &&
                      spellCinematic?.target === "enemy" &&
                      spellCinematic.showBoard && (
                        <div className={`spell-board-impact onboard ${spellCinematic.theme}`}>
                          <div
                            className="spell-board-grid"
                            style={{
                              gridTemplateColumns: `repeat(${spellCinematic.boardSize || 10}, 1fr)`,
                            }}
                          >
                            {Array.from({ length: (spellCinematic.boardSize || 10) ** 2 }).map(
                              (_, idx) => {
                                const size = spellCinematic.boardSize || 10;
                                const r = Math.floor(idx / size);
                                const c = idx % size;
                                const impactKey = `${r}-${c}`;
                                const active = spellCinematic.impact?.some(
                                  (cell) => cell.r === r && cell.c === c,
                                );
                                const halo =
                                  !active &&
                                  spellCinematic.impactHalo?.some(
                                    (cell) => cell.r === r && cell.c === c,
                                  );
                                const cls = active ? "impact" : halo ? "impact-near" : "";
                                return <span key={impactKey} className={`spell-board-cell ${cls}`} />;
                              },
                            )}
                          </div>
                          <div className={`spell-board-flare ${spellCinematic.theme}`} />
                        </div>
                      )}
                    <EnemyBoard
                      size={size}
                      grid={enemyGrid}
                      hintData={clues}
                      clues={clues}
                      fadedCells={enemyFadedCells}
                    />
                  </div>
                </div>
                <div className="panel-progress enemy">
                  <div className="progress-track enemy">
                    <div
                      className="progress-fill"
                      style={{ width: `${Math.min(1, enemyProgressRatio) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="spell-projectiles">
              {projectiles.map((proj) => (
                <span key={proj.id} className={`spell-projectile ${proj.variant}`} />
              ))}
            </div>
            {paused && (
              <div className="pause-overlay">
                <div className="pause-box">
                  <div className="pause-title">Paused</div>
                  <div className="pause-actions">
                    <button className="primary" type="button" onClick={togglePaused}>
                      Resume
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {screen === "picross-clear" && (
        <PicrossClear
          heroName={heroName || "主人公"}
          heroImage={HERO_IMAGES.smile}
          boardEntries={GLYPH_COLLECTION}
          unlockedIndices={Array.from(glyphCollection)}
          solvedGrids={glyphSolved}
          newlyUnlockedEntries={recentGlyphUnlocks}
          onContinue={handlePicrossClearContinue}
        />
      )}

      {screen === "enemy-victory" && (
        <EnemyVictory
          heroName={heroName || "主人公"}
          onContinue={() => {
            if (battleNode) beginPicrossForNode(battleNode);
          }}
          onQuit={quitToOpening}
        />
      )}

      {screen === "gameover" && (
        <GameOver
          onContinue={() => {
            if (battleNode) beginPicrossForNode(battleNode);
          }}
          onQuit={quitToOpening}
        />
      )}

      {screen === "ending" && (
        <Ending
          heroName={heroName || "主人公"}
          endingNode={endingNode}
          onDone={handleEndingComplete}
        />
      )}
      {debugMenuOpen && (
        <div
          className="debug-menu-overlay"
          onMouseDown={handleDebugMenuOverlayMouseDown}
          role="presentation"
        >
          <div
            className="debug-menu"
            style={{ top: `${debugMenuPosition.y}px`, left: `${debugMenuPosition.x}px` }}
            ref={debugMenuRef}
            role="menu"
            aria-label="デバッグメニュー"
            tabIndex={-1}
            onKeyDown={handleDebugMenuKeyDown}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="debug-menu-header">
              <span className="debug-menu-heading">Debug Menu</span>
              <button
                type="button"
                className="debug-menu-close"
                onClick={closeDebugMenu}
                aria-label="デバッグメニューを閉じる"
              >
                ×
              </button>
            </div>
            <div className="debug-menu-section">
              <p className="debug-menu-title">ユーティリティ</p>
              <button
                type="button"
                role="menuitemcheckbox"
                aria-checked={debugMode}
                onClick={toggleDebugInstantClear}
                className="debug-menu-button"
              >
                即時クリア: {debugMode ? "On" : "Off"}
              </button>
              <button
                type="button"
                role="menuitemcheckbox"
                aria-checked={debugRevealMap}
                onClick={toggleDebugRevealMap}
                className="debug-menu-button"
              >
                マップ全体表示: {debugRevealMap ? "On" : "Off"}
              </button>
            </div>
            <div className="debug-menu-section">
              <p className="debug-menu-title">マップへ移動</p>
              <div className="debug-menu-grid">
                {routeJumpOptions.map((option) => (
                  <button
                    key={`debug-route-${option.id}`}
                    type="button"
                    role="menuitem"
                    onClick={() => handleDebugJumpToRoute(option.id)}
                    className="debug-menu-button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="debug-menu-section">
              <p className="debug-menu-title">会話へ移動</p>
              <div className="debug-menu-grid">
                {enemyJumpOptions.map((option) => (
                  <button
                    key={`debug-conversation-${option.id}`}
                    type="button"
                    role="menuitem"
                    onClick={() => handleDebugJumpToConversation(option.id)}
                    className="debug-menu-button"
                  >
                    {option.name ? `${option.name} (${option.label})` : option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="debug-menu-section">
              <p className="debug-menu-title">ピクロスへ移動</p>
              <div className="debug-menu-grid">
                {enemyJumpOptions.map((option) => (
                  <button
                    key={`debug-picross-${option.id}`}
                    type="button"
                    role="menuitem"
                    onClick={() => handleDebugJumpToPicross(option.id)}
                    className="debug-menu-button"
                  >
                    {option.name ? `${option.name} (${option.label})` : option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="debug-menu-section">
              <p className="debug-menu-title">勝利画面を確認</p>
              <div className="debug-menu-grid">
                {enemyJumpOptions.map((option) => (
                  <button
                    key={`debug-victory-${option.id}`}
                    type="button"
                    role="menuitem"
                    onClick={() => handleDebugShowVictory(option.id)}
                    className="debug-menu-button"
                  >
                    {option.name ? `${option.name} (${option.label})` : option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="debug-menu-section">
              <p className="debug-menu-title">エンディングへ移動</p>
              <div className="debug-menu-grid">
                {ENDING_OPTIONS.map((option) => (
                  <button
                    key={`debug-ending-${option.id}`}
                    type="button"
                    role="menuitem"
                    onClick={() => handleDebugJumpToEnding(option.id)}
                    className="debug-menu-button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
