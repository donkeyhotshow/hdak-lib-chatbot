import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Props {
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
}

export function ChatMessage({ role, content, isStreaming }: Props) {
  const isUser = role === 'user'

  return (
    <div className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>

      {/* Bot avatar */}
      {!isUser && (
        <div className="w-[24px] h-[24px] rounded-[5px] bg-[var(--color-ink)]
                        flex items-center justify-center flex-shrink-0 mb-[2px]">
          <svg width="13" height="10" viewBox="0 0 13 10" fill="none">
            <path d="M6.5 1C6.5 1 4.2.5 2 1L1.5 8.8C3.8 8.3 6 8.8 6.5 8.8L6.5 1Z"
              fill="rgba(192,136,64,0.22)" stroke="rgba(192,136,64,0.6)" strokeWidth="0.6"/>
            <path d="M6.5 1C6.5 1 8.8.5 11 1L11.5 8.8C9.2 8.3 7 8.8 6.5 8.8L6.5 1Z"
              fill="rgba(192,136,64,0.16)" stroke="rgba(192,136,64,0.48)" strokeWidth="0.6"/>
            <line x1="6.5" y1="1" x2="6.5" y2="8.8" stroke="rgba(192,136,64,0.8)" strokeWidth="0.8"/>
          </svg>
        </div>
      )}

      {/* Bubble */}
      <div className={`
        max-w-[82%] px-[15px] py-[11px] text-[14px] leading-[1.75] font-light
        ${isUser
          ? 'bg-[var(--color-ink)] text-[rgba(245,235,215,0.88)] rounded-[16px_16px_3px_16px]'
          : 'bg-white border border-[rgba(26,14,6,0.08)] text-[var(--color-ink)] rounded-[16px_16px_16px_3px]'
        }
      `}>
        {isUser ? (
          <span className="whitespace-pre-wrap break-words">{content}</span>
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noopener noreferrer"
                   className="text-[var(--color-gold)] border-b border-[rgba(192,136,64,0.35)]
                              hover:border-[var(--color-gold)] transition-colors">
                  {children}
                </a>
              ),
              strong: ({ children }) => (
                <strong className="font-medium text-[var(--color-ink)]">{children}</strong>
              ),
              code: ({ children }) => (
                <code className="bg-[var(--color-paper-2)] px-1 py-0.5 rounded text-[13px]
                                 font-mono text-[var(--color-ink-2)]">
                  {children}
                </code>
              ),
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
            }}
          >
            {content}
          </ReactMarkdown>
        )}
        {/* Streaming cursor */}
        {isStreaming && !isUser && (
          <span className="inline-block w-[1.5px] h-[13px] bg-[var(--color-gold)]
                           ml-[1px] align-text-bottom animate-[blink_0.65s_step-end_infinite]"/>
        )}
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="w-[24px] h-[24px] rounded-full bg-[var(--color-paper-3)]
                        border border-[rgba(26,14,6,0.13)]
                        flex items-center justify-center flex-shrink-0 mb-[2px]
                        text-[9px] font-medium text-[var(--color-ink-3)]">
          ВИ
        </div>
      )}
    </div>
  )
}
