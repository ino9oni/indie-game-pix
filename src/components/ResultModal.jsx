import React from 'react'

export default function ResultModal({ status, onClose, onRetry }) {
  const clear = status === 'clear'
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2 className={`result-title ${clear ? 'ok' : 'bad'}`}>{clear ? 'Clear!' : 'Game Over'}</h2>
        <div className="actions">
          {!clear && (
            <button className="ghost" onClick={onRetry}>Retry</button>
          )}
          <button className="primary" onClick={onClose}>OK</button>
        </div>
      </div>
    </div>
  )
}

