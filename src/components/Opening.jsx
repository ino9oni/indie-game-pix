import React from 'react'

export default function Opening({ onStart, onNewGame }) {
  return (
    <main className="screen opening">
      <div className="opening-hero">
        <h1 className="headline opening-title cute">elfpix</h1>
        <p className="sub">エルフ達と心を通わせるピクロスの旅</p>
      </div>

      <div className="actions">
        <button className="ghost" title="セーブデータをロードします" onClick={onStart}>Continue</button>
        <button className="primary" title="進行状況を消去して新しく開始" onClick={onNewGame}>New Game</button>
      </div>
      <p className="sub note">Tip: サウンドは右上のトグルで切り替えできます。</p>
    </main>
  )
}
