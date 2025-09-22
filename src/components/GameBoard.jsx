import React, { useEffect, useRef, useState } from "react";
import Clues from "./Clues.jsx";
import { toggleCell } from "../game/utils.js";
import audio from "../audio/AudioManager.js";

export default function GameBoard({ size, grid, setGrid, clues }) {
  const [paintMode, setPaintMode] = useState("fill"); // 'fill' | 'cross' | 'maybe'
  const [cellPx, setCellPx] = useState(null);
  const [effects, setEffects] = useState([]);
  const overlayRef = useRef(null);

  useEffect(() => {
    function compute() {
      const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
      // budget roughly 72% of viewport height for the board including clues and padding
      const budget = vh * 0.72;
      const divisor = size + 8; // account for clue rows/cols + padding
      const px = Math.max(22, Math.min(56, Math.floor(budget / divisor)));
      setCellPx(px);
    }
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [size]);

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
    let mode = paintMode;
    if (e.type === "contextmenu") mode = "cross";
    if (e.shiftKey) mode = "maybe";
    setGrid((g) => toggleCell(g, r, c, mode));
    spawnEffect(e.currentTarget);
    if (mode === "fill") audio.playFill();
    else audio.playMark();
  }

  const wrapStyle = cellPx ? { "--cell": `${cellPx}px` } : undefined;

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
      <div className="board-toolbar">
        <button
          className={`toggle ${paintMode === "fill" ? "active" : ""}`}
          onClick={() => setPaintMode("fill")}
        >
          Fill
        </button>
        <button
          className={`toggle ${paintMode === "cross" ? "active" : ""}`}
          onClick={() => setPaintMode("cross")}
        >
          Cross
        </button>
        <button
          className={`toggle ${paintMode === "maybe" ? "active" : ""}`}
          onClick={() => setPaintMode("maybe")}
        >
          Maybe
        </button>
      </div>
      <div className={`board n${size}`}>
        <Clues rows={clues.rows} cols={clues.cols} />
        <div
          className="grid"
          style={{ gridTemplateColumns: `repeat(${size}, var(--cell))` }}
        >
          {grid.map((row, r) =>
            row.map((cell, c) => (
              <div
                key={`${r}-${c}`}
                className={`cell ${cell === 1 ? "filled" : ""} ${cell === -1 ? "x" : ""} ${cell === 2 ? "maybe" : ""}`}
                onClick={(e) => onCellClick(r, c, e)}
                onContextMenu={(e) => onCellClick(r, c, e)}
              />
            )),
          )}
        </div>
      </div>
    </div>
  );
}
