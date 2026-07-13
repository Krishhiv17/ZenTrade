'use client'

import { useEffect, useState } from 'react'

/**
 * Ensō-breath welcome reveal. Plays once per browser session, then unmounts.
 * Skips entirely for users who prefer reduced motion. Pointer-events are off,
 * so it never blocks interaction with the page revealing beneath it.
 */
export default function IntroOverlay() {
  const [show, setShow] = useState(true)

  useEffect(() => {
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const alreadySeen = sessionStorage.getItem('zt_intro_seen')

    if (prefersReduced || alreadySeen) {
      setShow(false)
      return
    }

    sessionStorage.setItem('zt_intro_seen', '1')
    const t = setTimeout(() => setShow(false), 3000) // matches CSS: 2.1s hold + 0.9s out
    return () => clearTimeout(t)
  }, [])

  if (!show) return null

  return (
    <div className="intro-overlay" aria-hidden="true">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 30 }}>
        <div className="intro-stage">
          <span className="intro-ripple" />
          <span className="intro-ripple" style={{ animationDelay: '0.5s' }} />
          <span className="intro-ripple" style={{ animationDelay: '1s' }} />
          <span className="intro-dot" />
          <svg className="intro-enso" viewBox="0 0 130 130">
            <circle cx="65" cy="65" r="54" />
          </svg>
        </div>
        <div className="intro-word">ZenTrade</div>
      </div>
    </div>
  )
}
