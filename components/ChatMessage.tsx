'use client'

import React, { useState, useCallback, memo } from 'react'
import { Copy, Check, Zap, ExternalLink, Library } from 'lucide-react'

// --- Markdown/Formatting Component ---
const FormattedText = memo(({ content }: { content: string }) => {
  const lines = content.split('\n');
  return (
    <div className="space-y-3 antialiased">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />;
        // Specific formatting for bold and info markers
        const parts = line.split(/(\*\*.*?\*\*|ℹ️.*|🔗.*)/g);
        return (
          <p key={i} className="leading-relaxed text-[15px] text-[#3d342d] font-[400]">
            {parts.map((part, j) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return (
                  <span key={j} className="bg-[#f3ece4]/60 px-1.5 py-0.5 rounded text-[14px] font-bold text-[#1a130f] border border-[#e5dcd3] mx-0.5">
                    {part.slice(2, -2)}
                  </span>
                );
              }
              if (part.startsWith('ℹ️')) {
                return <span key={j} className="text-[#b87830] text-[14px] font-medium block mt-1.5 opacity-90">{part}</span>;
              }
              if (part.startsWith('🔗')) {
                return <span key={j} className="text-[#b87830] font-semibold underline decoration-dotted underline-offset-4 cursor-pointer hover:opacity-70 transition-opacity">{part}</span>;
              }
              return part;
            })}
          </p>
        );
      })}
    </div>
  );
};

export const ChatMessage = memo(function ChatMessage({
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
    <div className={`flex flex-col mb-12 ${isUser ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-3 duration-500`}>
      <div className={`flex items-center gap-4 mb-3 px-1 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        <span className="text-[10px] font-bold uppercase tracking-[0.35em] text-[#1a130f]/30">
          {isUser ? 'Дослідник' : 'Бібліотека ХДАК'}
        </span>
        <div className="w-8 h-[1px] bg-[#b87830]/40 outline-none border-none"></div>
      </div>

      <div className={`flex gap-5 max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {!isUser && (
          <div className="w-10 h-10 rounded-xl bg-[#1a130f] flex items-center justify-center flex-shrink-0 mt-1 shadow-lg border border-white/5 transition-transform hover:scale-105">
            <Library size={18} className="text-[#b87830]" />
          </div>
        )}
        <div className={`
          relative px-8 py-6 rounded-[24px] text-[15px] shadow-[0_4px_24px_rgba(0,0,0,0.04)] transition-all duration-300
          ${isUser 
            ? 'bg-[#1a130f] text-[#f7eee3] rounded-tr-none font-medium tracking-tight px-10 border border-white/5' 
            : 'bg-white border border-black/[0.03] text-[#1a130f] rounded-tl-none hover:shadow-2xl hover:shadow-black/[0.05]'
          }
        `}>
          {isUser ? (
            <span className="leading-relaxed">{cleanContent}</span>
          ) : (
            <div className="space-y-4">
              <FormattedText content={cleanContent} />
              
              {!isStreaming && (
                <div className="mt-5 pt-4 border-t border-black/[0.03] flex items-center justify-between">
                  <button 
                    onClick={handleCopy}
                    className="group/btn text-[10px] font-black uppercase tracking-[2px] text-[#b87830] hover:text-[#8a5a24] transition-all flex items-center gap-2"
                  >
                    <div className="p-1.5 rounded-md bg-[#b87830]/5 group-hover/btn:bg-[#b87830]/10 transition-colors">
                      {copied ? <Check size={12} /> : <Copy size={12} />}
                    </div>
                    {copied ? 'Цитовано' : 'Цитувати'}
                  </button>
                  <div className="flex items-center gap-2 px-2 py-1 rounded bg-black/[0.02] opacity-20 hover:opacity-100 transition-opacity">
                    <span className="text-[9px] font-black tracking-widest">NODE_0{index + 1}</span>
                    <Zap size={10} className="text-[#b87830]" />
                  </div>
                </div>
              )}
            </div>
          )}
          
          {isStreaming && (
            <div className="flex gap-1.5 mt-4 px-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#b87830] animate-pulse" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#b87830] animate-pulse [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#b87830] animate-pulse [animation-delay:0.4s]" />
            </div>
          )}
        </div>
      </div>

      {!isUser && !isStreaming && chips.length > 0 && (
        <div className="ml-13 mt-4 flex flex-wrap gap-2 animate-in fade-in slide-in-from-left-2 duration-500 delay-200">
          {chips.map((chip, idx) => (
            <button 
              key={idx}
              onClick={() => onChipClick?.(chip)}
              className="px-4 py-2 rounded-xl bg-white border border-black/[0.06] text-[12px] font-bold text-[#665d55] hover:bg-[#b87830] hover:text-white hover:border-[#b87830] transition-all duration-300 active:scale-95 shadow-sm hover:shadow-md"
            >
              {chip}
            </button>
          ))}
        </div>
      )}
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
