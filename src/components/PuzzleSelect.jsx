import React from 'react'

export default function PuzzleSelect({ level, puzzles, progress, onBack, onSelect }) {
  return (
    <main className="screen puzzle-select">
      <div className="toolbar">
        <button className="ghost" onClick={onBack}>&larr; Back</button>
        <h2 className="subheadline">{level.toUpperCase()} — Choose a puzzle</h2>
      </div>
      <div className="puzzle-grid">
        {puzzles.map((_, i) => {
          const cleared = progress?.[i]
          return (
            <button key={i} className={`puzzle-card ${cleared ? 'cleared' : ''}`} onClick={() => onSelect(i)}>
              <span className="index">#{i + 1}</span>
              {cleared && <span className="chip">Cleared</span>}
            </button>
          )
        })}
      </div>
    </main>
  )
}

