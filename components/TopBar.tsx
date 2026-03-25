'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Menu } from 'lucide-react'

export function TopBar({ onToggle, sidebarOpen }: { onToggle: () => void; sidebarOpen?: boolean }) {
  const router = useRouter()
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const showBrand = !sidebarOpen || isMobile

  return (
    <header className="top-bar">
      <button
        className="toggle-sb"
        onClick={onToggle}
        aria-label={sidebarOpen ? 'Закрити меню' : 'Відкрити меню'}
      >
        <Menu size={20} strokeWidth={1.8} />
      </button>

      {showBrand && (
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
      )}

      {/* spacer to center the brand */}
      {!showBrand ? <div style={{ flex: 1 }} /> : <div style={{ width: 40 }} />}
    </header>
  )
}

