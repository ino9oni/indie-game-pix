import React, { useEffect, useMemo, useRef, useState } from "react";
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
import GameOver from "./components/GameOver.jsx";
import { getRandomPuzzleForSize } from "./game/puzzles.js";
import { ROUTE, CHARACTERS } from "./game/route.js";
import { computeClues, emptyGrid } from "./game/utils.js";
import audio from "./audio/AudioManager.js";
import bgm from "./audio/BgmPlayer.js";
import { listBgmUrls } from "./audio/library.js";

const GAME_SECONDS = 20 * 60; // 20 minutes

export default function App() {
  const [screen, setScreen] = useState("prologue"); // 'prologue' | 'opening' | 'gamestart' | 'name' | 'route' | 'conversation' | 'picross' | 'result' | 'levelClear' | 'gameover'
  const [level, setLevel] = useState("easy"); // internal only
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [grid, setGrid] = useState([]);
  const [solution, setSolution] = useState([]);
  const [startedAt, setStartedAt] = useState(null);
  const [remaining, setRemaining] = useState(GAME_SECONDS);
  const [result, setResult] = useState(null); // { status: 'clear' | 'gameover' }
  const [bgSeed, setBgSeed] = useState(0);
  const [soundOn, setSoundOn] = useState(false);
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
  function resetProgress() {
    /* no-op for now */
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

  function handleSubmit() {
    // Debug mode: always clear on submit regardless of grid state
    if (debugMode) {
      setResult({ status: "clear" });
      if (soundOn) audio.playClearFanfare();
      setScreen("result");
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
      setResult({ status: "clear" });
      if (soundOn) audio.playClearFanfare();
      setScreen("result");
    } else {
      // Failed -> go directly to Game Over per spec
      setResult({ status: "gameover" });
      setScreen("gameover");
    }
  }

  function handleCloseResult() {
    // On clear, move to the selected pending node; otherwise just go back to route
    if (result?.status === "clear" && pendingNode) {
      // mark cleared
      setCleared((prev) => {
        const next = new Set(prev);
        next.add(pendingNode);
        localStorage.setItem("clearedNodes", JSON.stringify(Array.from(next)));
        return next;
      });
      setLastNode(currentNode);
      setCurrentNode(pendingNode);
      localStorage.setItem("routeNode", pendingNode);
      setPendingNode(null);
    }
    setScreen("route");
  }

  // Change background image on every screen change (randomized in component)
  useEffect(() => {
    setBgSeed((s) => s + 1);
  }, [screen]);

  return (
    <div className="app">
      {screen !== "prologue" && (
        <Background
          seed={bgSeed}
          fixedUrl={screen === "opening" ? "/assets/img/title.png" : null}
        />
      )}
      <header className="app-header">
        <div className="brand">
          <span className="logo">▦</span>
          <span className="title">elfpix</span>
        </div>
        <nav className="top-actions">
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
          onArrive={async (id) => {
            // Only allow neighbor clicks (RouteMap already enforces), set pending and start battle
            setPendingNode(id);
            if (soundOn) {
              try {
                await audio.playFootstep();
              } catch {}
            }
            if (CHARACTERS[id]) setScreen("conversation");
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
          onQuit={() => setScreen("opening")}
        />
      )}
    </div>
  );
}
