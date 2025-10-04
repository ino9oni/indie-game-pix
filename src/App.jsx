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
import ScoreDisplay from "./components/ScoreDisplay.jsx";
import { getRandomPuzzleForSize, getRandomPuzzlesForSize } from "./game/puzzles.js";
import { ROUTE, CHARACTERS } from "./game/route.js";
import { computeClues, emptyGrid, equalsSolution } from "./game/utils.js";
import audio from "./audio/AudioManager.js";
import bgm from "./audio/BgmPlayer.js";
import { TRACKS } from "./audio/tracks.js";

const GAME_SECONDS = 20 * 60; // 20 minutes
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
const PUZZLES_PER_BATTLE = 3;
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
]);
const HERO_IMAGES = {
  normal: "/assets/img/character/hero/hero_normal.png",
  angry: "/assets/img/character/hero/hero_angry.png",
  smile: "/assets/img/character/hero/hero_smile.png",
};

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

function normalizeNodeId(id) {
  if (id === LEGACY_FINAL_NODE_ID) return DEFAULT_TRUE_ENDING_NODE;
  return id;
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

export default function App() {
  const [screen, setScreen] = useState("prologue");
  const [level, setLevel] = useState("easy");
  const [grid, setGrid] = useState([]);
  const [solution, setSolution] = useState([]);
  const [startedAt, setStartedAt] = useState(null);
  const [remaining, setRemaining] = useState(GAME_SECONDS);
  const [bgSeed, setBgSeed] = useState(0);
  const [gameStartNameVisible, setGameStartNameVisible] = useState(false);
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
  const [debugMode, setDebugMode] = useState(() => {
    try {
      return localStorage.getItem("debugMode") === "1";
    } catch {
      return false;
    }
  });
  const [heroName, setHeroName] = useState(
    () => localStorage.getItem("heroName") || "",
  );
  const spedUpRef = useRef(false);
  const resumeOnceRef = useRef(false);
  const [currentNode, setCurrentNode] = useState(() => readStoredNode());
  const [lastNode, setLastNode] = useState("");
  const [pendingNode, setPendingNode] = useState(null);
  const [battleNode, setBattleNode] = useState(null);
  const [cleared, setCleared] = useState(() => readStoredClearedSet());
  const [endingNode, setEndingNode] = useState(null);
  const [puzzleSequence, setPuzzleSequence] = useState([]);
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [playerWins, setPlayerWins] = useState(0);
  const [enemyWins, setEnemyWins] = useState(0);
  const [enemyGrid, setEnemyGrid] = useState([]);
  const [spellLog, setSpellLog] = useState([]);
  const [activeSpell, setActiveSpell] = useState(null);
  const [postClearAction, setPostClearAction] = useState(null);
  const [hiddenRowClues, setHiddenRowClues] = useState([]);
  const [hiddenColClues, setHiddenColClues] = useState([]);
  const [lockedRowClues, setLockedRowClues] = useState([]);
  const [lockedColClues, setLockedColClues] = useState([]);
  const [fadedCells, setFadedCells] = useState([]);
  const [paused, setPaused] = useState(false);
  const [projectiles, setProjectiles] = useState([]);
  const size = solution.length;
  const clues = useMemo(() => computeClues(solution), [solution]);

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
    if (celebrationDelayRef.current) {
      clearTimeout(celebrationDelayRef.current);
      celebrationDelayRef.current = null;
    }
    if (typeof audio.stopClearFanfare === "function") {
      audio.stopClearFanfare();
    }
  }, []);

  const scoreRef = useRef(score);
  const displayScoreRef = useRef(displayScore);
  const scoreAnimTimerRef = useRef(null);
  const realtimeBonusRef = useRef(new Set());
  const celebrationDelayRef = useRef(null);
  const enemySolverRef = useRef(null);
  const hiddenTimersRef = useRef({ hidden: null, locked: null, faded: null });
  const spellOverlayTimeoutRef = useRef(null);
  const heroStateRef = useRef({});
  const heroSpellRef = useRef({ threshold: 0, used: false });
  const enemySpellStateRef = useRef({ used: new Set() });
  const enemyProgressRef = useRef({ filled: 0, total: 0 });
  const totalCellsRef = useRef(0);
  const ultraPenaltyActiveRef = useRef(false);
  const enemyOrderRef = useRef({ list: [], index: 0 });
  const puzzleSolvedRef = useRef(false);

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
    if (spellOverlayTimeoutRef.current) {
      clearTimeout(spellOverlayTimeoutRef.current);
      spellOverlayTimeoutRef.current = null;
    }
  }, []);

  const logSpell = useCallback((message) => {
    setSpellLog((prev) => {
      const entry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        message,
      };
      return [entry, ...prev].slice(0, 6);
    });
  }, []);

  const showSpellOverlay = useCallback((payload) => {
    if (spellOverlayTimeoutRef.current) {
      clearTimeout(spellOverlayTimeoutRef.current);
      spellOverlayTimeoutRef.current = null;
    }
    setActiveSpell(payload);
    spellOverlayTimeoutRef.current = setTimeout(() => {
      setActiveSpell(null);
      spellOverlayTimeoutRef.current = null;
    }, 4000);
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
    }
    const casterName = heroName || "主人公";
    logSpell(`${casterName} が「${HERO_SPELL.name}」を放った`);
    showSpellOverlay({
      caster: "hero",
      name: HERO_SPELL.name,
      description: "敵の進捗を巻き戻した",
      image: HERO_IMAGES.angry,
    });
    audio.playSpellAttack("hero");
    launchProjectile("hero");
  }, [heroName, logSpell, showSpellOverlay]);

  const triggerEnemySpell = useCallback(
    (spellId, context = {}) => {
      if (!spellId || !battleNode) return;
      const spell = ENEMY_SPELLS[spellId];
      if (!spell) return;
      if (enemySpellStateRef.current.used.has(spellId)) return;
      enemySpellStateRef.current.used.add(spellId);
      const character = CHARACTERS[battleNode];
      const enemyName = character?.name || "敵";
      logSpell(`${enemyName} が「${spell.name}」を発動`);
      showSpellOverlay({
        caster: "enemy",
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
    [battleNode, clues, logSpell, setGrid, showSpellOverlay, solution],
  );

  function resetProgress() {
    cancelCelebration();
    stopEnemySolver();
    clearSpellEffects();
    resetScore();
    setCleared(new Set());
    setEndingNode(null);
    setPuzzleSequence([]);
    setPuzzleIndex(0);
    setPlayerWins(0);
    setEnemyWins(0);
    setSpellLog([]);
    setActiveSpell(null);
    setEnemyGrid([]);
    setPostClearAction(null);
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
  }, [stopScoreAnimation]);

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

  useEffect(() => cancelCelebration, [cancelCelebration]);

  const chosenTrackRef = useRef(null);
  useEffect(() => {
    if (!soundOn) {
      bgm.stop();
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
      case "conversation":
        track = TRACKS.conversation || track;
        break;
      case "picross":
        track = TRACKS.picross || track;
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
        if (!track) {
          if (previousTrack === TRACKS.picross) {
            await bgm.fadeOutAndStop(300);
          } else if (previousTrack === TRACKS.ending) {
            await bgm.fadeOutAndStop(400);
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
    if (!AUTO_BGM_SCREENS.has(screen)) return;
    if (soundOn) return;
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

  function beginPicrossForNode(nodeId) {
    const normalizedId = normalizeNodeId(nodeId);
    const meta = CHARACTERS[normalizedId];
    if (!meta) return;
    const n = meta.size;

    stopEnemySolver();
    clearSpellEffects();
    setSpellLog([]);
    setActiveSpell(null);
    puzzleSolvedRef.current = false;
    setProjectiles([]);

    const sequence = getRandomPuzzlesForSize(n, PUZZLES_PER_BATTLE);
    const prepared = sequence.length
      ? sequence.map((grid) => cloneSolution(grid))
      : Array.from({ length: PUZZLES_PER_BATTLE }, () => cloneSolution(createFallbackSolution(n)));
    const firstSolution = prepared[0] || cloneSolution(createFallbackSolution(n));

    setLevel(
      n <= 5
        ? "easy"
        : n <= 10
          ? "middle"
          : n <= 15
            ? "high"
            : n <= 20
              ? "hard"
              : "ultra",
    );
    setPuzzleSequence(prepared);
    setPuzzleIndex(0);
    setSolution(firstSolution.map((row) => row.slice()));
    setGrid(emptyGrid(n));
    setEnemyGrid(emptyGrid(n));
    realtimeBonusRef.current = new Set();

    const total = firstSolution.reduce((acc, row) => acc + row.filter(Boolean).length, 0);
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
    enemyProgressRef.current = { filled: 0, total };
    enemyOrderRef.current = { list: [], index: 0 };
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

  const prepareNextPuzzle = useCallback(
    (index) => {
      if (!puzzleSequence.length) return;
      const safeIndex = Math.min(index, puzzleSequence.length - 1);
      const next = puzzleSequence[safeIndex];
      if (!next) return;
      const nextSolution = cloneSolution(next);
      const n = nextSolution.length;
      stopEnemySolver();
      clearSpellEffects();
      puzzleSolvedRef.current = false;
      setProjectiles([]);
      setPuzzleIndex(safeIndex);
      setSolution(nextSolution);
      setGrid(emptyGrid(n));
      setEnemyGrid(emptyGrid(n));
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
      enemySpellStateRef.current = { used: new Set() };
      enemyProgressRef.current = { filled: 0, total };
      enemyOrderRef.current = { list: [], index: 0 };
      ultraPenaltyActiveRef.current = false;
      setStartedAt(Date.now());
      setRemaining(GAME_SECONDS);
      setBgSeed((s) => s + 1);
      spedUpRef.current = false;
    },
    [puzzleSequence, stopEnemySolver, clearSpellEffects],
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

  const scheduleAfterAnimation = useCallback((durationMs, callback) => {
    if (celebrationDelayRef.current) {
      clearTimeout(celebrationDelayRef.current);
    }
    const delay = Math.max(0, durationMs || 0) + 60;
    celebrationDelayRef.current = setTimeout(() => {
      celebrationDelayRef.current = null;
      callback?.();
    }, delay);
  }, []);

  const completePuzzle = useCallback(() => {
    if (puzzleSolvedRef.current) return;
    puzzleSolvedRef.current = true;
    stopEnemySolver();
    cancelCelebration();
    const { durationMs } = battleNode ? awardScore(battleNode, remaining) : { durationMs: 0 };
    const totalNeeded = puzzleSequence.length || PUZZLES_PER_BATTLE;
    const nextIndex = puzzleIndex + 1;
    const nextWins = playerWins + 1;
    const isFinal = nextWins >= totalNeeded;
    scheduleAfterAnimation(durationMs, () => {
      setPlayerWins(nextWins);
      if (isFinal) {
        handleCloseResult(true);
      } else {
        prepareNextPuzzle(nextIndex);
      }
    });
  }, [awardScore, battleNode, cancelCelebration, handleCloseResult, playerWins, prepareNextPuzzle, puzzleIndex, puzzleSequence.length, remaining, scheduleAfterAnimation, stopEnemySolver]);

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
    setActiveSpell(null);
    setPuzzleSequence([]);
    setPuzzleIndex(0);
    setEnemyGrid([]);
    setPaused(false);
    puzzleSolvedRef.current = false;
    setProjectiles([]);
    if (!playerVictory) {
      return;
    }
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
    const totalNeeded = puzzleSequence.length || PUZZLES_PER_BATTLE;
    const nextWins = enemyWins + 1;
    const character = battleNode ? CHARACTERS[battleNode] : null;
    const enemyName = character?.name || "敵";
    logSpell(`${enemyName} がパズルを解いた (${nextWins}/${totalNeeded})`);
    if (nextWins >= totalNeeded) {
      stopEnemySolver();
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
      setPuzzleSequence([]);
      setPuzzleIndex(0);
      setScreen("gameover");
    } else {
      setEnemyWins(nextWins);
      prepareNextPuzzle(nextWins);
    }
  }, [battleNode, enemyWins, puzzleSequence.length, logSpell, showSpellOverlay, stopEnemySolver, cancelCelebration, clearSpellEffects, resetScore, prepareNextPuzzle]);

  const handleHeroCorrectFill = useCallback(
    (row, col, nextGrid) => {
      const config = battleNode ? ENEMY_AI_CONFIG[battleNode] : DEFAULT_ENEMY_CONFIG;
      const heroState = heroStateRef.current;
      heroState.crossStreak = 0;
      heroState.sameLineStreak = 0;
      heroState.correctStreak += 1;

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
    [battleNode, triggerHeroSpell, triggerEnemySpell, solution],
  );

  const handleHeroMistake = useCallback(
    (row, col, meta = {}, nextGrid) => {
      const heroState = heroStateRef.current;
      heroState.correctStreak = 0;
      heroState.chainStreak = 0;
      heroState.lastCorrect = null;
      heroState.crossStreak = 0;
      heroState.blockChain = { type: null, index: null, length: 1 };
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
    [battleNode, setGrid, solution, triggerEnemySpell],
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

  const togglePaused = useCallback(() => {
    setPaused((prev) => {
      const next = !prev;
      if (next) {
        stopEnemySolver();
      } else {
        heroStateRef.current.noMistakeStart = Date.now();
        heroStateRef.current.noMistakeTriggered = false;
      }
      return next;
    });
  }, [stopEnemySolver]);

  useEffect(() => {
    if (!paused) return;
    stopEnemySolver();
  }, [paused, stopEnemySolver]);

  const handleQuitPicross = useCallback(() => {
    cancelCelebration();
    stopEnemySolver();
    clearSpellEffects();
    setPuzzleSequence([]);
    setPuzzleIndex(0);
    setPendingNode(null);
    setBattleNode(null);
    setPlayerWins(0);
    setEnemyWins(0);
    setPaused(false);
    setProjectiles([]);
    setPostClearAction(null);
    setScreen("route");
  }, [cancelCelebration, stopEnemySolver, clearSpellEffects]);

  useEffect(() => {
    setBgSeed((s) => s + 1);
  }, [screen]);

  const prevScreenRef = useRef(screen);
  useEffect(() => {
    const prev = prevScreenRef.current;
    if (prev === "picross" && screen !== "picross") {
      stopEnemySolver();
      clearSpellEffects();
      setSpellLog([]);
      setActiveSpell(null);
      setEnemyGrid([]);
      setPuzzleSequence([]);
      setPuzzleIndex(0);
      setPlayerWins(0);
      setEnemyWins(0);
    }
    prevScreenRef.current = screen;
  }, [screen, stopEnemySolver, clearSpellEffects]);

  useEffect(() => {
    if (screen !== "picross") return;
    if (!battleNode) return;
    if (!solution.length) return;
    if (paused) {
      stopEnemySolver();
      return;
    }
    const config = ENEMY_AI_CONFIG[battleNode] || DEFAULT_ENEMY_CONFIG;
    const coords = [];
    solution.forEach((row, r) =>
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
      setEnemyGrid(emptyGrid(solution.length));
    }
    stopEnemySolver();
    const timer = setInterval(() => {
      const totalNeeded = puzzleSequence.length || PUZZLES_PER_BATTLE;
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
      setEnemyGrid((prev) => {
        if (prev[r]?.[c] === 1) return prev;
        const next = prev.length ? prev.map((row) => row.slice()) : emptyGrid(solution.length);
        next[r][c] = 1;
        return next;
      });
      enemyProgressRef.current.filled += 1;
      if (enemyProgressRef.current.filled >= enemyProgressRef.current.total) {
        stopEnemySolver();
        handleEnemyPuzzleClear();
      }
    }, Math.max(120, config.interval));
    enemySolverRef.current = timer;
    return () => clearInterval(timer);
  }, [screen, battleNode, solution, playerWins, enemyWins, puzzleSequence.length, paused, stopEnemySolver, handleEnemyPuzzleClear]);

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
    if (screen !== "gamestart") {
      setGameStartNameVisible(false);
    }
  }, [screen]);

  const showScore = !["prologue", "opening", "gamestart", "name"].includes(screen);
  const puzzleGoal = puzzleSequence.length || PUZZLES_PER_BATTLE;
  const currentRound = Math.max(playerWins, enemyWins);
  const displayPuzzleStep = Math.min(currentRound + 1, puzzleGoal);
  const totalCells = totalCellsRef.current || 1;
  const playerProgressCount = countCorrectFilled(grid, solution);
  const playerProgressRatio = totalCells ? playerProgressCount / totalCells : 0;
  const enemyProgressRatio = totalCells
    ? Math.min(1, enemyProgressRef.current.filled / totalCells)
    : 0;

  return (
    <div className="app">
      {screen !== "prologue" && (
        <Background
          seed={bgSeed}
          fixedUrl={
            screen === "opening"
              ? "/assets/img/title.png"
              : screen === "ending"
                ? "/assets/img/background/ending.png"
                : screen === "route"
                  ? "/assets/img/background/map.png"
                  : screen === "name" || (screen === "gamestart" && gameStartNameVisible)
                    ? "/assets/img/character/hero/hero_fullbody.png"
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
          {showScore && (
            <ScoreDisplay value={displayScore} animating={scoreAnimating} />
          )}
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
        </nav>
      </header>

      {screen === "prologue" && (
        <Prologue onNext={() => setScreen("opening")} />
      )}

      {screen === "opening" && (
        <Opening
          onStart={async () => {
            try {
              await bgm.resume();
            } catch {}
            setScreen("gamestart");
          }}
          onNewGame={async () => {
            resetProgress();
            localStorage.removeItem("heroName");
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
          }}
        />
      )}

      {screen === "gamestart" && (
        <GameStart
          heroName={heroName}
          onSetName={(n) => {
            setHeroName(n);
            localStorage.setItem("heroName", n);
          }}
          onDone={() => setScreen("route")}
          onNameEntryVisible={setGameStartNameVisible}
        />
      )}

      {screen === "name" && (
        <NameEntry
          initial={heroName}
          onConfirm={(n) => {
            setHeroName(n);
            localStorage.setItem("heroName", n);
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
          onDone={() => beginPicrossForNode(pendingNode)}
          onSkip={() => beginPicrossForNode(pendingNode)}
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
                <div className="battle-score">
                  <span>プレイヤー {playerWins}</span>
                  <span>敵 {enemyWins}</span>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: `${Math.min(1, playerProgressRatio) * 100}%` }}
                  />
                </div>
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
                />
                  {playerAvatar?.src && (
                    <figure className="board-portrait hero">
                      <img src={playerAvatar.src} alt={playerAvatar.alt} />
                    </figure>
                  )}
                </div>
              </div>
              <div className="enemy-panel">
                <div className="board-frame enemy">
                  <EnemyBoard
                    size={size}
                    grid={enemyGrid}
                    hintData={clues}
                    clues={clues}
                  />
                  {enemyAvatar?.src && (
                    <figure className="board-portrait enemy">
                      <img src={enemyAvatar.src} alt={enemyAvatar.alt} />
                    </figure>
                  )}
                </div>
                <div className="progress-track enemy">
                  <div
                    className="progress-fill"
                    style={{ width: `${Math.min(1, enemyProgressRatio) * 100}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="spell-projectiles">
              {projectiles.map((proj) => (
                <span key={proj.id} className={`spell-projectile ${proj.variant}`} />
              ))}
            </div>
            <ul className="spell-log">
            {spellLog.length === 0 && <li>スペルはまだ発動していません。</li>}
            {spellLog.map((entry) => (
              <li key={entry.id}>{entry.message}</li>
            ))}
          </ul>
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
            {activeSpell && (
              <div className="spell-overlay">
                {activeSpell.image && (
                  <img src={activeSpell.image} alt={activeSpell.name} />
                )}
                <div>
                  <div className="spell-name">{activeSpell.name}</div>
                  <div className="spell-desc">{activeSpell.description}</div>
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
          onContinue={handlePicrossClearContinue}
        />
      )}

      {screen === "gameover" && (
        <GameOver
          onContinue={() => {
            if (battleNode) beginPicrossForNode(battleNode);
          }}
          onQuit={() => {
            resetScore();
            setScreen("opening");
          }}
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
