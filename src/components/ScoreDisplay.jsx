import React from "react";

export default function ScoreDisplay({ value, animating }) {
  const safeValue = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  const padded = safeValue.toString().padStart(6, "0");
  return (
    <div
      className={`score-hud ${animating ? "animating" : ""}`}
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="score-label">Score</span>
      <span className="score-value">{padded}</span>
    </div>
  );
}
