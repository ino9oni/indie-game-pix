import React, { useMemo, useState } from 'react'

// Layout based on GAMEDESIGN.md blocks (4 x 5x5), with control row
const BLOCKS = [
  [
    'アイウエオ',
    'カキクケコ',
    'サシスセソ',
    'タチツテト',
    'ナニヌネノ',
  ],
  [
    'ハヒフヘホ',
    'マミムメモ',
    'ヤ　ユ　ヨ',
    'ワ　　　ヲ',
    'ン　　　ー',
  ],
  [
    'ァィゥェォ',
    'ヵヶッャュ',
    'ョヮ０１２',
    '３４５６７',
    '８９！＃＄',
  ],
  [
    '％＆（）＠',
    '　　　　　',
    '　　　　　',
    '　　　　　',
    '　　　　　',
  ],
]

export default function NameEntry({ initial = '', onCancel, onConfirm }) {
  const [name, setName] = useState(initial)
  const [caret, setCaret] = useState(initial.length)
  const blocks = useMemo(() => BLOCKS.map((rows) => rows.map((r) => r.split(''))), [])
  const maxLen = 8

  const insert = (ch) => {
    if (!ch || ch === ' ') return
    setName((v) => {
      if (v.length >= maxLen) return v
      const left = v.slice(0, caret)
      const right = v.slice(caret)
      const nv = left + ch + right
      setCaret(caret + ch.length)
      return nv
    })
  }
  const backspace = () => {
    if (caret <= 0) return
    setName((v) => {
      const left = v.slice(0, caret)
      const right = v.slice(caret)
      const nv = left.slice(0, -1) + right
      setCaret((c) => Math.max(0, c - 1))
      return nv
    })
  }

  return (
    <main className="screen name-entry">
      <div className="name-card">
        <div className="display">
          {name.slice(0, caret)}
          <span style={{ color: '#f59e0b' }}>|</span>
          {name.slice(caret)}
          {!name && '　'}
        </div>
        <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {blocks.map((rows, bi) => (
            <div key={bi} style={{ display: 'grid', gridTemplateRows: 'repeat(5, auto)', gap: 6 }}>
              {rows.map((row, ri) => (
                <div className="row" key={ri}>
                  {row.map((ch, ci) => (
                    <button
                      key={`${bi}-${ri}-${ci}`}
                      className="kana"
                      onClick={() => insert(ch.trim() === '' ? null : ch)}
                    >
                      {ch}
                    </button>
                  ))}
                </div>
              ))}
              {bi === 0 && (
                <div className="row" style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button className="kana" onClick={backspace}>一文字削除</button>
                  <button className="kana" onClick={() => setCaret((c) => Math.max(0, c - 1))}>←</button>
                  <button className="kana" onClick={() => setCaret((c) => Math.min(name.length, c + 1))}>→</button>
                  <button className="kana" onClick={() => onConfirm(name || 'ナナシ')}>決定</button>
                  {onCancel && <button className="kana" onClick={onCancel}>戻る</button>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
