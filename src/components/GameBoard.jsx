import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Clues from "./Clues.jsx";
import { toggleCell } from "../game/utils.js";
import audio from "../audio/AudioManager.js";

export default function GameBoard({
  size,
  grid,
  setGrid,
  hintData,
  clues,
  solution,
  onCorrectFill,
  onMistake,
  onCross,
  hiddenRowClues = [],
  hiddenColClues = [],
  lockedRowClues = [],
  lockedColClues = [],
  fadedCells = [],
  disabled = false,
  onGridChange,
  highlightCell = null,
}) {
  const resolvedClues = hintData ?? clues ?? {};
  const rowHints = Array.isArray(resolvedClues.rows) ? resolvedClues.rows : [];
  const colHints = Array.isArray(resolvedClues.cols) ? resolvedClues.cols : [];
  const [cellPx, setCellPx] = useState(null);
  const [effects, setEffects] = useState([]);
  const overlayRef = useRef(null);

  const computeCellSize = useCallback(() => {
    const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
    const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    const columns = vw <= 960 ? 1 : 2;
    const horizontalBudget = vw * (columns === 1 ? 0.8 : 0.38);
    const boardBudget = Math.min(vh * 0.72, horizontalBudget);
    const divisor = size + 8; // account for clue rows/cols + padding
    const px = Math.max(20, Math.min(56, Math.floor(boardBudget / divisor)));
    setCellPx(px);
  }, [size]);

  useEffect(() => {
    computeCellSize();
    window.addEventListener("resize", computeCellSize);
    return () => window.removeEventListener("resize", computeCellSize);
  }, [computeCellSize]);

  function spawnEffect(target) {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const targetRect = target.getBoundingClientRect();
    const overlayRect = overlay.getBoundingClientRect();
    const x = targetRect.left - overlayRect.left + targetRect.width / 2;
    const y = targetRect.top - overlayRect.top + targetRect.height / 2;
    const id = `${Date.now()}-${Math.random()}`;
    const baseCell = cellPx ?? 36;
    const radiusMin = baseCell * 1.0;
    const radiusMax = baseCell * 1.6;
    const sparkCount = 10 + Math.floor(Math.random() * 5); // 10-14 sparks for explosive feel
    const shards = Array.from({ length: sparkCount }, (_, i) => {
      const angle = Math.random() * Math.PI * 2;
      const distance = radiusMin + Math.random() * (radiusMax - radiusMin);
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance;
      const delay = Math.random() * 140;
      const scale = 0.8 + Math.random() * 0.6;
      const duration = 520 + Math.random() * 220;
      return {
        id: `${id}-spark-${i}-${Math.random().toString(36).slice(2, 6)}`,
        dx,
        dy,
        delay,
        scale,
        duration,
      };
    });
    const streakCount = 3 + Math.floor(Math.random() * 3);
    const streaks = Array.from({ length: streakCount }, (_, i) => {
      const angle = Math.random() * Math.PI * 2;
      const distance = radiusMin * 0.6 + Math.random() * (radiusMax * 0.9);
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance;
      const delay = Math.random() * 90;
      const length = baseCell * (0.9 + Math.random() * 0.9);
      const angleDeg = (angle * 180) / Math.PI;
      return {
        id: `${id}-streak-${i}-${Math.random().toString(36).slice(2, 6)}`,
        dx,
        dy,
        delay,
        length,
        angle: angleDeg,
      };
    });
    const shockwaveScale = 1.65 + Math.random() * 0.45;
    const shockwaveMax = shockwaveScale * (1.1 + Math.random() * 0.05);
    setEffects((prev) => [...prev, { id, x, y, shards, streaks, shockwaveScale, shockwaveMax }]);
    setTimeout(() => {
      setEffects((prev) => prev.filter((fx) => fx.id !== id));
    }, 920);
  }

  function onCellClick(r, c, e) {
    e.preventDefault();
    if (disabled) return;
    let mode = "fill";
    if (e.type === "contextmenu" || e.button === 2) mode = "cross";
    if (e.shiftKey) mode = "maybe";
    setGrid((g) => {
      const prevValue = g[r][c];
      const next = toggleCell(g, r, c, mode);
      const shouldFill = solution?.[r]?.[c] ?? false;
      const newValue = next[r]?.[c];

      if (mode === "fill") {
        if (prevValue !== 1 && newValue === 1) {
          if (shouldFill) {
            onCorrectFill?.(r, c, next);
          } else {
            onMistake?.(r, c, { type: "fill" }, next);
          }
        }
        if (prevValue === 1 && newValue !== 1 && shouldFill) {
          onMistake?.(r, c, { type: "unfill" }, next);
        }
      } else if (mode === "cross") {
        onCross?.(r, c, next);
        if (newValue === -1 && shouldFill) {
          onMistake?.(r, c, { type: "cross" }, next);
        }
      }

      onGridChange?.(next);
      return next;
    });
    spawnEffect(e.currentTarget);
    if (disabled) return;
    if (mode === "fill") audio.playFill();
    else audio.playMark();
  }

  const maxHints = Math.ceil(size / 2);
  const hintPad = 6;
  const hintPx = cellPx ? cellPx * maxHints + hintPad : null;
  const wrapStyle = cellPx
    ? {
        "--cell": `${cellPx}px`,
        "--hint-col-size": `${hintPx}px`,
        "--hint-row-size": `${hintPx}px`,
      }
    : undefined;
  const fadedSet = useMemo(() => new Set(fadedCells), [fadedCells]);
  const renderClues = useMemo(
    () => (
      <Clues
        rows={rowHints}
        cols={colHints}
        hiddenRows={hiddenRowClues}
        hiddenCols={hiddenColClues}
        lockedRows={lockedRowClues}
        lockedCols={lockedColClues}
      />
    ),
    [rowHints, colHints, hiddenRowClues, hiddenColClues, lockedRowClues, lockedColClues],
  );

  const cellKey = (r, c) => `${r}-${c}`;

  return (
    <div className="board-wrap" ref={overlayRef} style={wrapStyle}>
      <div className="particle-overlay">
        {effects.map((fx) => (
          <React.Fragment key={fx.id}>
            <span
              className="particle-flare"
              style={{ left: `${fx.x}px`, top: `${fx.y}px` }}
            />
            <span
              className="particle-burst"
              style={{ left: `${fx.x}px`, top: `${fx.y}px` }}
            />
            <span
              className="particle-shockwave"
              style={{
                left: `${fx.x}px`,
                top: `${fx.y}px`,
                "--shockwave-scale": fx.shockwaveScale ?? 1.8,
                "--shockwave-scale-max": fx.shockwaveMax ?? (fx.shockwaveScale ?? 1.8),
              }}
            />
            {fx.streaks?.map((streak) => (
              <span
                key={streak.id}
                className="particle-streak"
                style={{
                  left: `${fx.x}px`,
                  top: `${fx.y}px`,
                  "--dx": `${streak.dx}px`,
                  "--dy": `${streak.dy}px`,
                  "--streak-length": `${streak.length}px`,
                  "--streak-rot": `${streak.angle}deg`,
                  animationDelay: `${streak.delay}ms`,
                }}
              />
            ))}
            {fx.shards?.map((spark) => (
              <span
                key={spark.id}
                className="particle-spark"
                style={{
                  left: `${fx.x}px`,
                  top: `${fx.y}px`,
                  "--dx": `${spark.dx}px`,
                  "--dy": `${spark.dy}px`,
                  "--spark-scale": spark.scale,
                  animationDelay: `${spark.delay}ms`,
                  animationDuration: `${spark.duration}ms`,
                }}
              />
            ))}
          </React.Fragment>
        ))}
      </div>
      <div className={`board n${size}`}>
        {renderClues}
        <div
          className="grid"
          style={{ gridTemplateColumns: `repeat(${size}, var(--cell))` }}
        >
          {grid.map((row, r) =>
            row.map((cell, c) => {
              const isCursor = highlightCell && highlightCell.row === r && highlightCell.col === c;
              return (
                <div
                  key={`${r}-${c}`}
                  className={`cell ${cell === 1 ? "filled" : ""} ${cell === -1 ? "x" : ""} ${cell === 2 ? "maybe" : ""} ${fadedSet.has(cellKey(r, c)) ? "faded" : ""} ${isCursor ? "cursor" : ""}`}
                  onClick={(e) => onCellClick(r, c, e)}
                  onContextMenu={(e) => onCellClick(r, c, e)}
                />
              );
            }),
          )}
        </div>
      </div>
    </div>
  );
}
