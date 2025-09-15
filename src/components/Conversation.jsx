import React, { useEffect, useMemo, useState } from 'react'

const ENEMY_IMAGES = {
  'elf-practice': '/assets/img/character/enemies/practice/riene_normal.png',
  'elf-easy': '/assets/img/character/enemies/practice/riene_normal.png',
  'elf-middle': '/assets/img/character/enemies/practice/riene_normal.png',
  'elf-hard': '/assets/img/character/enemies/practice/riene_normal.png',
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

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Enter') advance()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [idx])

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
      <div style={{ position: 'relative', width: '100%', minHeight: 300 }}>
        {/* Hero portrait (left). If no specific asset, use a blue placeholder. */}
        <div style={{ position: 'absolute', left: 8, top: 8, width: 200, height: 100, display: 'grid', placeItems: 'center', borderRadius: 12, background: '#1d4ed8' }}>
          <span style={{ fontWeight: 800 }}>{heroName}</span>
        </div>
        {/* Enemy portrait (right). Show at the image's natural size */}
        <div style={{ position: 'absolute', right: 8, top: 8, display: 'grid', placeItems: 'center', borderRadius: 12, background: enemyImg ? 'transparent' : '#dc2626', border: '1px solid #2b2f55' }}>
          {enemyImg ? (
            <img src={enemyImg} alt={enemyName} style={{ display: 'block' }} />
          ) : (
            <span style={{ fontWeight: 800, padding: '12px 16px' }}>{enemyName}</span>
          )}
        </div>

        {/* Dialog window */}
        <div className="dialog-window" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: 0 }}>
          <div style={{ fontWeight: 700, opacity: 0.9, marginBottom: 6 }}>{script[idx]?.speaker}</div>
          <div style={{ fontSize: 18 }}>{script[idx]?.text}</div>
          <div className="sub" style={{ marginTop: 8 }}>(クリック または Enter で進む)</div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="ghost" onClick={(e) => { e.stopPropagation(); onSkip && onSkip() }}>Skip</button>
          </div>
        </div>
      </div>
    </main>
  )
}
