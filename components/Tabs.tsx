'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function Tabs() {
  const pathname = usePathname()
  const isChat = pathname.startsWith('/chat')
  
  return (
    <nav className="flex-shrink-0 flex items-center px-[18px] bg-[#fcfaf7] border-b border-[#170c04]/10 h-[42px] gap-8 relative z-20">
      <Link 
        href="/" 
        className={`text-[12.5px] font-medium tracking-[0.02em] h-full flex items-center border-b-2 transition-all duration-300
          ${!isChat ? 'border-[#b87c32] text-[#1c0f06]' : 'border-transparent text-[#170c04]/35 hover:text-[#170c04]/50'}`}
      >
        Новий чат
      </Link>
      <div className={`text-[12.5px] font-medium tracking-[0.02em] h-full flex items-center border-b-2 transition-all duration-300
          ${isChat ? 'border-[#b87c32] text-[#1c0f06]' : 'border-transparent text-[#170c04]/25'}`}
      >
        Чат
      </div>
      <div className="text-[12.5px] font-medium tracking-[0.02em] h-full flex items-center border-b-2 border-transparent text-[#170c04]/15">
        Stream
      </div>
    </nav>
  )
}
