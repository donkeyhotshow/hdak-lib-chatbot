'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { BookLogo } from './BookLogo'

interface HeaderProps {
  showNewChat?: boolean
}

export function Header({ showNewChat = false }: HeaderProps) {
  const [resourcesOpen, setResourcesOpen] = useState(false)

  return (
    <>
      <header
        className="flex-shrink-0 flex items-center justify-between h-[50px] px-[18px] bg-[#1c0f06] border-b border-[#120804] relative z-20"
        style={{ boxShadow: '0 1px 0 rgba(184,124,50,.1), 0 4px 20px rgba(0,0,0,.25)' }}
      >
        {/* Brand */}
        <Link href="/" className="flex items-center gap-[8px] md:gap-[10px] no-underline group outline-none">
          <BookLogo size="sm" />
          <span
            className="font-serif text-[13px] sm:text-[14.5px] font-medium italic text-[#f2e4cd]/85 tracking-[0.02em] group-hover:text-white/95 transition-colors duration-150"
            style={{ fontFamily: 'var(--fs)' }}
          >
            Бібліотека ХДАК
          </span>
        </Link>

        {/* Navigation */}
        <div className="flex items-center gap-1.5 sm:gap-[4px]">
          <button 
            onClick={() => setResourcesOpen(!resourcesOpen)}
            className={`h-[28px] px-3 bg-transparent border rounded-full text-[11px] sm:text-[11.5px] font-medium tracking-[0.02em] transition-all duration-200 outline-none flex items-center justify-center
              ${resourcesOpen 
                ? 'border-[#b87c32] text-[#dca85a] bg-[#b87c32]/15' 
                : 'border-[#b87c32]/25 text-[#b87c32]/70 hover:border-[#b87c32]/50 hover:text-[#d29e50] hover:bg-[#b87c32]/05'
              }`}
          >
            <span className="translate-y-[0.5px]">Ресурси</span>
          </button>
          
          <div className="hidden xs:block w-[0.5px] h-[14px] bg-white/10 mx-[1px]" />
          
          <button className="h-[28px] px-2.5 bg-transparent border border-white/10 rounded-full text-white/45 text-[10.5px] sm:text-[11px] font-medium hover:text-white/65 transition-all outline-none flex items-center justify-center">
            УКР
          </button>
          
          {showNewChat && (
            <Link
              href="/"
              className="ml-1 h-[28px] px-3 flex items-center gap-1.5 border border-[#b87c32]/35 rounded-full text-[#b87c32] text-[11px] sm:text-[11.5px] font-semibold hover:bg-[#b87c32]/15 transition-all outline-none no-underline shadow-sm"
            >
              <span className="text-[14px] font-bold">+</span>
              <span className="translate-y-[0.5px]">Новий</span>
            </Link>
          )}
        </div>
        
        {/* Decorative line */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-[1px]"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(184,124,50,0.15) 30%, rgba(184,124,50,0.15) 70%, transparent)' }}
        />
      </header>

      {/* Resources Drawer */}
      <div 
        className={`flex-shrink-0 overflow-hidden bg-[#281508] border-b border-[#120804] transition-all duration-[280ms] ease-[cubic-bezier(0.32,0,0.18,1)] relative z-30
          ${resourcesOpen ? 'max-h-[300px]' : 'max-h-0'}`}
      >
        <div className="p-[16px_18px] pb-6">
          <div className="text-[10px] sm:text-[10.5px] font-medium tracking-[0.14em] uppercase text-[#b87c32]/50 mb-4 px-1">Офіційні ресурси</div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2">
            {[
              { name: 'Електронний каталог', host: 'lib-hdak.in.ua', url: 'https://lib-hdak.in.ua/e-catalog.html', icon: '📂' },
              { name: 'Пошук АБІС', host: 'library-service.com.ua', url: 'https://library-service.com.ua:8443/khkhdak/DocumentSearchForm', icon: '🔍' },
              { name: 'Репозитарій ХДАК', host: 'repository.ac.kharkov.ua', url: 'https://repository.ac.kharkov.ua/home', icon: '📖' },
              { name: 'Наукова інформація', host: 'lib-hdak.in.ua', url: 'https://lib-hdak.in.ua/search-scientific-info.html', icon: '🔬' },
              { name: 'Нові надходження', host: 'lib-hdak.in.ua', url: 'https://lib-hdak.in.ua/new-acquisitions.html', icon: '✨' },
              { name: 'Сайт бібліотеки', host: 'lib-hdak.in.ua', url: 'https://lib-hdak.in.ua/', icon: '🏛' },
            ].map((res) => (
              <a 
                key={res.url}
                href={res.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-[7px] p-[7px_9px] bg-white/[0.03] border border-white/[0.055] rounded-[7px] hover:bg-white/[0.07] hover:border-[#b87c32]/20 transition-all outline-none no-underline group"
              >
                <span className="text-[11px] opacity-60 flex-shrink-0">{res.icon}</span>
                <div>
                  <div className="text-[11px] text-[#ebdaca]/60 line-height-[1.25] group-hover:text-[#ebdaca]/90 transition-colors">{res.name}</div>
                  <div className="text-[9px] text-[#c39b64]/25 truncate">{res.host}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
