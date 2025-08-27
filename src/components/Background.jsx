import React, { useEffect, useMemo, useState } from 'react'

// Load all images under ./assets/img (png, jpg, jpeg, webp, gif)
// Path is relative to this file (src/components)
const modules = import.meta.glob('../../assets/img/*.{png,jpg,jpeg,webp,gif}', {
  eager: true,
  as: 'url',
})

export default function Background({ seed = 0 }) {
  const urls = useMemo(() => Object.values(modules), [])
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (!urls.length) return
    setIdx((prev) => {
      if (urls.length === 1) return 0
      let r = Math.floor(Math.random() * urls.length)
      if (r === prev) r = (r + 1) % urls.length
      return r
    })
  }, [urls.length, seed])

  if (!urls.length) return null

  return (
    <div
      className="bg-image"
      style={{ backgroundImage: `url(${urls[idx]})` }}
      aria-hidden="true"
    />
  )
}
