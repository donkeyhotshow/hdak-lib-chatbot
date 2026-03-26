'use client'

import React, { useState, useCallback } from 'react'
import { Copy, Check, Zap, ExternalLink } from 'lucide-react'

// --- Markdown Rendering Component ---
function formatContent(content: string) {
  return content.split('\n').map((line, i) => (
    <span key={i}>
      {line}
      <br />
    </span>
  ))
}

export function ChatMessage({
  role,
  content,
  timestamp,
  isStreaming,
  onChipClick,
  index = 0
}: {
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
  isStreaming?: boolean
  onChipClick?: (query: string) => void
  index?: number
}) {
  const [copied, setCopied] = useState(false)
  const isUser = role === 'user'

  const handleCopy = useCallback(() => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(content).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    }
  }, [content])

  // Extract chips if present
  let cleanContent = content
  let chips: string[] = []
  if (content.includes('[CHIPS:')) {
    const parts = content.split('[CHIPS:')
    cleanContent = parts[0].trim()
    chips = parts[1].replace(']', '').split(',').map(c => c.trim())
  }

  return (
    <div className="flex w-full flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
      <div className={`flex items-center gap-3 mb-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
        <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#1A1A1A]/30">
          {isUser ? 'Researcher' : 'Core Analysis'}
        </span>
        <div className="w-12 h-[1px] bg-[#D4A373]/30"></div>
      </div>
      
      <div className={`flex gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className={`group relative max-w-[90%] p-6 rounded-lg border transition-all duration-300 ${
          isUser 
            ? 'bg-[#F8F5F2] border-transparent text-[#1A1A1A] font-serif italic shadow-sm' 
            : 'bg-white border-[#1A1A1A]/5 text-[#1A1A1A]/90 leading-relaxed text-[15px] shadow-lg shadow-black/[0.02]'
        }`}>
          <div className="whitespace-pre-wrap leading-7 font-medium">
            {formatContent(cleanContent)}
          </div>
          
          {!isUser && !isStreaming && (
            <>
              <div className="mt-6 pt-4 border-t border-[#1A1A1A]/5 flex items-center justify-between">
                <button 
                  onClick={handleCopy} 
                  className="text-[10px] font-bold uppercase tracking-widest text-[#D4A373] flex items-center gap-2 hover:text-[#B38B61] active:scale-95 transition-all outline-none"
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? 'Скопійовано' : 'Цитувати'}
                </button>
                <div className="flex items-center gap-3 opacity-30 group-hover:opacity-100 transition-opacity">
                   <span className="text-[9px] text-[#1A1A1A] font-mono">NODE_0{index + 1}</span>
                   <Zap size={10} className="text-[#D4A373]" />
                </div>
              </div>

              {chips.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-2">
                  {chips.map((chip, idx) => (
                    <button
                      key={idx}
                      onClick={() => onChipClick?.(chip)}
                      className="px-3 py-1.5 bg-[#D4A373]/5 border border-[#D4A373]/20 rounded-md text-[10px] font-bold uppercase tracking-widest text-[#D4A373] hover:bg-[#D4A373] hover:text-white transition-all active:scale-95"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export function TypingIndicator() {
  return (
    <div className="mt-12 flex flex-col gap-4 animate-in fade-in duration-500">
      <div className="flex items-center gap-4 text-[#D4A373]">
         <div className="flex gap-1">
            <div className="w-1.5 h-1.5 bg-[#D4A373] rounded-full animate-bounce delay-75"></div>
            <div className="w-1.5 h-1.5 bg-[#D4A373] rounded-full animate-bounce delay-150"></div>
            <div className="w-1.5 h-1.5 bg-[#D4A373] rounded-full animate-bounce delay-300"></div>
         </div>
         <span className="text-[10px] font-black uppercase tracking-[0.3em] italic opacity-80">Обробка запиту...</span>
      </div>
    </div>
  )
}
