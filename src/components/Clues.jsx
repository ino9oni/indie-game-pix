import React from 'react'

export default function Clues({ rows, cols }) {
  return (
    <div className="clues">
      <div className="corner" />
      <div className="top" style={{ gridTemplateColumns: `repeat(${cols.length}, var(--cell))` }}>
        {cols.map((c, i) => (
          <div className="col-clue" key={i}>
            {c.map((n, j) => (
              <span key={j}>{n}</span>
            ))}
          </div>
        ))}
      </div>
      <div className="left" style={{ gridTemplateRows: `repeat(${rows.length}, var(--cell))` }}>
        {rows.map((r, i) => (
          <div className="row-clue" key={i}>
            {r.map((n, j) => (
              <span key={j}>{n}</span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
