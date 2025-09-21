import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Opening from "./components/Opening.jsx";
import Prologue from "./components/Prologue.jsx";
import NameEntry from "./components/NameEntry.jsx";
import GameStart from "./components/GameStart.jsx";
import RouteMap from "./components/RouteMap.jsx";
import Conversation from "./components/Conversation.jsx";
import Background from "./components/Background.jsx";
// Level/Puzzle selection removed in route-based flow
import GameBoard from "./components/GameBoard.jsx";
import Timer from "./components/Timer.jsx";
import ResultModal from "./components/ResultModal.jsx";
import LevelClear from "./components/LevelClear.jsx";
import Ending from "./components/Ending.jsx";
import GameOver from "./components/GameOver.jsx";
import ScoreDisplay from "./components/ScoreDisplay.jsx";
import { getRandomPuzzleForSize } from "./game/puzzles.js";
import { ROUTE, CHARACTERS } from "./game/route.js";
import { computeClues, emptyGrid } from "./game/utils.js";
import audio from "./audio/AudioManager.js";
import bgm from "./audio/BgmPlayer.js";
import { listBgmUrls } from "./audio/library.js";

const GAME_SECONDS = 20 * 60; // 20 minutes
const SCORE_BONUS = {
  "elf-practice": 1000,
  "elf-easy": 5000,
  "elf-middle": 10000,
  "elf-hard": 15000,
  "elf-ultra": 20000,
};
const FONT_SIZE_CHOICES = [
  { label: "100%", value: 1 },
  { label: "150%", value: 1.5 },
  { label: "200%", value: 2 },
];

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

export default function App() {
  const [screen, setScreen] = useState("prologue"); // 'prologue' | 'opening' | 'gamestart' | 'name' | 'route' | 'conversation' | 'picross' | 'result' | 'ending' | 'levelClear' | 'gameover'
  const [level, setLevel] = useState("easy"); // internal only
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [grid, setGrid] = useState([]);
  const [solution, setSolution] = useState([]);
  const [startedAt, setStartedAt] = useState(null);
  const [remaining, setRemaining] = useState(GAME_SECONDS);
  const [result, setResult] = useState(null); // { status: 'clear' | 'gameover' }
  const [bgSeed, setBgSeed] = useState(0);
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
  const spedUpRef = useRef(false);
  const resumeOnceRef = useRef(false);
  const [heroName, setHeroName] = useState(
    () => localStorage.getItem("heroName") || "",
  );
  const [currentNode, setCurrentNode] = useState(
    () => localStorage.getItem("routeNode") || "start",
  );
  const [lastNode, setLastNode] = useState(""); // previous node to prevent backtracking
  const [pendingNode, setPendingNode] = useState(null); // target node chosen to battle
  const [battleNode, setBattleNode] = useState(null); // last battle node (for Continue)
  const [cleared, setCleared] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem("clearedNodes") || "[]"));
    } catch {
      return new Set();
    }
  });
  const scoreRef = useRef(score);
  const displayScoreRef = useRef(displayScore);
  const scoreAnimTimerRef = useRef(null);
  const successTimerRef = useRef(null);
  function resetProgress() {
    resetScore();
    setCleared(new Set());
  }

  const size = solution.length;
  const clues = useMemo(() => computeClues(solution), [solution]);

  useEffect(() => {
    if (screen === "picross") {
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
    }
  }, [screen]);

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

  const awardScore = useCallback(
    (nodeId, remainingSeconds) => {
      const bonus = SCORE_BONUS[nodeId] ?? 0;
      const seconds = Math.max(0, Math.floor(remainingSeconds || 0));
      const earned = seconds * 100 + bonus;
      if (earned <= 0) {
        return { earned: 0, durationMs: 0 };
      }
      stopScoreAnimation(displayScoreRef.current);
      const target = scoreRef.current + earned;
      scoreRef.current = target;
      setScore(target);
      setScoreAnimating(true);
      if (typeof audio.startScoreCount === "function") {
        audio.startScoreCount();
      }
      const from = displayScoreRef.current;
      setDisplayScore(from);
      const duration = Math.min(2400, Math.max(900, earned * 4));
      const stepMs = 50;
      const steps = Math.max(1, Math.round(duration / stepMs));
      const durationMs = steps * stepMs;
      let tick = 0;
      scoreAnimTimerRef.current = setInterval(() => {
        tick += 1;
        const progress = Math.min(1, tick / steps);
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = Math.round(from + (target - from) * eased);
        setDisplayScore(value);
        if (tick >= steps) {
          stopScoreAnimation(target);
        }
      }, stepMs);
      return { earned, durationMs };
    },
    [stopScoreAnimation],
  );

  useEffect(() => {
    return () => stopScoreAnimation(scoreRef.current);
  }, [stopScoreAnimation]);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
        successTimerRef.current = null;
      }
    };
  }, []);

  // Global BGM control: when Sound is On, play continuously on all screens.
  const chosenTrackRef = useRef(null);
  useEffect(() => {
    if (soundOn) {
      if (!chosenTrackRef.current) {
        const urls = listBgmUrls();
        if (urls.length) {
          const idx = Math.floor(Math.random() * urls.length);
          chosenTrackRef.current = urls[idx];
        }
      }
      const url = chosenTrackRef.current;
      if (url) bgm.play(url, "global");
    } else {
      bgm.stop();
      chosenTrackRef.current = null;
    }
  }, [soundOn]);

  // Keep playback rate normal
  useEffect(() => {
    if (soundOn) bgm.setRate(1);
  }, [screen, soundOn]);

  // Resume BGM and SFX on any user gesture (autoplay fix)
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

  // No tempo changes; keep marker false
  useEffect(() => {
    spedUpRef.current = false;
  }, [remaining, screen]);

  function beginPicrossForNode(nodeId) {
    const meta = CHARACTERS[nodeId];
    if (!meta) return;
    const n = meta.size;
    // Pick a size-appropriate puzzle with good variety per node/difficulty
    const chosen = getRandomPuzzleForSize(n);
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
    setPuzzleIndex(0);
    const sol =
      chosen ||
      Array.from({ length: n }, (_, r) =>
        Array.from({ length: n }, (_, c) => r === c || r + c === n - 1),
      );
    setSolution(sol);
    setGrid(emptyGrid(n));
    setStartedAt(Date.now());
    setRemaining(GAME_SECONDS);
    setResult(null);
    setBattleNode(nodeId);
    setScreen("picross");
    spedUpRef.current = false;
    // bump background seed to rotate background image per state change
    setBgSeed((s) => s + 1);
    // Nudge BGM resume on user gesture
    try {
      bgm.resume();
    } catch {}
  }

  function enterEnding(nodeId) {
    setPendingNode(null);
    setBattleNode(null);
    const destination = nodeId && ROUTE.nodes[nodeId] ? nodeId : currentNode;
    setLastNode(currentNode);
    setCurrentNode(destination);
    localStorage.setItem("routeNode", destination);
    setScreen("ending");
  }

  function handleEndingComplete() {
    resetScore();
    setPendingNode(null);
    setBattleNode(null);
    setResult(null);
    setLastNode("");
    setCurrentNode("start");
    setScreen("opening");
    setCleared(new Set());
    localStorage.setItem("routeNode", "start");
    localStorage.removeItem("clearedNodes");
  }

  function handleSubmit() {
    const awardIfPossible = () => {
      if (!battleNode) return { earned: 0, durationMs: 0 };
      return awardScore(battleNode, remaining);
    };
    const scheduleSuccessTransition = (durationMs) => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
      const delay = Math.max(0, durationMs || 0) + 60;
      successTimerRef.current = setTimeout(() => {
        successTimerRef.current = null;
        handleCloseResult();
      }, delay);
    };
    const handleSuccess = () => {
      const { durationMs } = awardIfPossible();
      setResult({ status: "clear" });
      scheduleSuccessTransition(durationMs);
    };
    // Debug mode: always clear on submit regardless of grid state
    if (debugMode) {
      handleSuccess();
      return;
    }
    const n = solution.length;
    let ok = true;
    for (let r = 0; r < n && ok; r++) {
      for (let c = 0; c < n; c++) {
        const shouldFill = solution[r][c];
        const isFilled = grid[r][c] === 1;
        if (shouldFill !== isFilled) {
          ok = false;
          break;
        }
      }
    }
    if (ok) {
      handleSuccess();
    } else {
      // Failed -> go directly to Game Over per spec
      setResult({ status: "gameover" });
      resetScore();
      setScreen("gameover");
    }
  }

  function handleCloseResult() {
    // On clear, move to the selected pending node; otherwise just go back to route
    if (result?.status === "clear" && pendingNode) {
      const clearedNode = pendingNode;
      // mark cleared
      setCleared((prev) => {
        const next = new Set(prev);
        next.add(clearedNode);
        localStorage.setItem("clearedNodes", JSON.stringify(Array.from(next)));
        return next;
      });
      if (clearedNode === "elf-ultra") {
        enterEnding(clearedNode);
        return;
      }
      setLastNode(currentNode);
      setCurrentNode(clearedNode);
      localStorage.setItem("routeNode", clearedNode);
      setPendingNode(null);
    }
    setScreen("route");
  }

  // Change background image on every screen change (randomized in component)
  useEffect(() => {
    setBgSeed((s) => s + 1);
  }, [screen]);

  const showScore = !["prologue", "opening", "gamestart", "name"].includes(screen);

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
          debugMode={debugMode}
          onArrive={async (id) => {
            if (soundOn) {
              try {
                await audio.playFootstep();
              } catch {}
            }
            if (CHARACTERS[id]) {
              setPendingNode(id);
              setScreen("conversation");
            } else {
              enterEnding(id);
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
            </div>
            <div className="top-right hud-actions">
              <button
                className="ghost"
                onClick={() => setGrid(emptyGrid(size))}
              >
                Reset
              </button>
              <button className="ghost" onClick={() => setScreen("route")}>
                Quit
              </button>
              <button className="primary" onClick={handleSubmit}>
                Submit
              </button>
            </div>
          </div>
          <div className="game-center">
            <GameBoard
              size={size}
              grid={grid}
              setGrid={setGrid}
              clues={clues}
            />
          </div>
        </div>
      )}

      {screen === "result" && (
        <ResultModal
          status={result?.status}
          onClose={handleCloseResult}
          onRetry={() => setScreen("route")}
          onExit={() => setScreen("gameover")}
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
          onDone={handleEndingComplete}
        />
      )}
    </div>
  );
}
