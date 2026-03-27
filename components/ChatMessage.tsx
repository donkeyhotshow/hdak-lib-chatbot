'use client'

import React, { memo, useState, useCallback } from 'react'
import { Copy, Check, User, BookOpen } from 'lucide-react'

interface ChatMessageProps {
  role: string
  content: string
  index?: number
  isStreaming?: boolean
}

const TypingDots = () => (
  <div className="flex gap-1 mt-2" aria-label="Асистент друкує" role="status">
    {[0, 150, 300].map((delay, i) => (
      <span
        key={i}
        className="w-2 h-2 bg-[#b87830] rounded-full animate-bounce"
        style={{ animationDelay: `${delay}ms` }}
      />
    ))}
  </div>
)

const ChatMessage = memo(({ role, content, index = 0, isStreaming }: ChatMessageProps) => {
  const isUser = role === 'user'
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }, [content])

  return (
    <article
      role="article"
      aria-label={isUser ? 'Ваше повідомлення' : 'Відповідь асистента'}
      className={`flex gap-3 px-4 py-3 group transition-colors hover:bg-black/[0.01] ${
        isUser ? 'flex-row-reverse' : 'flex-row'
      }`}
      style={{
        animation: `msgIn 0.3s cubic-bezier(0.22,1,0.36,1) ${index * 40}ms both`,
      }}
    >
      {/* Avatar */}
      <div
        aria-hidden="true"
        className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5 shadow-sm ${
          isUser
            ? 'bg-[#b87830]'
            : 'bg-[#1a130f] border border-white/5'
        }`}
      >
        {isUser
          ? <User size={14} className="text-white" />
          : <BookOpen size={14} className="text-[#b87830]" />
        }
      </div>

      {/* Bubble */}
      <div className={`flex flex-col gap-1 max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`px-4 py-3 rounded-2xl text-[14.5px] leading-relaxed shadow-sm ${
            isUser
              ? 'bg-[#1a130f] text-[#f7f4ef] rounded-tr-sm'
              : 'bg-white border border-black/[0.05] text-[#1a130f] rounded-tl-sm'
          }`}
        >
          <p className="whitespace-pre-wrap font-[450]">{content}</p>
          {isStreaming && <TypingDots />}
        </div>

        {/* Copy button  тільки для асистента, показується при hover */}
        {!isUser && !isStreaming && content && (
          <button
            onClick={handleCopy}
            aria-label={copied ? 'Скопійовано' : 'Копіювати відповідь'}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] text-black/25 hover:text-black/50 hover:bg-black/5 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
          >
            {copied
              ? <><Check size={11} className="text-green-500" /> Скопійовано</>
              : <><Copy size={11} /> Копіювати</>
            }
          </button>
        )}
      </div>

      <style>{`
        @keyframes msgIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </article>
  )
})

ChatMessage.displayName = 'ChatMessage'
export default ChatMessage