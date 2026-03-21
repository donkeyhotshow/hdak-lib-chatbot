'use client'

import { useRef, useState } from 'react'

interface Props {
  onSend: (text: string) => void
  disabled?: boolean
}

export function ChatInput({ onSend, disabled }: Props) {
  const [value, setValue] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)

  function submit() {
    const text = value.trim()
    if (!text || disabled) return
    onSend(text)
    setValue('')
    if (ref.current) {
      ref.current.style.height = 'auto'
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  function autoResize(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 116) + 'px'
  }

  return (
    <div className="flex-shrink-0 px-4 py-3 bg-[var(--color-paper)]
                    border-t border-[rgba(26,14,6,0.08)]
                    pb-[max(12px,env(safe-area-inset-bottom))]">
      <div className="bg-white border border-[rgba(26,14,6,0.14)] rounded-[16px]
                      focus-within:border-[rgba(26,14,6,0.28)]
                      focus-within:shadow-[0_0_0_3px_rgba(26,14,6,0.04)]
                      transition-all duration-150 max-w-[680px] mx-auto">
        <textarea
          ref={ref}
          value={value}
          onChange={autoResize}
          onKeyDown={onKey}
          placeholder="Запитайте про бібліотеку…"
          rows={1}
          disabled={disabled}
          className="block w-full bg-transparent border-none outline-none resize-none
                     text-[15px] font-light text-[var(--color-ink)] leading-[1.55]
                     placeholder:text-[var(--color-ink-4)]
                     px-4 pt-[13px] pb-0 min-h-[46px] max-h-[116px]
                     disabled:opacity-50"
        />
        <div className="flex items-center justify-between px-2 pb-2 pt-1">
          <div className="flex gap-2 overflow-x-auto scrollbar-none flex-1 mr-2">
            {['Каталог', 'Графік', 'Контакти', 'Правила'].map(chip => (
              <button
                key={chip}
                onClick={() => onSend(chip)}
                disabled={disabled}
                className="flex-shrink-0 h-[22px] px-[9px] rounded-full bg-transparent
                           border border-[rgba(26,14,6,0.12)]
                           text-[11px] font-light text-[var(--color-ink-3)]
                           whitespace-nowrap transition-all duration-100
                           hover:bg-[var(--color-paper-2)] hover:text-[var(--color-ink)]
                           disabled:opacity-40"
              >
                {chip}
              </button>
            ))}
          </div>
          <button
            onClick={submit}
            disabled={!value.trim() || disabled}
            className="w-[30px] h-[30px] flex-shrink-0 flex items-center justify-center
                       bg-[var(--color-ink)] rounded-[9px] text-white
                       hover:bg-[var(--color-ink-2)] active:scale-90
                       disabled:bg-[var(--color-paper-3)] disabled:text-[var(--color-ink-4)]
                       transition-all duration-100"
          >
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none"
                 stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 7H1"/><path d="M8 2l5 5-5 5"/>
            </svg>
          </button>
        </div>
      </div>
      <p className="text-[10px] text-[var(--color-ink-4)] text-center mt-[5px] hidden sm:block">
        Enter — надіслати · Shift+Enter — новий рядок
      </p>
    </div>
  )
}
