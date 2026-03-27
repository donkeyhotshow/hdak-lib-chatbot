'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import { Copy, Check, ThumbsUp, ThumbsDown } from 'lucide-react'

interface Props {
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
  chips?: string[]
  onChipClick?: (chip: string) => void
  responseTime?: string
}

const BOOK_SVG = (
  <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
    <path d="M6 1C6 1 3.8.5 2 1L1.5 8C3.5 7.5 5.5 8 6 8L6 1Z"
      fill="rgba(184,120,48,.22)" stroke="rgba(184,120,48,.58)" strokeWidth=".6"/>
    <path d="M6 1C6 1 8.2.5 10 1L10.5 8C8.5 7.5 6.5 8 6 8L6 1Z"
      fill="rgba(184,120,48,.16)" stroke="rgba(184,120,48,.46)" strokeWidth=".6"/>
    <line x1="6" y1="1" x2="6" y2="8" stroke="rgba(184,120,48,.8)" strokeWidth=".75"/>
  </svg>
)

const BTN: React.CSSProperties = {
  width: '24px', height: '24px', display: 'flex',
  alignItems: 'center', justifyContent: 'center',
  background: 'transparent', border: 'none',
  borderRadius: '5px', color: 'var(--t4)',
  cursor: 'pointer', transition: 'all 0.1s',
}

export default function ChatBubble({
  role, content, isStreaming, chips, onChipClick, responseTime,
}: Props) {
  const isUser = role === 'user'
  const [copied, setCopied]   = useState(false)
  const [thumbed, setThumbed] = useState<'up' | 'dn' | null>(null)
  const [actHov, setActHov]   = useState(false)

  function copy() {
    navigator.clipboard?.writeText(content).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '16px' }}>

      {/* ── Row: avatar + bubble ── */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: '8px',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        animation: 'fadeUp 0.16s ease',
      }}>

        {/* Bot avatar */}
        {!isUser && (
          <div style={{
            width: '22px', height: '22px', borderRadius: '5px',
            background: '#1a0d06', flexShrink: 0, marginBottom: '2px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {BOOK_SVG}
          </div>
        )}

        {/* Bubble */}
        <div style={{
          maxWidth: isUser ? '72%' : '84%',
          padding: '10px 14px',
          background: isUser ? '#1a0d06' : '#ffffff',
          border: isUser ? 'none' : '0.5px solid rgba(23,12,4,0.08)',
          borderRadius: isUser ? '14px 14px 3px 14px' : '14px 14px 14px 3px',
          color: isUser ? 'rgba(238,220,196,0.88)' : 'var(--t0)',
          fontSize: '13.5px', lineHeight: 1.76, fontWeight: 300,
          boxShadow: isUser ? 'none' : '0 1px 3px rgba(23,12,4,0.04)',
          wordBreak: 'break-word',
        }}>
          {isUser ? (
            <span style={{ whiteSpace: 'pre-wrap' }}>{content}</span>
          ) : (
            <>
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkBreaks]}
                components={{
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: 'var(--gold)',
                        borderBottom: '0.5px solid rgba(184,120,48,0.3)',
                        textDecoration: 'none',
                      }}
                    >
                      {children}
                    </a>
                  ),
                  strong: ({ children }) => (
                    <strong style={{ fontWeight: 500, color: 'var(--t0)' }}>{children}</strong>
                  ),
                  p: ({ children }) => (
                    <p style={{ marginBottom: '6px' }}>{children}</p>
                  ),
                  ul: ({ children }) => (
                    <ul style={{ paddingLeft: '16px', marginBottom: '6px' }}>{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol style={{ paddingLeft: '16px', marginBottom: '6px' }}>{children}</ol>
                  ),
                  li: ({ children }) => (
                    <li style={{ marginBottom: '2px' }}>{children}</li>
                  ),
                  code: ({ children }) => (
                    <code style={{
                      background: 'var(--bg2)', padding: '1px 5px',
                      borderRadius: '3px', fontSize: '12.5px',
                    }}>
                      {children}
                    </code>
                  ),
                }}
              >
                {content}
              </ReactMarkdown>

              {/* Streaming cursor */}
              {isStreaming && (
                <span style={{
                  display: 'inline-block', width: '1.5px', height: '12px',
                  background: 'var(--gold)', marginLeft: '1px',
                  verticalAlign: 'text-bottom',
                  animation: 'blink 0.65s step-end infinite',
                }} />
              )}
            </>
          )}
        </div>

        {/* User avatar */}
        {isUser && (
          <div style={{
            width: '22px', height: '22px', borderRadius: '50%',
            background: 'var(--bg3)', border: '0.5px solid var(--b2)',
            flexShrink: 0, marginBottom: '2px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '8px', fontWeight: 500, color: 'var(--t2)',
          }}>
            ВИ
          </div>
        )}
      </div>

      {/* ── Actions + chips (bot only, after streaming) ── */}
      {!isUser && !isStreaming && (
        <>
          {/* Action row — visible on hover */}
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: '1px',
              padding: '4px 0 0 30px',
              opacity: actHov ? 1 : 0,
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={() => setActHov(true)}
            onMouseLeave={() => setActHov(false)}
          >
            <button
              onClick={copy}
              title={copied ? 'Скопійовано!' : 'Копіювати'}
              style={{ ...BTN, color: copied ? '#4e8a4e' : undefined }}
            >
              {copied ? <Check size={11} /> : <Copy size={11} />}
            </button>

            <button
              onClick={() => setThumbed(thumbed === 'up' ? null : 'up')}
              title="Корисна відповідь"
              style={{ ...BTN, color: thumbed === 'up' ? '#4e8a4e' : undefined }}
            >
              <ThumbsUp size={11} />
            </button>

            <button
              onClick={() => setThumbed(thumbed === 'dn' ? null : 'dn')}
              title="Некорисна відповідь"
              style={{ ...BTN, color: thumbed === 'dn' ? '#8a5050' : undefined }}
            >
              <ThumbsDown size={11} />
            </button>

            {responseTime && (
              <span style={{ fontSize: '10px', color: 'var(--t4)', marginLeft: '3px' }}>
                {responseTime}
              </span>
            )}
          </div>

          {/* Context chips */}
          {chips && chips.length > 0 && (
            <div style={{
              display: 'flex', gap: '5px', flexWrap: 'wrap',
              padding: '7px 0 0 30px',
            }}>
              {chips.map(chip => (
                <Chip key={chip} label={chip} onClick={() => onChipClick?.(chip)} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Chip({ label, onClick }: { label: string; onClick: () => void }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      style={{
        height: '25px', padding: '0 10px', background: 'transparent',
        border: `0.5px solid ${hov ? 'rgba(23,12,4,0.20)' : 'rgba(23,12,4,0.12)'}`,
        borderRadius: '100px', fontSize: '11.5px', fontWeight: 300,
        color: hov ? 'rgba(23,12,4,0.88)' : 'rgba(58,32,16,0.65)',
        cursor: 'pointer', transition: 'all 0.12s', whiteSpace: 'nowrap',
        background: hov ? 'rgba(23,12,4,0.04)' : 'transparent' as any,
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {label}
    </button>
  )
}
