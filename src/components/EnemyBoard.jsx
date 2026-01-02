import React, { useCallback, useEffect, useMemo, useState } from "react";
import Clues from "./Clues.jsx";

export default function EnemyBoard({
  size,
  grid,
  hintData,
  clues,
  hiddenRowClues = [],
  hiddenColClues = [],
  lockedRowClues = [],
  lockedColClues = [],
  fadedCells = [],
}) {
  const resolvedClues = hintData ?? clues ?? {};
  const rowHints = Array.isArray(resolvedClues.rows) ? resolvedClues.rows : [];
  const colHints = Array.isArray(resolvedClues.cols) ? resolvedClues.cols : [];
  const [cellPx, setCellPx] = useState(36);

  const computeCellSize = useCallback(() => {
    const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
    const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    const columns = vw <= 960 ? 1 : 2;
    const horizontalBudget = vw * (columns === 1 ? 0.8 : 0.38);
    const boardBudget = Math.min(vh * 0.72, horizontalBudget);
    const divisor = size + 8;
    const px = Math.max(20, Math.min(56, Math.floor(boardBudget / divisor)));
    setCellPx(px);
  }, [size]);

  useEffect(() => {
    computeCellSize();
    window.addEventListener("resize", computeCellSize);
    return () => window.removeEventListener("resize", computeCellSize);
  }, [computeCellSize]);

  const maxHints = Math.ceil(size / 2);
  const hintPad = 6;
  const hintPx = cellPx * maxHints + hintPad;
  const wrapStyle = {
    "--cell": `${cellPx}px`,
    "--hint-col-size": `${hintPx}px`,
    "--hint-row-size": `${hintPx}px`,
  };
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

  return (
    <div className={`enemy-board n${size}`} style={wrapStyle}>
      {renderClues}
      <div
        className="grid"
        style={{ gridTemplateColumns: `repeat(${size}, var(--cell))` }}
      >
        {grid.map((row, r) =>
          row.map((cell, c) => {
            const key = `${r}-${c}`;
            const classes = ["cell"];
            if (cell === 1) classes.push("filled");
            if (cell === -1) classes.push("crossed");
            if (cell === 2) classes.push("maybe");
            if (fadedSet.has(key)) classes.push("faded");
            return <div key={key} className={classes.join(" ")} />;
          }),
        )}
      </div>
    </div>
  );
}
