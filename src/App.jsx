import React, { useEffect, useMemo, useRef, useState } from 'react'
import Opening from './components/Opening.jsx'
import Prologue from './components/Prologue.jsx'
import NameEntry from './components/NameEntry.jsx'
import RouteMap from './components/RouteMap.jsx'
import Background from './components/Background.jsx'
import LevelSelect from './components/LevelSelect.jsx'
import PuzzleSelect from './components/PuzzleSelect.jsx'
import GameBoard from './components/GameBoard.jsx'
import Timer from './components/Timer.jsx'
import ResultModal from './components/ResultModal.jsx'
import LevelClear from './components/LevelClear.jsx'
import GameOver from './components/GameOver.jsx'
import { PUZZLES, LEVELS } from './game/puzzles.js'
import { ROUTE, CHARACTERS } from './game/route.js'
import { computeClues, emptyGrid, equalsSolution } from './game/utils.js'
import audio from './audio/AudioManager.js'
import bgm from './audio/BgmPlayer.js'
import { listBgmUrls } from './audio/library.js'

const GAME_SECONDS = 20 * 60 // 20 minutes

export default function App() {
  const [screen, setScreen] = useState('prologue') // 'prologue' | 'opening' | 'gamestart' | 'name' | 'route' | 'picross' | 'result' | 'levelClear' | 'gameover'
  const [level, setLevel] = useState('easy')
  const [puzzleIndex, setPuzzleIndex] = useState(0)
  const [grid, setGrid] = useState([])
  const [startedAt, setStartedAt] = useState(null)
  const [remaining, setRemaining] = useState(GAME_SECONDS)
  const [result, setResult] = useState(null) // { status: 'clear' | 'gameover' }
  const [bgSeed, setBgSeed] = useState(0)
  const [soundOn, setSoundOn] = useState(false)
  const spedUpRef = useRef(false)
  const resumeOnceRef = useRef(false)
  const [heroName, setHeroName] = useState(() => localStorage.getItem('heroName') || '')
  const [currentNode, setCurrentNode] = useState(() => localStorage.getItem('routeNode') || 'start')
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

  function resetProgress() {
    const cleared = Object.fromEntries(LEVELS.map((l) => [l, Array(PUZZLES[l].length).fill(false)]))
    setProgress(cleared)
    try { localStorage.removeItem('picrossProgress') } catch {}
  }

  const solution = useMemo(() => PUZZLES[level][puzzleIndex], [level, puzzleIndex])
  const size = solution.length
  const clues = useMemo(() => computeClues(solution), [solution])

  useEffect(() => {
    if (screen === 'picross') {
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

  // Global BGM control: when Sound is On, play continuously on all screens.
  const chosenTrackRef = useRef(null)
  useEffect(() => {
    if (soundOn) {
      if (!chosenTrackRef.current) {
        const urls = listBgmUrls()
        if (urls.length) {
          const idx = Math.floor(Math.random() * urls.length)
          chosenTrackRef.current = urls[idx]
        }
      }
      const url = chosenTrackRef.current
      if (url) bgm.play(url, 'global')
    } else {
      bgm.stop()
      chosenTrackRef.current = null
    }
  }, [soundOn])

  // Keep playback rate normal
  useEffect(() => { if (soundOn) bgm.setRate(1) }, [screen, soundOn])

  // Resume BGM and SFX on any user gesture (autoplay fix)
  useEffect(() => {
    const handler = async () => {
      if (resumeOnceRef.current) return
      resumeOnceRef.current = true
      try { await audio.enable() } catch {}
      try { await bgm.resume() } catch {}
    }
    window.addEventListener('pointerdown', handler)
    window.addEventListener('keydown', handler)
    return () => {
      window.removeEventListener('pointerdown', handler)
      window.removeEventListener('keydown', handler)
    }
  }, [])

  // No tempo changes; keep marker false
  useEffect(() => { spedUpRef.current = false }, [remaining, screen])

  function beginPicrossForNode(nodeId) {
    const meta = CHARACTERS[nodeId]
    if (!meta) return
    const n = meta.size
    let lvl = 'easy'
    if (n <= 5) lvl = 'easy'
    else if (n <= 10) lvl = 'middle'
    else if (n <= 15) lvl = 'high'
    else lvl = 'high'
    setLevel(lvl)
    setPuzzleIndex(0)
    setGrid(emptyGrid(n))
    setStartedAt(Date.now())
    setRemaining(GAME_SECONDS)
    setResult(null)
    setScreen('picross')
    spedUpRef.current = false
    // bump background seed to rotate background image per state change
    setBgSeed((s) => s + 1)
    // Nudge BGM resume on user gesture
    try { bgm.resume() } catch {}
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
      if (soundOn) { audio.playClearFanfare() }
    } else {
      setResult({ status: 'gameover' })
    }
    setScreen('result')
  }

  function handleCloseResult() {
    // Route flow: on clear, advance to next node; otherwise return to route
    if (result?.status === 'clear') {
      const options = ROUTE.edges.filter((e) => e.from === currentNode)
      const nextId = options.length === 1 ? options[0].to : null
      if (nextId) {
        setCurrentNode(nextId)
        localStorage.setItem('routeNode', nextId)
      }
    }
    setScreen('route')
  }

  // Change background image on every screen change (randomized in component)
  useEffect(() => {
    setBgSeed((s) => s + 1)
  }, [screen])

  return (
    <div className="app">
      <Background seed={bgSeed} />
      <header className="app-header">
        <div className="brand">
          <span className="logo">▦</span>
          <span className="title">elfpix</span>
        </div>
        <nav className="top-actions">
          <button
            className={`ghost bgm ${soundOn ? 'on' : 'off'}`}
            onClick={async () => {
              if (!soundOn) {
                try { await audio.enable() } catch {}
                try { await bgm.resume() } catch {}
                setSoundOn(true)
              } else {
                try { await audio.disable() } catch {}
                try { bgm.stop() } catch {}
                setSoundOn(false)
              }
            }}
          >
            BGM: {soundOn ? 'On' : 'Off'}
          </button>
        </nav>
      </header>

      {screen === 'prologue' && (
        <Prologue onNext={() => setScreen('opening')} />
      )}

      {screen === 'opening' && (
        <Opening
          onStart={async () => { try { await bgm.resume() } catch {} ; setScreen('route') }}
          onNewGame={async () => {
            const ok = window.confirm('本当に削除してもよいですか？')
            if (!ok) return
            resetProgress(); localStorage.removeItem('heroName'); localStorage.removeItem('routeNode'); setCurrentNode('start')
            try { await bgm.resume() } catch {}; setScreen('gamestart')
          }}
        />
      )}

      {screen === 'gamestart' && (
        <div className="screen dialog">
          <div className="dialog-window">
            <p>ここに一人の人間の若き旅人がいた。[Enter]</p>
            <p>その名を…[Enter]</p>
            <div className="actions"><button className="primary" onClick={() => setScreen('name')}>名前を決める</button></div>
          </div>
        </div>
      )}

      {screen === 'name' && (
        <NameEntry
          initial={heroName}
          onConfirm={(n) => { setHeroName(n); localStorage.setItem('heroName', n); setScreen('route') }}
          onCancel={() => setScreen('gamestart')}
        />
      )}

      {screen === 'route' && (
        <RouteMap
          graph={ROUTE}
          current={currentNode}
          onNode={(id) => { if (id === currentNode && CHARACTERS[id]) beginPicrossForNode(id) }}
        />
      )}

      {screen === 'picross' && (
        <div className="game-screen">
          <div className="game-topbar">
            <div className="top-left">
              <Timer total={GAME_SECONDS} remaining={remaining} />
            </div>
            <div className="top-right hud-actions">
              <button className="ghost" onClick={() => setGrid(emptyGrid(size))}>Reset</button>
              <button className="ghost" onClick={() => setScreen('route')}>Quit</button>
              <button className="primary" onClick={handleSubmit}>Submit</button>
            </div>
          </div>
          <div className="game-center">
            <GameBoard size={size} grid={grid} setGrid={setGrid} clues={clues} />
          </div>
        </div>
      )}

      {screen === 'result' && (
        <ResultModal
          status={result?.status}
          onClose={handleCloseResult}
          onRetry={() => setScreen('route')}
          onExit={() => setScreen('gameover')}
        />
      )}

      {screen === 'gameover' && (
        <GameOver onRestart={() => setScreen('opening')} />
      )}
    </div>
  )
}
