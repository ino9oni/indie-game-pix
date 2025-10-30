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
const DEFAULT_PUZZLES_PER_BATTLE = 2;
const PUZZLES_PER_BATTLE_BY_NODE = {
  "elf-practice": 2,
  "elf-easy": 4,
  "elf-middle": 6,
  "elf-hard": 8,
  "elf-ultra": 10,
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
const OPENING_OPTION_COUNT = 3;
const HERO_IMAGES = {
  normal: assetPath("assets/img/character/hero/hero_normal.png"),
  angry: assetPath("assets/img/character/hero/hero_angry.png"),
  smile: assetPath("assets/img/character/hero/hero_smile.png"),
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
  "elf-practice": { interval: 1400, errorRate: 0.15, spellId: "practice" },
  "elf-easy": { interval: 1100, errorRate: 0.1, spellId: "easy" },
  "elf-middle": { interval: 900, errorRate: 0.08, spellId: "middle" },
  "elf-hard": { interval: 750, errorRate: 0.05, spellId: "high" },
  "elf-ultra": { interval: 600, errorRate: 0.03, spellId: "ultra" },
};

const HERO_SPELL = {
  name: "迷宮への閃光",
  ratio: 0.3,
  revertRatio: 0.1,
};

const SPELL_SPEECH_DURATION = 4000;

const SPELL_DIALOGUE = {
  hero: "「迷宮への閃光、道を切り拓け！」",
  enemy: {
    practice: "「翠門よ、旅人の視界を閉ざせ！」",
    easy: "「木霊たち、印を跳ね散らせ！」",
    middle: "「紋章の秘鍵よ、謎を秘せ！」",
    high: "「花冠の霧よ、盤面を霞ませなさい！」",
    ultra: "「森羅の審判、侵入者を裁け！」",
    default: "「森の精霊よ、力を貸して！」",
  },
};

const ENEMY_SPELLS = {
  practice: {
    name: "翠門の封緘",
    description: "ヒントが封緘され視界が曇る",
    durationMs: 8000,
  },
  easy: {
    name: "木霊の跳躍",
    description: "マーキングした×が跳ねて位置がずれる",
  },
  middle: {
    name: "紋章の秘鍵",
    description: "該当行/列のヒント表示が暗号化される",
    durationMs: 8000,
  },
  high: {
    name: "花冠の迷彩",
    description: "魔花の霧で盤面の一部が霞む",
    durationMs: 8000,
    regions: 2,
  },
  ultra: {
    name: "森羅の審判",
    description: "以後のミスが追加の罰則を伴う",
  },
};

const DEFAULT_ENEMY_CONFIG = { interval: 1200, errorRate: 0.08, spellId: null };

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

function shuffle(array) {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
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

function createComboTrack() {
  return {
    count: 0,
    show: false,
    label: 0,
    pulse: 0,
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
  const [debugMode, setDebugMode] = useState(() => {
    try {
      return localStorage.getItem("debugMode") === "1";
    } catch {
      return false;
    }
  });
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
  const [paused, setPaused] = useState(false);
  const [projectiles, setProjectiles] = useState([]);
  const [comboState, setComboState] = useState(() => ({
    hero: createComboTrack(),
    enemy: createComboTrack(),
  }));
  const size = solution.length;
  const clues = useMemo(() => computeClues(solution), [solution]);

  const resetCombo = useCallback((side) => {
    setComboState((prev) => {
      const nextTrack = createComboTrack();
      if (prev[side].count === 0 && !prev[side].show) return prev;
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
      const nextTrack = {
        count: nextCount,
        show: shouldShow,
        label: nextCount,
        pulse: shouldShow ? current.pulse + 1 : current.pulse,
      };
      return { ...prev, [side]: nextTrack };
    });
  }, []);

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
  const hiddenTimersRef = useRef({ hidden: null, locked: null, faded: null });
  const spellOverlayTimeoutRef = useRef(null);
  const speechTimeoutRef = useRef({ hero: null, enemy: null });
  const conversationControlsRef = useRef(null);
  const lastGamepadButtonsRef = useRef({});
  const gamepadRepeatRef = useRef({});
  const gamepadCursorRef = useRef({ row: 0, col: 0 });
  const lastGamepadUsedRef = useRef(0);
  const heroStateRef = useRef({});
  const heroSpellRef = useRef({ threshold: 0, used: false });
  const enemySpellStateRef = useRef({ used: new Set() });
  const enemyProgressRef = useRef({ filled: 0, total: 0 });
  const totalCellsRef = useRef(0);
  const ultraPenaltyActiveRef = useRef(false);
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
    setHiddenRowClues([]);
    setHiddenColClues([]);
    setLockedRowClues([]);
    setLockedColClues([]);
    setFadedCells([]);
    ultraPenaltyActiveRef.current = false;
    setSpellSpeech({ hero: null, enemy: null });
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
  }, []);
  const showSpellOverlay = useCallback((payload) => {
    if (spellOverlayTimeoutRef.current) {
      clearTimeout(spellOverlayTimeoutRef.current);
      spellOverlayTimeoutRef.current = null;
    }
    setActiveSpell(payload);

    const caster = payload?.caster;
    const spellId = payload?.spellId;
    let speechText = payload?.speech;
    if (!speechText && caster === "hero") {
      speechText = SPELL_DIALOGUE.hero;
    } else if (!speechText && caster === "enemy") {
      speechText = SPELL_DIALOGUE.enemy[spellId] || SPELL_DIALOGUE.enemy.default;
    }

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
  }, []);

  const triggerHeroSpell = useCallback(() => {
    if (heroSpellRef.current.used) return;
    heroSpellRef.current.used = true;
    const removed = [];
    setEnemyGrid((prev) => {
      const coords = [];
      prev.forEach((row, r) =>
        row.forEach((cell, c) => {
          if (cell === 1) coords.push({ r, c });
        }),
      );
      if (!coords.length) return prev;
      const removeCount = Math.max(1, Math.floor(coords.length * HERO_SPELL.revertRatio));
      const chosen = shuffle(coords).slice(0, removeCount);
      const next = prev.map((row) => row.slice());
      chosen.forEach(({ r, c }) => {
        if (next[r][c] === 1) {
          next[r][c] = 0;
          removed.push({ r, c });
        }
      });
      return next;
    });
    if (removed.length) {
      enemyProgressRef.current.filled = Math.max(
        0,
        enemyProgressRef.current.filled - removed.length,
      );
      const pending = enemyOrderRef.current.list.slice(enemyOrderRef.current.index);
      enemyOrderRef.current = {
        list: pending.concat(shuffle(removed)),
        index: 0,
      };
      resetCombo("enemy");
    }
    showSpellOverlay({
      caster: "hero",
      spellId: "hero",
      name: HERO_SPELL.name,
      description: "敵の進捗を巻き戻した",
      image: HERO_IMAGES.angry,
    });
    audio.playSpellAttack("hero");
    launchProjectile("hero");
  }, [resetCombo, showSpellOverlay]);

  const triggerEnemySpell = useCallback(
    (spellId, context = {}) => {
      if (!spellId || !battleNode) return;
      const spell = ENEMY_SPELLS[spellId];
      if (!spell) return;
      if (enemySpellStateRef.current.used.has(spellId)) return;
      enemySpellStateRef.current.used.add(spellId);
      const character = CHARACTERS[battleNode];
      const enemyName = character?.name || "敵";
      showSpellOverlay({
        caster: "enemy",
        spellId,
        name: spell.name,
        description: spell.description,
        image: character?.images?.angry,
      });
      audio.playSpellAttack("enemy");
      launchProjectile("enemy");
      const duration = spell.durationMs || 8000;
      const n = solution.length;
      const { row: ctxRow, col: ctxCol, type: ctxType, index: ctxIndex } = context || {};
      switch (spellId) {
        case "practice": {
          let targetKind = null;
          let targetIndex = null;
          if (typeof ctxRow === "number" && ctxRow >= 0 && ctxRow < n) {
            targetKind = "row";
            targetIndex = ctxRow;
          } else if (typeof ctxCol === "number" && ctxCol >= 0 && ctxCol < n) {
            targetKind = "col";
            targetIndex = ctxCol;
          } else {
            const fallbackKind = Math.random() < 0.5 ? "row" : "col";
            targetKind = fallbackKind;
            targetIndex = Math.floor(Math.random() * n);
          }
          if (targetKind === "row") {
            setHiddenRowClues([targetIndex]);
            setHiddenColClues([]);
          } else if (targetKind === "col") {
            setHiddenColClues([targetIndex]);
            setHiddenRowClues([]);
          }
          if (hiddenTimersRef.current.hidden) {
            clearTimeout(hiddenTimersRef.current.hidden);
          }
          hiddenTimersRef.current.hidden = setTimeout(() => {
            setHiddenRowClues([]);
            setHiddenColClues([]);
            hiddenTimersRef.current.hidden = null;
          }, duration);
          break;
        }
        case "easy": {
          setGrid((prev) => {
            const crossCells = [];
            prev.forEach((row, r) =>
              row.forEach((cell, c) => {
                if (cell === -1) crossCells.push({ r, c });
              }),
            );
            if (!crossCells.length) return prev;
            const next = prev.map((row) => row.slice());
            const available = crossCells.length;
            const targetCount =
              available < 2
                ? available
                : Math.min(4, Math.max(2, Math.floor(available / 2) || 2));
            const count = targetCount || available;
            shuffle(crossCells)
              .slice(0, count)
              .forEach(({ r, c }) => {
                next[r][c] = 0;
                const neighbors = shuffle([
                  [r - 1, c],
                  [r + 1, c],
                  [r, c - 1],
                  [r, c + 1],
                ]);
                const target = neighbors.find(([nr, nc]) =>
                  nr >= 0 && nr < n && nc >= 0 && nc < n && next[nr][nc] === 0,
                );
                if (target) {
                  const [nr, nc] = target;
                  next[nr][nc] = -1;
                }
              });
            return next;
          });
          break;
        }
        case "middle": {
          let targetKind = null;
          let targetIndex = null;
          if (
            (ctxType === "row" || ctxType === "col") &&
            typeof ctxIndex === "number"
          ) {
            targetKind = ctxType;
            targetIndex = ctxIndex;
          } else if (typeof ctxRow === "number" && ctxRow >= 0 && ctxRow < clues.rows.length) {
            targetKind = "row";
            targetIndex = ctxRow;
          } else if (typeof ctxCol === "number" && ctxCol >= 0 && ctxCol < clues.cols.length) {
            targetKind = "col";
            targetIndex = ctxCol;
          } else {
            const pickRow = Math.random() < 0.5;
            if (pickRow) {
              targetKind = "row";
              targetIndex = Math.floor(Math.random() * clues.rows.length);
            } else {
              targetKind = "col";
              targetIndex = Math.floor(Math.random() * clues.cols.length);
            }
          }
          if (targetKind === "row") {
            setLockedRowClues([targetIndex]);
            setLockedColClues([]);
          } else if (targetKind === "col") {
            setLockedColClues([targetIndex]);
            setLockedRowClues([]);
          }
          if (hiddenTimersRef.current.locked) {
            clearTimeout(hiddenTimersRef.current.locked);
          }
          hiddenTimersRef.current.locked = setTimeout(() => {
            setLockedRowClues([]);
            setLockedColClues([]);
            hiddenTimersRef.current.locked = null;
          }, duration);
          break;
        }
        case "high": {
          const regions = spell.regions || 2;
          const faded = new Set();
          for (let i = 0; i < regions; i += 1) {
            const centerR = Math.floor(Math.random() * n);
            const centerC = Math.floor(Math.random() * n);
            for (let dr = -1; dr <= 1; dr += 1) {
              for (let dc = -1; dc <= 1; dc += 1) {
                const rr = centerR + dr;
                const cc = centerC + dc;
                if (rr >= 0 && rr < n && cc >= 0 && cc < n) {
                  faded.add(`${rr}-${cc}`);
                }
              }
            }
          }
          setFadedCells(Array.from(faded));
          if (hiddenTimersRef.current.faded) {
            clearTimeout(hiddenTimersRef.current.faded);
          }
          hiddenTimersRef.current.faded = setTimeout(() => {
            setFadedCells([]);
            hiddenTimersRef.current.faded = null;
          }, duration);
          break;
        }
        case "ultra": {
          ultraPenaltyActiveRef.current = true;
          break;
        }
        default:
          break;
      }
    },
    [battleNode, clues, setGrid, showSpellOverlay, solution],
  );

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
    const clearedGlyphSet = new Set();
    const clearedGlyphSolved = new Map();
    setGlyphCollection(clearedGlyphSet);
    setGlyphSolved(clearedGlyphSolved);
    persistGlyphCollection(clearedGlyphSet, clearedGlyphSolved);
  }

  useEffect(() => {
    if (screen !== "picross") return;
    if (paused) return;
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
  }, [screen, paused, handleSubmit]);

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
    const generation = generateBattlePuzzles(normalizedId, n, puzzleGoal, {});
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
    heroSpellRef.current = {
      threshold: Math.max(1, Math.ceil(total * HERO_SPELL.ratio)),
      used: false,
    };
    heroStateRef.current = {
      correctStreak: 0,
      chainStreak: 0,
      lastCorrect: null,
      crossStreak: 0,
      sameLineRow: null,
      sameLineCol: null,
      sameLineStreak: 0,
      blockChain: { type: null, index: null, length: 1 },
      noMistakeStart: Date.now(),
      noMistakeTriggered: false,
    };
    enemySpellStateRef.current = { used: new Set() };
    const enemySolution = enemyFirstSolution.map((row) => row.slice());
    enemySolutionRef.current = enemySolution;
    enemyProgressRef.current = {
      filled: 0,
      total: enemySolution.reduce((acc, row) => acc + row.filter(Boolean).length, 0),
    };
    enemyOrderRef.current = { list: [], index: 0 };
    setEnemyGrid(emptyGrid(enemySolution.length));
    setEnemySolutionVersion((v) => v + 1);
    ultraPenaltyActiveRef.current = false;
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
      heroSpellRef.current = {
        threshold: Math.max(1, Math.ceil(total * HERO_SPELL.ratio)),
        used: false,
      };
      heroStateRef.current = {
        correctStreak: 0,
        chainStreak: 0,
        lastCorrect: null,
        crossStreak: 0,
        sameLineRow: null,
        sameLineCol: null,
        sameLineStreak: 0,
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
      enemySpellStateRef.current = { used: new Set() };
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
    if (unlockDetails.length > 0) {
      audio.playCollectionUnlock?.();
    }
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
    (row, col, nextGrid) => {
      const config = battleNode ? ENEMY_AI_CONFIG[battleNode] : DEFAULT_ENEMY_CONFIG;
      const heroState = heroStateRef.current;
      heroState.crossStreak = 0;
      heroState.sameLineStreak = 0;
      heroState.correctStreak += 1;
      incrementCombo("hero");

      const prev = heroState.lastCorrect;
      const isAdjacent =
        prev && Math.abs(prev.r - row) + Math.abs(prev.c - col) === 1;
      let chainInfo = heroState.blockChain || { type: null, index: null, length: 1 };

      if (isAdjacent) {
        if (prev.r === row) {
          if (chainInfo.type === "row" && chainInfo.index === row) {
            chainInfo = {
              type: "row",
              index: row,
              length: Math.max(2, chainInfo.length + 1),
            };
          } else {
            chainInfo = { type: "row", index: row, length: 2 };
          }
        } else if (prev.c === col) {
          if (chainInfo.type === "col" && chainInfo.index === col) {
            chainInfo = {
              type: "col",
              index: col,
              length: Math.max(2, chainInfo.length + 1),
            };
          } else {
            chainInfo = { type: "col", index: col, length: 2 };
          }
        } else {
          chainInfo = { type: null, index: null, length: 1 };
        }
      } else {
        chainInfo = { type: null, index: null, length: 1 };
      }

      heroState.blockChain = chainInfo;
      heroState.lastCorrect = { r: row, c: col };

      const total = totalCellsRef.current || 1;
      const filled = countCorrectFilled(nextGrid, solution);

      if (!heroSpellRef.current.used && heroState.correctStreak >= heroSpellRef.current.threshold) {
        triggerHeroSpell();
        heroState.correctStreak = 0;
      }

      const enemySpellId = config.spellId;
      if (enemySpellId === "middle" && chainInfo.type && chainInfo.length >= 3) {
        triggerEnemySpell("middle", { type: chainInfo.type, index: chainInfo.index });
        heroState.blockChain = { type: null, index: null, length: 1 };
      }
      if (enemySpellId === "ultra" && !enemySpellStateRef.current.used.has("ultra") && filled / total >= 0.75) {
        triggerEnemySpell("ultra");
      }
    },
    [battleNode, incrementCombo, triggerHeroSpell, triggerEnemySpell, solution],
  );

  const handleHeroMistake = useCallback(
    (row, col, meta = {}, nextGrid) => {
      const heroState = heroStateRef.current;
      heroState.correctStreak = 0;
      heroState.chainStreak = 0;
      heroState.lastCorrect = null;
      heroState.crossStreak = 0;
      heroState.blockChain = { type: null, index: null, length: 1 };
      resetCombo("hero");
      const prevRow = heroState.sameLineRow;
      const prevCol = heroState.sameLineCol;
      const sameRow = typeof prevRow === "number" && row === prevRow;
      const sameCol = typeof prevCol === "number" && col === prevCol;
      if (sameRow || sameCol) {
        heroState.sameLineStreak += 1;
      } else {
        heroState.sameLineStreak = 1;
      }
      heroState.sameLineRow = row;
      heroState.sameLineCol = col;
      heroState.noMistakeStart = Date.now();
      heroState.noMistakeTriggered = false;

      const config = battleNode ? ENEMY_AI_CONFIG[battleNode] : DEFAULT_ENEMY_CONFIG;
      if (config.spellId === "practice" && heroState.sameLineStreak >= 2) {
        const payload = {};
        if (sameRow) payload.row = row;
        if (sameCol) payload.col = col;
        triggerEnemySpell("practice", payload);
        heroState.sameLineStreak = 0;
      }

      if (ultraPenaltyActiveRef.current) {
        setGrid((prev) => {
          const coords = [];
          prev.forEach((rowArr, rIdx) =>
            rowArr.forEach((cell, cIdx) => {
              if (cell === 1 && solution?.[rIdx]?.[cIdx]) {
                coords.push({ r: rIdx, c: cIdx });
              }
            }),
          );
          if (!coords.length) return prev;
          const remove = shuffle(coords).slice(0, Math.min(2, coords.length));
          const next = prev.map((rowArr) => rowArr.slice());
          remove.forEach(({ r: rr, c: cc }) => {
            next[rr][cc] = 0;
          });
          return next;
        });
      }
    },
    [battleNode, resetCombo, setGrid, solution, triggerEnemySpell],
  );

  const handleHeroCross = useCallback(
    (row, col) => {
      const config = battleNode ? ENEMY_AI_CONFIG[battleNode] : DEFAULT_ENEMY_CONFIG;
      const heroState = heroStateRef.current;
      heroState.crossStreak += 1;
      heroState.correctStreak = 0;
      heroState.lastCorrect = null;
      heroState.blockChain = { type: null, index: null, length: 1 };
      if (config.spellId === "easy" && heroState.crossStreak >= 5) {
        triggerEnemySpell("easy");
        heroState.crossStreak = 0;
      }
    },
    [battleNode, triggerEnemySpell],
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
    (row, col) => {
      handleHeroCross(row, col);
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
    if (screen !== "picross") {
      resetAllCombos();
    }
  }, [screen, resetAllCombos]);

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
    if (paused) {
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
    const timer = setInterval(() => {
      const totalNeeded = puzzleSequence.length || getPuzzleGoalForNode(battleNode);
      if (playerWins >= totalNeeded || enemyWins >= totalNeeded) {
        stopEnemySolver();
        return;
      }
      const state = enemyOrderRef.current;
      if (!state.list.length) {
        stopEnemySolver();
        handleEnemyPuzzleClear();
        return;
      }
      if (state.index >= state.list.length) {
        stopEnemySolver();
        handleEnemyPuzzleClear();
        return;
      }
      const target = state.list[state.index];
      state.index += 1;
      if (Math.random() < config.errorRate) {
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
      enemyProgressRef.current.filled += 1;
      if (enemyProgressRef.current.filled >= enemyProgressRef.current.total) {
        stopEnemySolver();
        handleEnemyPuzzleClear();
      }
    }, Math.max(120, config.interval));
    enemySolverRef.current = timer;
    return () => clearInterval(timer);
  }, [
    screen,
    battleNode,
    enemySolutionVersion,
    playerWins,
    enemyWins,
    puzzleSequence.length,
    paused,
    stopEnemySolver,
    handleEnemyPuzzleClear,
    incrementCombo,
  ]);

  useEffect(() => {
    if (screen !== "picross") return;
    if (!battleNode) return;
    const config = ENEMY_AI_CONFIG[battleNode] || DEFAULT_ENEMY_CONFIG;
    if (config.spellId !== "high") return;
    if (enemySpellStateRef.current.used.has("high")) return;
    if (paused) return;
    const timer = setInterval(() => {
      if (enemySpellStateRef.current.used.has("high")) {
        clearInterval(timer);
        return;
      }
      const heroState = heroStateRef.current;
      if (heroState.noMistakeTriggered) return;
      const start = heroState.noMistakeStart;
      if (!start) return;
      const elapsed = Date.now() - start;
      if (elapsed >= 60000) {
        triggerEnemySpell("high");
        heroState.noMistakeTriggered = true;
        heroState.noMistakeStart = Date.now();
        clearInterval(timer);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [screen, battleNode, triggerEnemySpell, paused]);

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

  const renderSpellSlot = (side) => {
    const spell = activeSpell && activeSpell.caster === side ? activeSpell : null;
    const combo = comboState[side] || createComboTrack();
    const comboVisible = combo.show && combo.label >= 2;
    const rawSpeech = spellSpeech[side];
    const speech = typeof rawSpeech === "string" ? rawSpeech.trim() : "";
    const hasSpeech = speech.length > 0;
    const comboBadge = (
      <div className={`combo-badge ${side} ${comboVisible ? "visible" : ""}`}>
        {comboVisible && (
          <span key={`${side}-${combo.pulse}`} className="combo-badge-text">
            Combo x{combo.label}
          </span>
        )}
      </div>
    );
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
        {comboBadge}
      </div>
    );
  };

  return (
    <div className="app">
      {screen !== "prologue" && (
        <Background
          seed={bgSeed}
          fixedUrl={
            (screen === "conversation" && conversationBackground)
              ? conversationBackground
              : (screen === "picross" && battleBackground)
                  ? battleBackground
                  : screen === "opening"
                ? TITLE_IMAGE
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
            className={`ghost debug ${debugMode ? "on" : "off"}`}
            title="デバッグモード切り替え"
            onClick={() =>
              setDebugMode((v) => {
                const nv = !v;
                try {
                  localStorage.setItem("debugMode", nv ? "1" : "0");
                } catch {}
                return nv;
              })
            }
          >
            Debug: {debugMode ? "On" : "Off"}
          </button>
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
          focusedIndex={openingFocus}
          usingGamepad={inputMode === "gamepad"}
        />
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
                      disabled={paused}
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
                    <EnemyBoard size={size} grid={enemyGrid} hintData={clues} clues={clues} />
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
    </div>
  );
}
