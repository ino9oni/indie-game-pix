import React, { useEffect, useRef, useState } from 'react'

const STRUDEL_SRC = 'https://unpkg.com/@strudel/embed@1.0.2'
let strudelLoadPromise = null

function loadStrudelScript() {
  if (typeof window === 'undefined') return Promise.resolve()
  if (strudelLoadPromise) return strudelLoadPromise
  strudelLoadPromise = new Promise((resolve, reject) => {
    // If already loaded
    if (customElements && customElements.get && customElements.get('strudel-repl')) {
      resolve()
      return
    }
    const s = document.createElement('script')
    s.src = STRUDEL_SRC
    s.async = true
    s.onload = () => resolve()
    s.onerror = (e) => reject(e)
    document.head.appendChild(s)
  })
  return strudelLoadPromise
}

export default function StrudelBackground({ active, code }) {
  const hostRef = useRef(null)
  const nodeRef = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    loadStrudelScript().then(() => setReady(true)).catch(() => {})
  }, [])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    // cleanup helper
    const cleanup = () => {
      if (nodeRef.current && nodeRef.current.parentNode) {
        nodeRef.current.parentNode.removeChild(nodeRef.current)
      }
      nodeRef.current = null
    }

    if (!active || !ready) {
      cleanup()
      return
    }

    try {
      // create hidden editor/player element
      const editor = document.createElement('strudel-repl')
      editor.setAttribute('code', code || '')
      // Attempt to minimize layout
      editor.style.width = '1px'
      editor.style.height = '1px'
      editor.style.opacity = '0'
      editor.style.pointerEvents = 'none'
      host.appendChild(editor)
      nodeRef.current = editor
    } catch {
      // ignore
    }

    return () => cleanup()
  }, [active, code, ready])

  // Hidden host; keep in DOM to allow audio to run
  return <div ref={hostRef} aria-hidden="true" style={{ position: 'fixed', width: 0, height: 0, overflow: 'hidden' }} />
}

