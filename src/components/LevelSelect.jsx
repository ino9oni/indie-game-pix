import React from 'react'

export default function LevelSelect({ levels, progress, onSelect }) {
  return (
    <main className="screen level-select">
      <h1 className="headline">Select Level</h1>
      <div className="level-grid">
        {levels.map((lvl) => {
          const done = (progress[lvl] || []).filter(Boolean).length
          const total = 5
          return (
            <button key={lvl} className="level-card" onClick={() => onSelect(lvl)}>
              <div className={`badge badge-${lvl}`}>{lvl.toUpperCase()}</div>
              <div className="progress">
                {done}/{total} cleared
              </div>
            </button>
          )
        })}
      </div>
    </main>
  )
}

