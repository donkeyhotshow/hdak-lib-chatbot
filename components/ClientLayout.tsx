'use client'

import React, { useState, useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { usePathname } from 'next/navigation'

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    if (window.innerWidth > 800) {
      setIsOpen(true)
    }
  }, [])

  // Auto-close sidebar on mobile when navigating
  useEffect(() => {
    if (window.innerWidth <= 800) {
      setIsOpen(false)
    }
  }, [pathname])

  const handleClose = () => {
    if (window.innerWidth <= 800) setIsOpen(false)
  }

  return (
    <div className={`app-wrapper ${!isOpen ? 'sidebar-collapsed' : ''}`}>
      <Sidebar onClose={handleClose} />
      <main className="main-content">
        <TopBar onToggle={() => setIsOpen(!isOpen)} />
        {children}
      </main>
    </div>
  )
}
