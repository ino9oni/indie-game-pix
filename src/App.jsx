import React, { useEffect, useMemo, useState } from 'react'
import LevelSelect from './components/LevelSelect.jsx'
import PuzzleSelect from './components/PuzzleSelect.jsx'
import GameBoard from './components/GameBoard.jsx'
import Timer from './components/Timer.jsx'
import ResultModal from './components/ResultModal.jsx'
import LevelClear from './components/LevelClear.jsx'
import { PUZZLES, LEVELS } from './game/puzzles.js'
import { computeClues, emptyGrid, equalsSolution } from './game/utils.js'

const GAME_SECONDS = 20 * 60 // 20 minutes

export default function App() {
  const [screen, setScreen] = useState('level') // 'level' | 'puzzle' | 'game' | 'result' | 'levelClear'
  const [level, setLevel] = useState('easy')
  const [puzzleIndex, setPuzzleIndex] = useState(0)
  const [grid, setGrid] = useState([])
  const [startedAt, setStartedAt] = useState(null)
  const [remaining, setRemaining] = useState(GAME_SECONDS)
  const [result, setResult] = useState(null) // { status: 'clear' | 'gameover' }
  const [progress, setProgress] = useState(() => {
    const saved = localStorage.getItem('picrossProgress')
    if (saved) return JSON.parse(saved)
    return { easy: [false, false, false, false, false], middle: [false, false, false, false, false], high: [false, false, false, false, false] }
  })

  useEffect(() => {
    localStorage.setItem('picrossProgress', JSON.stringify(progress))
  }, [progress])

  const solution = useMemo(() => PUZZLES[level][puzzleIndex], [level, puzzleIndex])
  const size = solution.length
  const clues = useMemo(() => computeClues(solution), [solution])

  useEffect(() => {
    if (screen === 'game') {
      const id = setInterval(() => {
        setRemaining((r) => {
          const nr = Math.max(0, r - 1)
          if (nr === 0) {
            clearInterval(id)
            handleSubmit()
          }
          return nr
        })
      }, 1000)
      return () => clearInterval(id)
    }
  }, [screen])

  function startGame(selLevel, selIndex) {
    setLevel(selLevel)
    setPuzzleIndex(selIndex)
    setGrid(emptyGrid(PUZZLES[selLevel][selIndex].length))
    setStartedAt(Date.now())
    setRemaining(GAME_SECONDS)
    setResult(null)
    setScreen('game')
  }

  function handleSubmit() {
    const ok = equalsSolution(grid, solution)
    if (ok) {
      // mark progress
      setProgress((p) => {
        const next = { ...p, [level]: [...p[level]] }
        next[level][puzzleIndex] = true
        return next
      })
      setResult({ status: 'clear' })
    } else {
      setResult({ status: 'gameover' })
    }
    setScreen('result')
  }

  function handleCloseResult() {
    // If all solved at this level, show level clear
    const allSolved = progress[level].every(Boolean) || (result?.status === 'clear' && progress[level].filter(Boolean).length + 1 === 5)
    if (allSolved) {
      setScreen('levelClear')
      return
    }
    setScreen('puzzle')
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="logo">▦</span>
          <span className="title">Picross Neo</span>
        </div>
        <nav className="top-actions">
          {screen !== 'level' && (
            <button className="ghost" onClick={() => setScreen('level')}>
              Levels
            </button>
          )}
        </nav>
      </header>

      {screen === 'level' && (
        <LevelSelect
          levels={LEVELS}
          progress={progress}
          onSelect={(lvl) => {
            setLevel(lvl)
            setScreen('puzzle')
          }}
        />
      )}

      {screen === 'puzzle' && (
        <PuzzleSelect
          level={level}
          puzzles={PUZZLES[level]}
          progress={progress[level]}
          onBack={() => setScreen('level')}
          onSelect={(i) => startGame(level, i)}
        />
      )}

      {screen === 'game' && (
        <div className="game-screen">
          <div className="hud">
            <Timer total={GAME_SECONDS} remaining={remaining} />
            <div className="hud-actions">
              <button className="ghost" onClick={() => setGrid(emptyGrid(size))}>Reset</button>
              <button className="primary" onClick={handleSubmit}>Submit</button>
            </div>
          </div>
          <GameBoard
            size={size}
            grid={grid}
            setGrid={setGrid}
            clues={clues}
          />
        </div>
      )}

      {screen === 'result' && (
        <ResultModal
          status={result?.status}
          onClose={handleCloseResult}
          onRetry={() => startGame(level, puzzleIndex)}
        />
      )}

      {screen === 'levelClear' && (
        <LevelClear
          level={level}
          onBackToLevels={() => setScreen('level')}
          onNextLevel={() => {
            const idx = LEVELS.indexOf(level)
            const nextLevel = LEVELS[idx + 1]
            if (nextLevel) {
              setLevel(nextLevel)
              setScreen('puzzle')
            } else {
              setScreen('level')
            }
          }}
        />
      )}
    </div>
  )
}

