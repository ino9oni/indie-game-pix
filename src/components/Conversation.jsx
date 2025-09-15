import React, { useEffect, useMemo, useState } from 'react'

const ENEMY_IMAGES = {
  'elf-practice': '/assets/img/character/enemies/practice/riene_normal.png',
  'elf-easy': '/assets/img/character/enemies/practice/riene_normal.png',
  'elf-middle': '/assets/img/character/enemies/practice/riene_normal.png',
  'elf-hard': '/assets/img/character/enemies/practice/riene_normal.png',
}
const HERO_IMAGES = {
  normal: '/assets/img/character/hero/hero_normal.png',
  angry: '/assets/img/character/hero/hero_angry.png',
}

function buildScript(difficultyId, heroName, enemyName) {
  if (difficultyId === 'elf-practice') {
    return [
      { speaker: heroName, text: 'あなたは…' },
      { speaker: enemyName, text: 'よくここまできたわね、あなたがelfpixに認められるにふさわしいかどうか…私が相手してあげましょう…' },
      { speaker: enemyName, text: 'あなた名前は？' },
      { speaker: heroName, text: `${heroName}と言います。` },
      { speaker: enemyName, text: `${heroName}と言うのね、いい名前ね。覚えておくわ。私は${enemyName}というの。` },
      { speaker: enemyName, text: 'では準備はいい？いくわよ。' },
      { speaker: heroName, text: 'お願いします。' },
    ]
  }
  // placeholders for other difficulties
  return [
    { speaker: enemyName, text: `さあ、始めましょう、${heroName}。` },
    { speaker: heroName, text: '受けて立つ！' },
  ]
}

export default function Conversation({ heroName, enemyName, difficultyId, onDone, onSkip }) {
  const script = useMemo(() => buildScript(difficultyId, heroName, enemyName), [difficultyId, heroName, enemyName])
  const [idx, setIdx] = useState(0)
  const [fadeReady, setFadeReady] = useState(false)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Enter') advance()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [idx])

  useEffect(() => {
    const t = setTimeout(() => setFadeReady(true), 20)
    return () => clearTimeout(t)
  }, [])

  function advance() {
    if (idx + 1 >= script.length) {
      onDone && onDone()
    } else {
      setIdx((i) => i + 1)
    }
  }

  const enemyImg = ENEMY_IMAGES[difficultyId]

  return (
    <main className="screen dialog" onClick={advance}>
      <div style={{ width: '100%' }}>
        {/* Stage: portraits side by side, natural sizes, no overlap with dialog */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, padding: '8px 8px 0' }}>
          {/* Hero portrait (left) */}
          <div style={{ display: 'grid', placeItems: 'center' }}>
            <div style={{ background: '#1e3a8a', border: '3px solid #d1b464', borderRadius: 12, padding: 4 }}>
              <img src={HERO_IMAGES.normal} alt={heroName || '主人公'} style={{ display: 'block', opacity: fadeReady ? 1 : 0, transition: 'opacity 400ms ease' }} />
            </div>
            <div style={{ textAlign: 'center', fontWeight: 800, marginTop: 4 }}>{heroName}</div>
          </div>

          {/* Enemy portrait (right) */}
          <div style={{ display: 'grid', placeItems: 'center' }}>
            <div style={{ background: '#1e3a8a', border: enemyImg ? '3px solid #d1b464' : '1px solid #2b2f55', borderRadius: 12, padding: enemyImg ? 4 : 0 }}>
              {enemyImg ? (
                <img src={enemyImg} alt={enemyName} style={{ display: 'block', opacity: fadeReady ? 1 : 0, transition: 'opacity 400ms ease' }} />
              ) : (
                <div style={{ background: '#dc2626', borderRadius: 12, padding: '12px 16px', fontWeight: 800 }}>{enemyName}</div>
              )}
            </div>
            <div style={{ textAlign: 'center', fontWeight: 800, marginTop: 4 }}>{enemyName}</div>
          </div>
        </div>

        {/* Dialog window below stage */}
        <div className="dialog-window" style={{ margin: '12px auto 0' }}>
          <div style={{ fontWeight: 700, opacity: 0.9, marginBottom: 6 }}>{script[idx]?.speaker}</div>
          <div style={{ fontSize: 18 }}>{script[idx]?.text}</div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8, gap: 8 }}>
            <button className="primary" onClick={(e) => { e.stopPropagation(); advance() }}>Next</button>
            <button className="ghost" onClick={(e) => { e.stopPropagation(); setIdx(script.length - 1) }}>Skip</button>
          </div>
        </div>
      </div>
    </main>
  )
}
