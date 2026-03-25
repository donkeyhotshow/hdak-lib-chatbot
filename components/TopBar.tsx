'use client'

import React from 'react'
import { useRouter } from 'next/navigation'

export function TopBar({ onToggle }: { onToggle: () => void }) {
  const router = useRouter()
  return (
    <header className="top-bar">
      <button className="toggle-sb" onClick={onToggle} aria-label="Відкрити меню">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>
      <div 
        className="header-brand" 
        style={{ cursor: 'pointer' }} 
        onClick={() => router.push('/')}
        aria-label="На головну"
        role="button"
        tabIndex={0}
      >
        <h2>Бібліотека ХДАК</h2>
        <span>Чат-помічник</span>
      </div>
      <div style={{ width: 40 }} />
    </header>
  )
}
