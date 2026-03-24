'use client'

import React, { useEffect, useState } from 'react'


export function SplashScreen() {
  const [visible, setVisible] = useState(true)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    // Only show once per session
    if (typeof window !== 'undefined' && sessionStorage.getItem('hdak_splash_shown')) {
      setVisible(false)
      return
    }
    const fadeTimer = setTimeout(() => setFading(true), 900)
    const hideTimer = setTimeout(() => {
      setVisible(false)
      sessionStorage.setItem('hdak_splash_shown', '1')
    }, 1400)
    return () => { clearTimeout(fadeTimer); clearTimeout(hideTimer) }
  }, [])

  if (!visible) return null

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 18,
        background: '#f7f4ef',
        opacity: fading ? 0 : 1,
        transition: 'opacity 0.45s cubic-bezier(0.4,0,0.2,1)',
        pointerEvents: fading ? 'none' : 'auto',
      }}
    >
      <div style={{
        animation: 'splash-pop 0.55s cubic-bezier(0.22,1,0.36,1) both',
        textAlign: 'center'
      }}>
        <h1 style={{
          fontFamily: 'var(--font-serif)',
          color: 'var(--gold)',
          fontSize: 48,
          fontWeight: 600,
          lineHeight: 0.85,
          letterSpacing: '-0.02em',
          margin: 0
        }}>
          ХДАК
          <span style={{
            display: 'block',
            fontSize: 16,
            fontFamily: 'var(--font-sans)',
            fontWeight: 300,
            color: 'var(--gold-muted)',
            letterSpacing: '0.15em',
            marginTop: 8,
            textTransform: 'uppercase'
          }}>Concierge</span>
        </h1>
      </div>

      {/* Loading dots */}
      <div style={{
        display: 'flex',
        gap: 5,
        marginTop: 8,
        animation: 'splash-up 0.55s cubic-bezier(0.22,1,0.36,1) 0.2s both',
      }}>
        {[0, 0.18, 0.36].map((delay, i) => (
          <div
            key={i}
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: '#c4a882',
              animation: `typing-dot 1.3s infinite ease-in-out ${delay}s`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes splash-pop {
          from { opacity: 0; transform: scale(0.7); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes splash-up {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  )
}
