import React from 'react'

export default function ResultModal({ status, onClose, onRetry, onExit }) {
  const clear = status === 'clear'
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2 className={`result-title ${clear ? 'ok' : 'bad'}`}>{clear ? 'Mission clear!' : 'クリアー失敗'}</h2>
        <div className="actions">
          {clear ? (
            <button className="primary" onClick={onClose}>OK</button>
          ) : (
            <>
              <button className="ghost" onClick={onRetry}>お題選択に戻る</button>
              <button className="primary" onClick={onExit}>ゲームを終了する</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
