import React, { useMemo } from "react";

export default function Timer({ total, remaining }) {
  const pct = Math.max(0, Math.min(100, Math.round((remaining / total) * 100)));
  const mm = useMemo(
    () => String(Math.floor(remaining / 60)).padStart(2, "0"),
    [remaining],
  );
  const ss = useMemo(
    () => String(remaining % 60).padStart(2, "0"),
    [remaining],
  );
  return (
    <div className="timer">
      <div className="time">
        {mm}:{ss}
      </div>
      <div
        className="bar"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <div className="fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
