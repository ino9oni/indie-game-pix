import React, { useMemo, useState } from 'react'
import NameEntry from './NameEntry.jsx'

// Simple dialog flow for game start with mid-sequence name entry
export default function GameStart({ heroName, onSetName, onDone }) {
  const [step, setStep] = useState(0)
  const linesBefore = useMemo(() => [
    'ここに一人の人間の若き旅人がいた。',
    'その名を…',
  ], [])
  const linesAfter = useMemo(() => [
    `その名を「${heroName || 'ナナシ'}」といった。`,
    '森の奥に眠る「古代の泉」にたどり着くために、エルフの森へ足を踏み入れようとしていた。',
    'しかし、エルフの守り人たちから「elfpix」の挑戦を突きつけられてしまう。',
    '主人公の知恵と洞察力が、森を抜ける唯一の鍵となる…。',
  ], [heroName])

  // step: 0..linesBefore.length shows dialog, then shows NameEntry, then shows linesAfter
  const showName = step === linesBefore.length
  const doneAfter = step > linesBefore.length + linesAfter.length

  if (doneAfter) return null

  if (showName) {
    return (
      <NameEntry
        initial={heroName}
        onConfirm={(n) => { onSetName(n); setStep((s) => s + 1) }}
        onCancel={() => setStep((s) => Math.max(0, s - 1))}
      />
    )
  }

  // After name entry, continue from the first line of linesAfter
  const allLines = [...linesBefore, ...linesAfter]
  const idx = step > linesBefore.length ? step - 1 : step
  const text = allLines[idx]

  return (
    <main className="screen dialog">
      <div className="dialog-window">
        <p>{text}</p>
        <div className="actions">
          {idx < allLines.length - 1 ? (
            <button className="primary" onClick={() => setStep((s) => s + 1)}>Next</button>
          ) : (
            <button className="primary" onClick={onDone}>Start</button>
          )}
        </div>
      </div>
    </main>
  )
}
