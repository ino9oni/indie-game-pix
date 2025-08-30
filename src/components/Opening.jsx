import React, { useMemo } from 'react'
import { extractStoryLines } from '../utils/story.js'

export default function Opening({ onStart, onNewGame }) {
  const story = useMemo(() => extractStoryLines(), [])
  return (
    <main className="screen opening">
      <div className="opening-hero">
        <img className="opening-image" src="/title.png" alt="elfpix title" onError={(e) => { e.currentTarget.style.display = 'none' }} />
        <h1 className="headline opening-title">elfpix</h1>
        <p className="sub">エルフ達と心を通わせるピクロスの旅</p>
      </div>

      <section className="story-scroll" aria-label="Story">
        <div className="story-content">
          {story && story.length > 0 ? (
            story.map((t, i) => <p key={i}>{t}</p>)
          ) : (
            <>
              <p>エルフの森に迷い込んだ主人公</p>
              <p>エルフの森で出会うエルフ達とピクロスを通じて心を通わせていく</p>
              <p>それぞれのエルフから出題されるピクロスをクリアすることで、エルフ達からの信頼を得て、森を統率者する者になれるか今試される</p>
            </>
          )}
        </div>
      </section>

      <div className="actions">
        <button className="ghost" onClick={onStart}>Continue</button>
        <button className="primary" onClick={onNewGame}>New Game</button>
      </div>
      <p className="sub note">Tip: サウンドは右上のトグルで切り替えできます。</p>
    </main>
  )
}
