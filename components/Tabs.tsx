'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function Tabs() {
  const pathname = usePathname()
  const isChat = pathname.startsWith('/chat')
  
  return (
    <nav className="flex-shrink-0 flex items-center px-[18px] bg-[#fcfaf7] border-b border-[#170c04]/10 h-[40px] gap-7 relative z-20">
      <Link 
        href="/" 
        className={`text-[12px] font-medium tracking-[0.03em] h-full flex items-center border-b-[1.5px] transition-all duration-200 no-underline
          ${!isChat ? 'border-[#b87c32] text-[#1c0f06]' : 'border-transparent text-[#170c04]/40 hover:text-[#170c04]/60'}`}
      >
        Новий чат
      </Link>
      <div className={`text-[12px] font-medium tracking-[0.03em] h-full flex items-center border-b-[1.5px] transition-all duration-200
          ${isChat ? 'border-[#b87c32] text-[#1c0f06]' : 'border-transparent text-[#170c04]/25'}`}
      >
        Чат
      </div>
      {/* Stream tab hidden — feature not ready */}
    </nav>
  )
}
