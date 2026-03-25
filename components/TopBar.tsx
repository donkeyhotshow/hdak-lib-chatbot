'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Menu } from 'lucide-react'

export function TopBar({ onToggle, sidebarOpen }: { onToggle: () => void; sidebarOpen?: boolean }) {
  const router = useRouter()

  return (
    <header className={`top-bar ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <button
        className="toggle-sb"
        onClick={onToggle}
        aria-label={sidebarOpen ? 'Закрити меню' : 'Відкрити меню'}
      >
        <Menu size={20} strokeWidth={1.8} />
      </button>

      <div
        className="header-brand"
        style={{ cursor: 'pointer' }}
        onClick={() => router.push('/')}
        aria-label="На головну"
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && router.push('/')}
      >
        <h2>Бібліотека ХДАК</h2>
        <span>Чат-помічник</span>
      </div>

      <div className="top-bar-spacer" />
    </header>
  )
}


