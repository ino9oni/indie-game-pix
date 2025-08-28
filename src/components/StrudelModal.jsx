import React from 'react'
import audio from '../audio/AudioManager.js'

export default function StrudelModal({ open, onClose, src }) {
  if (!open) return null

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <h2 className="headline" style={{ marginTop: 0 }}>Music (Strudel)</h2>
        <p className="sub" style={{ marginTop: 4 }}>External embedded player from strudel.cc</p>
        <div className="embed">
          <iframe
            src={src}
            title="Strudel Player"
            width="100%"
            height="320"
            style={{ border: 0, width: '100%', height: 320, borderRadius: 8, background: '#0c1226' }}
            allow="autoplay; clipboard-write; fullscreen"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="actions">
          <button className="primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

