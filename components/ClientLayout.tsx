'use client'

import React, { useState, useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { usePathname } from 'next/navigation'

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    if (window.innerWidth >= 768) setIsOpen(true)
  }, [])

  // Auto-close sidebar on mobile when navigating
  useEffect(() => {
    if (window.innerWidth < 768) setIsOpen(false)
  }, [pathname])

  return (
    <div
      style={{
        display: 'flex',
        height: '100dvh',
        width: '100vw',
        overflow: 'hidden',
      }}
    >
      <Sidebar
        isOpen={isOpen}
        onToggle={() => setIsOpen(v => !v)}
        onClose={() => setIsOpen(false)}
      />
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--cream-bg)',
          overflow: 'hidden',
          height: '100dvh',
          minWidth: 0,
        }}
      >
        <TopBar onToggle={() => setIsOpen(v => !v)} sidebarOpen={isOpen} />
        {children}
      </main>
    </div>
  )
}
