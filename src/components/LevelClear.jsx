import React from "react";

export default function LevelClear({ level, onBackToLevels, onNextLevel }) {
  const nextText =
    level === "easy"
      ? "Next Level: MIDDLE"
      : level === "middle"
        ? "Next Level: HIGH"
        : null;
  return (
    <main className="screen level-clear">
      <h1 className="headline congrats">Congraturations</h1>
      <p className="sub">You cleared all puzzles in {level.toUpperCase()}.</p>
      <div className="actions">
        <button className="ghost" onClick={onBackToLevels}>
          Back to Levels
        </button>
        {(level === "easy" || level === "middle") && (
          <button className="primary" onClick={onNextLevel}>
            {nextText}
          </button>
        )}
      </div>
    </main>
  );
}
