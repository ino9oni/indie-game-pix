import React, { useEffect, useMemo, useState } from 'react'

const modules = import.meta.glob('../../assets/img/*.{png,jpg,jpeg,webp,gif}', {
  eager: true,
  as: 'url',
})

export default function SideImage({ seed = 0 }) {
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
    <div className="side-image">
      <img src={urls[idx]} alt="Background" />
    </div>
  )
}

