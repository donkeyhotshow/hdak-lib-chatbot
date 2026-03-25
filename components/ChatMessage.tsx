'use client'

import React, { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

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

  const { chips, cleanContent } = useMemo(() => {
    const chipsMatch = content.match(/\[CHIPS:\s*(.*?)\]/)
    const chipsArray = chipsMatch ? chipsMatch[1].split(',').map(s => s.trim()) : []
    const clean = content.replace(/\[CHIPS:\s*.*?\]/, '').trim()
    return { chips: chipsArray, cleanContent: clean }
  }, [content])

  return (
    <div className={wrapperClass}>
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
                  animation: 'pulse-dot 0.9s infinite',
                }}
              />
            )}
          </div>
        )}
      </div>
      
      {!isUser && !isStreaming && chips.length > 0 && (
        <div className="chips-container">
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
  )
}

export function TypingIndicator() {
  return (
    <div className="msg-wrapper bot">
      <div className="bubble">
        <div style={{ display: 'flex', gap: 6, padding: '8px 0' }}>
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
        </div>
      </div>
    </div>
  )
}
