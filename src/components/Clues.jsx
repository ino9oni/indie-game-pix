import React, { useMemo } from "react";

export default function Clues({
  rows,
  cols,
  hiddenRows = [],
  hiddenCols = [],
  lockedRows = [],
  lockedCols = [],
}) {
  const hiddenRowSet = useMemo(() => new Set(hiddenRows), [hiddenRows]);
  const hiddenColSet = useMemo(() => new Set(hiddenCols), [hiddenCols]);
  const lockedRowSet = useMemo(() => new Set(lockedRows), [lockedRows]);
  const lockedColSet = useMemo(() => new Set(lockedCols), [lockedCols]);

  return (
    <div className="clues">
      <div className="corner" />
      <div
        className="top"
        style={{ gridTemplateColumns: `repeat(${cols.length}, var(--cell))` }}
      >
        {cols.map((c, i) => (
          <div
            className={`col-clue ${
              hiddenColSet.has(i)
                ? "clue-hidden"
                : lockedColSet.has(i)
                  ? "clue-locked"
                  : ""
            }`}
            key={i}
          >
            {hiddenColSet.has(i)
              ? null
              : lockedColSet.has(i)
                ? <span>{c.join("")}</span>
                : c.map((n, j) => <span key={j}>{n}</span>)}
          </div>
        ))}
      </div>
      <div
        className="left"
        style={{ gridTemplateRows: `repeat(${rows.length}, var(--cell))` }}
      >
        {rows.map((r, i) => (
          <div
            className={`row-clue ${
              hiddenRowSet.has(i)
                ? "clue-hidden"
                : lockedRowSet.has(i)
                  ? "clue-locked"
                  : ""
            }`}
            key={i}
          >
            {hiddenRowSet.has(i)
              ? null
              : lockedRowSet.has(i)
                ? <span>{r.join("")}</span>
                : r.map((n, j) => <span key={j}>{n}</span>)}
          </div>
        ))}
      </div>
    </div>
  );
}
