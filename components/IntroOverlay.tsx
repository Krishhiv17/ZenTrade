'use client'

import { useEffect, useState } from 'react'

/**
 * Ensō-breath welcome reveal. Plays ONCE per browser session (so it doesn't
 * delay access on every visit), can be skipped instantly, and is skipped
 * entirely for reduced-motion users. Pointer-events are off on the scene, so
 * it never blocks the page revealing beneath it — except the Skip button.
 */
export default function IntroOverlay() {
  const [show, setShow] = useState(true)

  useEffect(() => {
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const seen = sessionStorage.getItem('zt_intro_seen')
    if (prefersReduced || seen) {
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
      <button
        onClick={() => setShow(false)}
        aria-label="Skip intro"
        style={{
          position: 'absolute', top: 20, right: 24, pointerEvents: 'auto',
          background: 'none', border: '1px solid var(--border-strong)', color: 'var(--text-muted)',
          borderRadius: 9999, padding: '5px 13px', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
        }}
      >
        Skip
      </button>
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
