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
    <div className="flex h-screen w-full bg-[#FBFAF9] text-[#111111] font-sans overflow-hidden antialiased selection:bg-[#D4A373]/20">
      <Sidebar
        isOpen={isOpen}
        onToggle={() => setIsOpen(v => !v)}
        onClose={() => setIsOpen(false)}
      />
      
      {/* Main Content - Flex-1 makes it pushable by the Sidebar */}
      <main id="main-content" role="main" aria-label="Основний вміст" className="flex-1 flex flex-col relative h-full min-w-0 transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) overflow-hidden bg-[#FBFAF9]">
        <TopBar onToggle={() => setIsOpen(v => !v)} sidebarOpen={isOpen} />
        {children}
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .font-sans { font-family: var(--font-sans), sans-serif !important; }
        .font-serif { font-family: var(--font-serif), serif !important; }
        
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        
        .cubic-bezier { transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); }
        
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes zoom-in { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
        
        .animate-in {
          animation-duration: 0.6s;
          animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
        }

        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(17, 17, 17, 0.08); border-radius: 10px; }
      `}} />
    </div>
  )
}
