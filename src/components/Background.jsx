import React, { useEffect, useMemo, useState } from 'react'

// Load all images under ./assets/img (png, jpg, jpeg, webp, gif)
// Path is relative to this file (src/components)
const modules = import.meta.glob('../../assets/img/*.{png,jpg,jpeg,webp,gif}', {
  eager: true,
  as: 'url',
})

export default function Background() {
  const urls = useMemo(() => Object.values(modules), [])
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (!urls.length) return
    const key = 'picrossBgIdx'
    const saved = localStorage.getItem(key)
    if (saved != null) {
      const n = parseInt(saved, 10)
      if (!Number.isNaN(n)) {
        setIdx(n % urls.length)
        return
      }
    }
    const rand = Math.floor(Math.random() * urls.length)
    setIdx(rand)
    localStorage.setItem(key, String(rand))
  }, [urls.length])

  if (!urls.length) return null

  return (
    <div
      className="bg-image"
      style={{ backgroundImage: `url(${urls[idx]})` }}
      aria-hidden="true"
    />
  )
}

