import React, { useMemo, useState } from 'react'

const KATA_ROWS = [
  'アイウエオカキクケコサシスセソタチツテトナニヌネノ',
  'ハヒフヘホマミムメモヤユヨラリルレロワヲンー',
]

export default function NameEntry({ initial = '', onCancel, onConfirm }) {
  const [name, setName] = useState(initial)
  const rows = useMemo(() => KATA_ROWS.map((r) => r.split('')), [])

  return (
    <main className="screen name-entry">
      <div className="name-card">
        <div className="display">{name || '　'}</div>
        <div className="grid">
          {rows.map((row, i) => (
            <div className="row" key={i}>
              {row.map((ch, j) => (
                <button key={`${i}-${j}`} className="kana" onClick={() => setName((v) => (v + ch).slice(0, 8))}>{ch}</button>
              ))}
            </div>
          ))}
        </div>
        <div className="actions">
          <button className="ghost" onClick={() => setName((v) => v.slice(0, -1))}>取り消し</button>
          <button className="primary" onClick={() => onConfirm(name || 'ナナシ')}>決定</button>
          {onCancel && <button className="ghost" onClick={onCancel}>戻る</button>}
        </div>
      </div>
    </main>
  )
}

