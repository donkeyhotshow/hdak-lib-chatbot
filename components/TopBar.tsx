'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Menu, BookOpenText } from 'lucide-react'

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
        onClick={() => router.push('/')}
        aria-label="На головну"
        role="button"
        tabIndex={0}
      >
        <div className="brand-svg-container">
          <BookOpenText size={18} strokeWidth={1.5} color="#C08840" />
        </div>
        <div className="brand-text">
          <h2>Бібліотека ХДАК</h2>
          <span>ЧАТ-ПОМІЧНИК</span>
        </div>
      </div>

      <div className="top-bar-spacer" />
    </header>
  )
}


