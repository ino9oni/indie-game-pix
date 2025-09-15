import React, { useEffect, useState } from "react";
import Clues from "./Clues.jsx";
import { toggleCell } from "../game/utils.js";
import audio from "../audio/AudioManager.js";

export default function GameBoard({ size, grid, setGrid, clues }) {
  const [paintMode, setPaintMode] = useState("fill"); // 'fill' | 'cross' | 'maybe'
  const [cellPx, setCellPx] = useState(null);

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

  function onCellClick(r, c, e) {
    e.preventDefault();
    let mode = paintMode;
    if (e.type === "contextmenu") mode = "cross";
    if (e.shiftKey) mode = "maybe";
    setGrid((g) => toggleCell(g, r, c, mode));
    if (mode === "fill") audio.playFill();
    else audio.playMark();
  }

  return (
    <div className="board-wrap" style={cellPx ? { ['--cell']: `${cellPx}px` } : undefined}>
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
