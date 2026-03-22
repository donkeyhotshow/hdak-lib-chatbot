'use client'

import React, { useRef, useState, useEffect } from 'react'

interface ChatInputProps {
  onSend: (text: string) => void
  disabled?: boolean
  quickChips?: { label: string; hi?: boolean }[]
}

const DEFAULT_CHIPS = [
  { label: '🔍 Каталог', hi: true },
  { label: 'Записатися', hi: false },
  { label: 'Графік', hi: false },
  { label: 'Контакти', hi: false },
  { label: 'Правила', hi: false },
]

export function ChatInput({ 
  onSend, 
  disabled = false, 
  quickChips = DEFAULT_CHIPS 
}: ChatInputProps) {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = () => {
    if (input.trim() && !disabled) {
      onSend(input.trim())
      setInput('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 112)}px`
    }
  }, [input])

  return (
    <div className="w-full flex flex-col gap-2 animation-fade-up">
      <div className="ibox bg-white border border-[#170c04]/10 rounded-[18px] shadow-sm focus-within:border-[#170c04]/25 focus-within:ring-4 focus-within:ring-[#170c04]/05 transition-all duration-200 overflow-hidden">
        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Запитайте про бібліотеку…"
          disabled={disabled}
          className="block w-full bg-transparent border-none outline-none resize-none font-sans font-light text-[15px] text-[#170c04] leading-relaxed p-[16px_16px_4px] min-h-[52px] max-h-[160px] placeholder:text-[#c4a882] scrollbar-none"
        />
        
        <div className="flex items-center justify-between p-[4px_12px_12px_14px]">
          <div className="flex items-center gap-2 overflow-hidden mr-3">
            <div className="flex gap-2 overflow-x-auto scrollbar-none py-1.5 -ml-1 pl-1">
              {quickChips.map((chip, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (!disabled) {
                      onSend(chip.label.replace('🔍 ', ''))
                    }
                  }}
                  disabled={disabled}
                  className={`flex-shrink-0 h-[28px] px-3.5 bg-white border rounded-full text-[11.5px] font-medium whitespace-nowrap transition-all duration-200 outline-none flex items-center justify-center leading-none
                    ${chip.hi 
                      ? 'border-[#b87c32] text-[#b87c32] bg-[#b87c32]/05 hover:bg-[#b87c32]/12 shadow-[0_1px_2px_rgba(184,124,50,0.1)]' 
                      : 'border-[#170c04]/14 text-[#6b4c30] hover:bg-[#efe9df] hover:border-[#170c04]/25 hover:text-[#1c0f06]'
                    }`}
                >
                  <span className="translate-y-[0.5px]">{chip.label}</span>
                </button>
              ))}
            </div>
          </div>
          
          <button
            onClick={handleSend}
            disabled={disabled || !input.trim()}
            className="w-[36px] h-[36px] flex-shrink-0 flex items-center justify-center bg-[#1c0f06] border-none rounded-xl text-[#f2e2cd] shadow-md hover:bg-[#36190a] active:scale-90 disabled:bg-[#d8cebe] disabled:text-[#9e7d5e] disabled:shadow-none transition-all outline-none"
          >
            <svg width="15" height="15" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 13V1"/><path d="M1 7l6-6 6 6"/>
            </svg>
          </button>
        </div>
      </div>
      
      <div className="text-[10px] text-[#c4a882] text-center opacity-60">
        Enter — надіслати · Shift+Enter — новий рядок
      </div>
    </div>
  )
}
