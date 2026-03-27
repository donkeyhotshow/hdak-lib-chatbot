'use client'

import { useRef, useState } from 'react'

interface Props {
  onSend: (text: string) => void
  disabled?: boolean
  placeholder?: string
}

export default function ChatInput({
  onSend,
  disabled,
  placeholder = 'Запитайте про бібліотеку…',
}: Props) {
  const [value, setValue] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)
  const [focused, setFocused] = useState(false)

  const hasValue = value.trim().length > 0

  function submit() {
    const t = value.trim()
    if (!t || disabled) return
    onSend(t)
    setValue('')
    if (ref.current) ref.current.style.height = 'auto'
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  function resize(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 108) + 'px'
  }

  return (
    <div style={{
      flexShrink: 0,
      padding: '10px 20px',
      paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
      background: 'var(--bg)',
      borderTop: '0.5px solid var(--b0)',
    }}>
      <div
        style={{
          background: '#ffffff',
          border: `1px solid ${focused ? 'rgba(23,12,4,0.26)' : 'rgba(23,12,4,0.10)'}`,
          borderRadius: '14px',
          boxShadow: focused
            ? '0 0 0 3px rgba(23,12,4,0.04)'
            : '0 1px 3px rgba(23,12,4,0.04)',
          transition: 'border-color 0.14s, box-shadow 0.14s',
          maxWidth: '680px',
          margin: '0 auto',
        }}
      >
        <textarea
          ref={ref}
          value={value}
          onChange={resize}
          onKeyDown={onKey}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          rows={1}
          disabled={disabled}
          aria-label="Введіть запитання"
          style={{
            display: 'block', width: '100%',
            background: 'transparent', border: 'none', outline: 'none',
            resize: 'none', fontFamily: 'var(--fb)',
            fontSize: '14px', fontWeight: 300,
            color: 'var(--t0)', lineHeight: 1.55,
            padding: '12px 14px 0',
            minHeight: '44px', maxHeight: '108px',
            opacity: disabled ? 0.5 : 1,
          }}
        />

        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 8px 8px 12px',
        }}>
          {/* Hint */}
          <span style={{
            fontSize: '10px', color: 'var(--t4)', fontWeight: 300,
            display: 'none', // shown via media query if needed
          }}>
            Enter — надіслати
          </span>

          {/* Send button */}
          <button
            onClick={submit}
            disabled={!hasValue || disabled}
            aria-label="Надіслати"
            style={{
              marginLeft: 'auto',
              width: '30px', height: '30px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: hasValue && !disabled ? '#1a0d06' : 'var(--bg3)',
              border: 'none', borderRadius: '9px',
              color: hasValue && !disabled ? 'rgba(238,220,196,0.9)' : 'var(--t4)',
              cursor: hasValue && !disabled ? 'pointer' : 'default',
              transition: 'all 0.12s',
            }}
            onMouseEnter={e => {
              if (hasValue && !disabled)
                (e.currentTarget as HTMLElement).style.background = 'var(--dk3)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background =
                hasValue && !disabled ? '#1a0d06' : 'var(--bg3)'
            }}
          >
            {disabled ? (
              // Spinner when loading
              <svg
                width="12" height="12" viewBox="0 0 12 12" fill="none"
                style={{ animation: 'spin 0.8s linear infinite' }}
              >
                <circle cx="6" cy="6" r="4.5"
                  stroke="currentColor" strokeWidth="1.5"
                  strokeDasharray="14" strokeDashoffset="4"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg
                width="12" height="12" viewBox="0 0 14 14" fill="none"
                stroke="currentColor" strokeWidth="1.9"
                strokeLinecap="round" strokeLinejoin="round"
              >
                <path d="M13 7H1"/><path d="M8 2l5 5-5 5"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      <p style={{
        fontSize: '10px', color: 'var(--t4)', textAlign: 'center', paddingTop: '5px',
      }}>
        Enter — надіслати · Shift+Enter — новий рядок
      </p>
    </div>
  )
}
