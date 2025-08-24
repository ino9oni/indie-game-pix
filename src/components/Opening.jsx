import React from 'react'

export default function Opening({ onStart }) {
  return (
    <main className="screen opening">
      <div className="opening-hero">
        <img className="opening-image" src="/title.png" alt="Game Title" onError={(e) => { e.currentTarget.style.display = 'none' }} />
        <h1 className="headline opening-title">Picross Neo</h1>
        <p className="sub">Stylish, colorful nonogram puzzle</p>
      </div>
      <div className="actions">
        <button className="primary" onClick={onStart}>Start Game</button>
      </div>
      <p className="sub note">Tip: Enable sound from the top-right to enjoy BGM/SFX.</p>
    </main>
  )
}

