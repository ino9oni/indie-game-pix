import React, { useState } from 'react'
import Clues from './Clues.jsx'
import { toggleCell } from '../game/utils.js'

export default function GameBoard({ size, grid, setGrid, clues }) {
  const [paintMode, setPaintMode] = useState('fill') // 'fill' | 'cross'

  function onCellClick(r, c, e) {
    e.preventDefault()
    const mode = e.type === 'contextmenu' ? 'cross' : paintMode
    setGrid((g) => toggleCell(g, r, c, mode))
  }

  return (
    <div className="board-wrap">
      <div className="board-toolbar">
        <button className={`toggle ${paintMode === 'fill' ? 'active' : ''}`} onClick={() => setPaintMode('fill')}>Fill</button>
        <button className={`toggle ${paintMode === 'cross' ? 'active' : ''}`} onClick={() => setPaintMode('cross')}>Cross</button>
      </div>
      <div className={`board n${size}`}>
        <Clues rows={clues.rows} cols={clues.cols} />
        <div className="grid" style={{ gridTemplateColumns: `repeat(${size}, var(--cell))` }}>
          {grid.map((row, r) =>
            row.map((cell, c) => (
              <div
                key={`${r}-${c}`}
                className={`cell ${cell === 1 ? 'filled' : ''} ${cell === -1 ? 'x' : ''}`}
                onClick={(e) => onCellClick(r, c, e)}
                onContextMenu={(e) => onCellClick(r, c, e)}
              />
            )),
          )}
        </div>
      </div>
    </div>
  )
}

