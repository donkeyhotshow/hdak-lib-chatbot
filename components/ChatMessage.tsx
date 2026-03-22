'use client'

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
  onChipClick?: (chip: string) => void
}

function BotAvatar() {
  return (
    <div className="av w-[23px] h-[23px] bg-[#1c0f06] flex-shrink-0 mb-[2px] flex items-center justify-center rounded-[5px]" aria-hidden="true">
      <svg width="13" height="10" viewBox="0 0 13 10" fill="none">
        <path d="M6.5 1C6.5 1 4.2.5 2 1L1.5 8.8C3.8 8.3 6 8.8 6.5 8.8L6.5 1Z"
          fill="rgba(184,124,50,.22)" stroke="rgba(184,124,50,.58)" strokeWidth=".6"/>
        <path d="M6.5 1C6.5 1 8.8.5 11 1L11.5 8.8C9.2 8.3 7 8.8 6.5 8.8L6.5 1Z"
          fill="rgba(184,124,50,.16)" stroke="rgba(184,124,50,.46)" strokeWidth=".6"/>
        <line x1="6.5" y1="1" x2="6.5" y2="8.8" stroke="rgba(184,124,50,.8)" strokeWidth=".75"/>
      </svg>
    </div>
  )
}

function UserAvatar() {
  return (
    <div className="uav w-[26px] h-[26px] rounded-full bg-[#1c0f06] flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-[#eedec6]" title="Ви">
      U
    </div>
  )
}

export function ChatMessage({ role, content, isStreaming = false, onChipClick }: ChatMessageProps) {
  const isUser = role === 'user'

  const chipsMatch = content.match(/\[CHIPS:\s*(.*?)\]/)
  const chips = chipsMatch ? chipsMatch[1].split(',').map(s => s.trim()) : []
  const cleanContent = content.replace(/\[CHIPS:\s*.*?\]/, '').trim()

  return (
    <div className={`mg flex flex-col mb-5 group ${isUser ? 'items-end' : 'items-start'}`}>
      <div className={`mr flex items-end gap-2.5 animate-fade-up w-full ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {isUser ? <UserAvatar /> : <BotAvatar />}
        
        <div className={`relative ${isUser ? 'ub' : 'bb'} max-w-[92%] md:max-w-[85%] px-4 py-3 rounded-[18px] text-[14.5px] leading-relaxed break-words shadow-sm
          ${isUser 
            ? 'bg-[#1c0f06] text-[#eedec6]/95 rounded-br-none' 
            : 'bg-white border border-[#170c04]/10 text-[#170c04] rounded-bl-none'
          }`}
        >
          {isUser ? (
            <span className="block whitespace-pre-wrap">
              {cleanContent}
            </span>
          ) : (
            <div className="prose-hdak prose-sm overflow-hidden text-[15px] font-normal text-[#170c04]">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  a: ({ node, ...props }) => (
                    <a {...props} target="_blank" rel="noopener noreferrer" className="text-[#b87c32] hover:underline font-medium" />
                  ),
                }}
              >
                {cleanContent || (isStreaming ? '' : '...')}
              </ReactMarkdown>
              {isStreaming && <span className="cur inline-block w-1.5 h-3.5 bg-[#b87c32] animate-pulse ml-1 align-middle" />}
            </div>
          )}
        </div>
      </div>

      {!isUser && !isStreaming && (
        <div className="acts flex flex-col items-start gap-3 pl-[36px] pt-3 w-full">
          {chips.length > 0 && (
            <div className="flex flex-wrap gap-2.5 mb-1.5 animate-fade-up">
              {chips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => onChipClick?.(chip)}
                  className="h-9 px-5 bg-white border border-[#170c04]/14 rounded-full text-[12.5px] font-medium text-[#1c0f06]/80 hover:border-[#b87c32] hover:text-[#b87c32] hover:bg-white transition-all shadow-sm active:scale-95 flex items-center justify-center leading-none"
                >
                  <span className="translate-y-[0.5px]">{chip}</span>
                </button>
              ))}
            </div>
          )}
          
          <div className="flex items-center gap-4 opacity-40 group-hover:opacity-100 transition-opacity duration-200">
            <button 
              className="text-[11px] text-[#6b4c30] hover:text-[#b87c32] flex items-center gap-1.5 transition-colors"
              onClick={() => navigator.clipboard.writeText(cleanContent)}
            >
               <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M5 2V1h10v10h-1M1 5h10v10H1V5z"/>
               </svg>
               Копіювати
            </button>
            <span className="text-[10px] text-[#c4a882] italic">Відповідь бібліотеки</span>
          </div>
        </div>
      )}
    </div>
  )
}

export function TypingIndicator() {
  return (
    <div className="mg flex flex-col mb-[18px] items-start">
      <div className="mr flex items-end gap-[8px]">
        <BotAvatar />
        <div className="typing flex items-center gap-[3.5px] p-[10px_14px] bg-white border border-[#170c04]/06 rounded-[14px] rounded-bl-[3px] shadow-[0_1px_4px_rgba(23,12,4,0.04)]">
          <div className="td w-[4px] h-[4px] rounded-full bg-[#c4a882] animate-[typing-dot_1.3s_infinite_ease-in-out]" />
          <div className="td w-[4px] h-[4px] rounded-full bg-[#c4a882] animate-[typing-dot_1.3s_infinite_ease-in-out_0.17s]" />
          <div className="td w-[4px] h-[4px] rounded-full bg-[#c4a882] animate-[typing-dot_1.3s_infinite_ease-in-out_0.34s]" />
        </div>
      </div>
    </div>
  )
}
