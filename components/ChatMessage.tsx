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
    <div className="av w-[26px] h-[26px] bg-[#1c0f06] flex-shrink-0 mb-[2px] flex items-center justify-center rounded-[7px]" aria-hidden="true">
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
    <div className="uav w-[26px] h-[26px] rounded-full bg-[#382010] flex-shrink-0 flex items-center justify-center" title="Ви">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(238,222,198,0.7)" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="8" r="4"/>
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
      </svg>
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
        
        <div className={`relative max-w-[88%] md:max-w-[80%] px-4 py-3 rounded-[18px] text-[14.5px] leading-relaxed break-words
          ${isUser 
            ? 'bg-[#1c0f06] text-[#eedec6]/95 rounded-br-[5px] shadow-sm' 
            : 'bg-white border border-[#170c04]/10 text-[#170c04] rounded-bl-[5px] shadow-[0_1px_6px_rgba(23,12,4,0.06)]'
          }`}
        >
          {isUser ? (
            <span className="block whitespace-pre-wrap">
              {cleanContent}
            </span>
          ) : (
            <div className="prose-hdak overflow-hidden">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  a: ({ node, ...props }) => (
                    <a {...props} target="_blank" rel="noopener noreferrer" className="text-[#b87c32] hover:underline font-medium" />
                  ),
                }}
              >
                {cleanContent || (isStreaming ? '' : '…')}
              </ReactMarkdown>
              {isStreaming && <span className="cur inline-block w-[3px] h-[15px] bg-[#b87c32] animate-pulse ml-1 align-middle rounded-sm" />}
            </div>
          )}
        </div>
      </div>

      {!isUser && !isStreaming && (
        <div className="acts flex flex-col items-start gap-3 pl-[38px] pt-2.5 w-full">
          {chips.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-1 animate-fade-up">
              {chips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => onChipClick?.(chip)}
                  className="h-8 px-4 bg-white border border-[#170c04]/14 rounded-full text-[12px] font-medium text-[#1c0f06]/75 hover:border-[#b87c32] hover:text-[#b87c32] hover:bg-white transition-all duration-150 shadow-sm active:scale-95"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}
          
          <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button 
              className="text-[11px] text-[#9e7d5e] hover:text-[#b87c32] flex items-center gap-1.5 transition-colors"
              onClick={() => navigator.clipboard.writeText(cleanContent)}
            >
               <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M5 2V1h10v10h-1M1 5h10v10H1V5z"/>
               </svg>
               Копіювати
            </button>
            <span className="text-[10px] text-[#c4a882]/70 italic">Відповідь бот-помічника</span>
          </div>
        </div>
      )}
    </div>
  )
}

export function TypingIndicator() {
  return (
    <div className="mg flex flex-col mb-[18px] items-start animate-fade-in">
      <div className="mr flex items-end gap-[8px]">
        <BotAvatar />
        <div className="typing flex items-center gap-[4px] p-[10px_14px] bg-white border border-[#170c04]/08 rounded-[14px] rounded-bl-[3px] shadow-[0_1px_4px_rgba(23,12,4,0.05)]">
          <div className="td w-[5px] h-[5px] rounded-full bg-[#c4a882]" style={{animation:'typing-dot 1.3s infinite ease-in-out'}} />
          <div className="td w-[5px] h-[5px] rounded-full bg-[#c4a882]" style={{animation:'typing-dot 1.3s infinite ease-in-out 0.17s'}} />
          <div className="td w-[5px] h-[5px] rounded-full bg-[#c4a882]" style={{animation:'typing-dot 1.3s infinite ease-in-out 0.34s'}} />
        </div>
      </div>
    </div>
  )
}
