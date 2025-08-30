import React from 'react'

export default function Prologue({ onNext }) {
  const lines = [
    '森深くに隠されたエルフの集落には、',
    '古から伝わる知恵遊び「elfpix」が存在した。',
    'これは、森に宿る精霊の力を象った図形を浮かび上がらせる、',
    'まるでピクロスのような試練。',
    'エルフは、森に迷い込んだ者にこの「elfpix」を課し、',
    '正しく解き明かした者だけが先へ進むことが許すという…。',
  ]
  return (
    <main className="screen prologue">
      <div className="prologue-window">
        {lines.map((t, i) => (
          <p key={i}>{t}</p>
        ))}
        <div className="actions" style={{ marginTop: 12 }}>
          <button className="primary" onClick={onNext}>Next</button>
        </div>
      </div>
    </main>
  )
}

