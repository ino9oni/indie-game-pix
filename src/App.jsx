import React, { useEffect, useMemo, useRef, useState } from 'react'
import Opening from './components/Opening.jsx'
import Background from './components/Background.jsx'
import LevelSelect from './components/LevelSelect.jsx'
import PuzzleSelect from './components/PuzzleSelect.jsx'
import GameBoard from './components/GameBoard.jsx'
import Timer from './components/Timer.jsx'
import ResultModal from './components/ResultModal.jsx'
import LevelClear from './components/LevelClear.jsx'
import GameOver from './components/GameOver.jsx'
import { PUZZLES, LEVELS } from './game/puzzles.js'
import { computeClues, emptyGrid, equalsSolution } from './game/utils.js'
import audio from './audio/AudioManager.js'

const GAME_SECONDS = 20 * 60 // 20 minutes

export default function App() {
  const [screen, setScreen] = useState('opening') // 'opening' | 'level' | 'puzzle' | 'game' | 'result' | 'levelClear' | 'gameover'
  const [level, setLevel] = useState('easy')
  const [puzzleIndex, setPuzzleIndex] = useState(0)
  const [grid, setGrid] = useState([])
  const [startedAt, setStartedAt] = useState(null)
  const [remaining, setRemaining] = useState(GAME_SECONDS)
  const [result, setResult] = useState(null) // { status: 'clear' | 'gameover' }
  const [bgSeed, setBgSeed] = useState(0)
  const [soundOn, setSoundOn] = useState(false)
  const spedUpRef = useRef(false)
  const [progress, setProgress] = useState(() => {
    const desired = Object.fromEntries(LEVELS.map((l) => [l, Array(PUZZLES[l].length).fill(false)]))
    const saved = localStorage.getItem('picrossProgress')
    if (!saved) return desired
    try {
      const parsed = JSON.parse(saved)
      const normalized = {}
      for (const l of LEVELS) {
        const arr = Array.isArray(parsed?.[l]) ? parsed[l] : []
        const need = PUZZLES[l].length
        normalized[l] = arr.slice(0, need)
        while (normalized[l].length < need) normalized[l].push(false)
      }
      return normalized
    } catch {
      return desired
    }
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

  // Ensure BGM runs only on game screen when sound is enabled
  useEffect(() => {
    if (!soundOn) return
    if (screen === 'game') {
      audio.startPlayMusic()
    } else {
      audio.stopPlayMusic()
    }
    // Cleanup on unmount
    return () => audio.stopPlayMusic()
  }, [screen, soundOn])

  // Speed up BGM when under 3 minutes remaining (only during game)
  useEffect(() => {
    if (screen === 'game') {
      if (!spedUpRef.current && remaining <= 180) {
        audio.setPlayRate(1.5)
        spedUpRef.current = true
      }
    }
  }, [remaining, screen])

  function startGame(selLevel, selIndex) {
    setLevel(selLevel)
    setPuzzleIndex(selIndex)
    setGrid(emptyGrid(PUZZLES[selLevel][selIndex].length))
    setStartedAt(Date.now())
    setRemaining(GAME_SECONDS)
    setResult(null)
    setScreen('game')
    spedUpRef.current = false
    audio.setPlayRate(1)
    if (soundOn) audio.startPlayMusic()
    // bump background seed to rotate background image per play
    setBgSeed((s) => s + 1)
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
      if (soundOn) {
        audio.stopPlayMusic()
        audio.playClearFanfare()
      }
    } else {
      setResult({ status: 'gameover' })
      if (soundOn) {
        audio.stopPlayMusic()
      }
    }
    setScreen('result')
  }

  function handleCloseResult() {
    // If all solved at this level, show level clear
    const total = PUZZLES[level].length
    const solved = progress[level].filter(Boolean).length
    const allSolved = progress[level].every(Boolean) || (result?.status === 'clear' && solved + 1 === total)
    if (allSolved) {
      setScreen('levelClear')
      return
    }
    setScreen('puzzle')
  }

  return (
    <div className="app">
      <Background seed={bgSeed} />
      <header className="app-header">
        <div className="brand">
          <span className="logo">▦</span>
          <span className="title">Picross Neo</span>
        </div>
        <nav className="top-actions">
          <button
            className="ghost"
            onClick={async () => {
              if (!soundOn) {
                await audio.enable()
                audio.playOpening()
                setSoundOn(true)
              } else {
                await audio.disable()
                setSoundOn(false)
              }
            }}
          >
            Sound: {soundOn ? 'On' : 'Off'}
          </button>
          {screen !== 'level' && screen !== 'opening' && (
            <button className="ghost" onClick={() => setScreen('level')}>
              Levels
            </button>
          )}
        </nav>
      </header>

      {screen === 'opening' && (
        <Opening onStart={() => setScreen('level')} />
      )}

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
          <div className="game-topbar">
            <div className="top-left">
              <Timer total={GAME_SECONDS} remaining={remaining} />
            </div>
            <div className="top-right hud-actions">
              <button className="ghost" onClick={() => setGrid(emptyGrid(size))}>Reset</button>
              <button className="primary" onClick={handleSubmit}>Submit</button>
            </div>
          </div>
          <div className="game-center">
            <GameBoard
              size={size}
              grid={grid}
              setGrid={setGrid}
              clues={clues}
            />
          </div>
        </div>
      )}

      {screen === 'result' && (
        <ResultModal
          status={result?.status}
          onClose={handleCloseResult}
          onRetry={() => setScreen('puzzle')}
          onExit={() => setScreen('gameover')}
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

      {screen === 'gameover' && (
        <GameOver onRestart={() => setScreen('opening')} />
      )}
    </div>
  )
}
