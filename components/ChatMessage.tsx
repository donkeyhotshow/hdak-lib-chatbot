'use client'

import React from 'react'
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

  const chipsMatch = content.match(/\[CHIPS:\s*(.*?)\]/)
  const chips = chipsMatch ? chipsMatch[1].split(',').map(s => s.trim()) : []
  const cleanContent = content.replace(/\[CHIPS:\s*.*?\]/, '').trim()

  return (
    <div className={wrapperClass}>
      <div className="bubble">
        {isUser ? (
          <span style={{ display: 'block', whiteSpace: 'pre-wrap' }}>{cleanContent}</span>
        ) : (
          <div className="prose-hdak" style={{ overflow: 'hidden' }}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              skipHtml={true}
              components={{
                a: ({ node, ...props }) => (
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
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 12 }}>
          {chips.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => onChipClick?.(chip)}
              className="suggest-card"
              style={{ padding: '8px 14px', borderRadius: 12, fontSize: 13, border: '1px solid var(--border-mocha)', background: 'var(--white)' }}
            >
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-main)' }}>{chip}</span>
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
