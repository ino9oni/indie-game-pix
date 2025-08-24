import React, { useEffect } from 'react'
import audio from '../audio/AudioManager.js'

export default function GameOver({ onRestart }) {
  useEffect(() => {
    audio.stopPlayMusic()
    audio.playGameOver()
  }, [])

  return (
    <main className="screen gameover">
      <h1 className="headline">Game Over</h1>
      <p className="sub">時間切れ、または解答が一致しませんでした。</p>
      <div className="actions">
        <button className="primary" onClick={onRestart}>Back to Title</button>
      </div>
    </main>
  )
}

