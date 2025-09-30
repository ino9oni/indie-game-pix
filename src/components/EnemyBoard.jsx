import React, { useMemo } from "react";
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
}) {
  const resolvedClues = hintData ?? clues ?? {};
  const rowHints = Array.isArray(resolvedClues.rows) ? resolvedClues.rows : [];
  const colHints = Array.isArray(resolvedClues.cols) ? resolvedClues.cols : [];
  const wrapStyle = { "--cell": `${Math.max(22, Math.min(48, Math.floor(520 / (size + 6))))}px` };
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
          row.map((cell, c) => (
            <div
              key={`${r}-${c}`}
              className={`cell ${cell === 1 ? "filled" : ""}`}
            />
          )),
        )}
      </div>
    </div>
  );
}
