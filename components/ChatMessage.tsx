'use client'

import React, { useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { User, Copy, BookOpenText, Check } from 'lucide-react'

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
  onChipClick?: (chip: string) => void
  timestamp?: string
}

export function ChatMessage({ role, content, isStreaming = false, onChipClick }: ChatMessageProps) {
  const isUser = role === 'user'
  const wrapperClass = `msg-wrapper ${isUser ? 'user' : 'bot'}`
  const [copied, setCopied] = useState(false)

  const { chips, cleanContent } = useMemo(() => {
    const chipsMatch = content.match(/\[CHIPS:\s*(.*?)\]/)
    const chipsArray = chipsMatch ? chipsMatch[1].split(',').map(s => s.trim()) : []
    const clean = content.replace(/\[CHIPS:\s*.*?\]/, '').trim()
    return { chips: chipsArray, cleanContent: clean }
  }, [content])

  const handleCopy = () => {
    navigator.clipboard.writeText(cleanContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={wrapperClass}>
      {!isUser && (
        <div className="avatar bot-avatar">
          <BookOpenText size={16} strokeWidth={1.5} color="#D4A373" />
        </div>
      )}

      <div className="message-content-col">
        <div className="bubble">
          {isUser ? (
            <span style={{ display: 'block', whiteSpace: 'pre-wrap' }}>{cleanContent}</span>
          ) : (
            <div className="prose-hdak">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                skipHtml={true}
                components={{
                  a: ({ ...props }) => (
                    <a
                      {...props}
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  ),
                }}
              >
                {cleanContent || (isStreaming ? '' : '…')}
              </ReactMarkdown>
              {isStreaming && (
                <span
                  style={{
                    display: 'inline-block',
                    width: 3,
                    height: 15,
                    background: 'var(--gold)',
                    marginLeft: 4,
                    verticalAlign: 'middle',
                    borderRadius: 2,
                    animation: 'pulse-cursor 0.9s infinite',
                  }}
                />
              )}
            </div>
          )}
        </div>
        
        {/* Actions Row */}
        {!isUser && !isStreaming && (
          <div className="msg-actions">
            <button onClick={handleCopy} className="action-btn" title="Копіювати текст" aria-label="Копіювати">
              {copied ? <Check size={14} color="#5e8c61" /> : <Copy size={13} />}
            </button>
          </div>
        )}

        {/* Action Chips */}
        {!isUser && !isStreaming && chips.length > 0 && (
          <div className="chips-container" style={{ marginTop: '4px' }}>
            {chips.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => onChipClick?.(chip)}
                className="suggest-chip"
              >
                <span>{chip}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>
            ))}
          </div>
        )}
      </div>

      {isUser && (
        <div className="avatar user-avatar">
          <User size={16} strokeWidth={2} color="#F5EBE0" />
        </div>
      )}
    </div>
  )
}

export function TypingIndicator() {
  return (
    <div className="msg-wrapper bot">
      <div className="avatar bot-avatar">
        <BookOpenText size={16} strokeWidth={1.5} color="#D4A373" />
      </div>
      <div className="message-content-col">
        <div className="bubble">
          <div style={{ display: 'flex', gap: 5, padding: '4px 2px', alignItems: 'center', height: '18px' }}>
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
          </div>
        </div>
      </div>
    </div>
  )
}
