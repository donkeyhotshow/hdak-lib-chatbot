import { useState, useRef, useEffect, useCallback } from "react";
import { StopCircle, Send } from "lucide-react";
import { CHIPS } from "@/pages/Home";

// SVG іконка книги для бейджа
const BookIcon = () => (
  <svg 
    width="12" 
    height="12" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    <path d="M12 6v7" />
    <path d="M9 9h6" />
  </svg>
);

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop: () => void;
  disabled?: boolean;
  isStreaming?: boolean;
}

export function ChatInput({ onSend, onStop, disabled, isStreaming }: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [input]);

  // Auto-focus after sending or when not streaming
  useEffect(() => {
    if (!isStreaming && textareaRef.current && !disabled) {
      textareaRef.current.focus({ preventScroll: true });
    }
  }, [isStreaming, disabled]);

  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || disabled || isStreaming) return;
    onSend(trimmed);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      // Focus back after sending
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
  }, [input, disabled, isStreaming, onSend]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    // Escape to blur input
    if (e.key === "Escape") {
      textareaRef.current?.blur();
    }
  }, [handleSubmit]);

  const handleChip = useCallback((label: string, index: number) => {
    if (disabled || isStreaming) return;
    onSend(label);
    // Focus input after chip click
    setTimeout(() => textareaRef.current?.focus(), 0);
  }, [disabled, isStreaming, onSend]);

  return (
    <div style={{ width: "100%" }}>
      {/* Chips row - Quick buttons */}
      <div
        role="toolbar"
        aria-label="Швидкі запити"
        style={{
          display: "flex",
          gap: 10,
          overflowX: "auto",
          padding: "12px 20px 8px",
          scrollbarWidth: "none",
          scrollBehavior: "smooth",
        }}
      >
        {CHIPS.map((chip, i) => (
          <button
            key={chip.label}
            onClick={() => handleChip(chip.label, i)}
            disabled={disabled || isStreaming}
            className="chip-sm"
            data-testid={`chip-input-${i}`}
            aria-label={`Швидкий запит: ${chip.label}. ${chip.subtitle || ""}`}
            tabIndex={0}
            style={{
              flexShrink: 0,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "0 16px",
              height: 36,
              background: "#fff",
              border: "1px solid hsla(28 10% 85% / 0.4)",
              borderRadius: 999,
              fontSize: 13,
              fontFamily: "var(--font-sans)",
              fontWeight: 500,
              color: "hsl(28 15% 20%)",
              cursor: disabled || isStreaming ? "not-allowed" : "pointer",
              opacity: disabled || isStreaming ? 0.5 : 1,
              whiteSpace: "nowrap",
              transition: "all 0.2s ease",
              boxShadow: "0 2px 8px hsla(0 0% 0% / 0.04)",
              outline: "none",
            }}
            onFocus={e => {
              if (!disabled && !isStreaming) {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "hsl(32 45% 63% / 0.5)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 0 3px hsla(32 45% 63% / 0.15)";
              }
            }}
            onBlur={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "hsla(28 10% 85% / 0.4)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 2px 8px hsla(0 0% 0% / 0.04)";
            }}
            onMouseEnter={e => {
              if (!disabled && !isStreaming) {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "hsl(32 45% 63% / 0.4)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 12px hsla(0 0% 0% / 0.08)";
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
              }
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "hsla(28 10% 85% / 0.4)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 2px 8px hsla(0 0% 0% / 0.04)";
              (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
            }}
          >
            <span style={{ color: "hsl(32 45% 63%)", display: "flex" }}>{chip.emoji}</span>
            {chip.label}
          </button>
        ))}
      </div>

      {/* Input Dock - Floating pill */}
      <div style={{ 
        padding: "12px 24px 20px",
        background: "linear-gradient(180deg, hsla(35 20% 99% / 0) 0%, hsla(35 20% 99% / 0.95) 30%)",
        position: "relative",
      }}>
        {/* AI indicator badge */}
        <div 
          role="status"
          aria-label="Асистент бібліотеки готовий"
          style={{
            position: "absolute",
            top: 4,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 10px",
            background: "hsla(32 45% 63% / 0.08)",
            borderRadius: 20,
            border: "1px solid hsla(32 45% 63% / 0.15)",
          }}
        >
          <span style={{ color: "hsl(32 45% 63%)", display: "flex" }}>
            <BookIcon />
          </span>
          <span style={{
            fontSize: 9,
            fontWeight: 600,
            color: "hsl(32 45% 55%)",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            fontFamily: "var(--font-sans)",
          }}>
            Асистент бібліотеки
          </span>
        </div>
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          style={{
            maxWidth: 720,
            margin: "0 auto",
            position: "relative",
          }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Запитайте про бібліотеку..."
            data-testid="input-chat-message"
            disabled={disabled || isStreaming}
            rows={1}
            aria-label="Повідомлення"
            aria-describedby="input-hint"
            aria-required="true"
            style={{
              width: "100%",
              background: "#fff",
              border: "1px solid hsla(28 10% 85% / 0.3)",
              borderRadius: 32,
              padding: "16px 24px 16px 20px",
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              color: "hsl(28 15% 12%)",
              lineHeight: 1.5,
              outline: "none",
              boxShadow: "0 4px 20px hsla(0 0% 0% / 0.06)",
              transition: "all 0.2s ease",
              resize: "none" as const,
            }}
            onFocus={e => {
              e.currentTarget.style.borderColor = "hsl(32 45% 63% / 0.4)";
              e.currentTarget.style.boxShadow = "0 4px 24px hsla(32 45% 45% / 0.12)";
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = "hsla(28 10% 85% / 0.3)";
              e.currentTarget.style.boxShadow = "0 4px 20px hsla(0 0% 0% / 0.06)";
            }}
          />
          <span id="input-hint" className="sr-only">
            Натисніть Enter для відправки, Shift+Enter для нового рядка
          </span>

          {isStreaming ? (
            <button
              type="button"
              onClick={onStop}
              data-testid="button-stop-stream"
              aria-label="Зупинити генерацію"
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "hsl(0 65% 48%)",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "opacity 0.12s, transform 0.2s ease",
                outline: "none",
              }}
              onFocus={e => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 0 3px hsla(0 65% 48% / 0.3)";
              }}
              onBlur={e => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-50%) scale(1.05)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-50%) scale(1)";
              }}
            >
              <StopCircle style={{ width: 18, height: 18, color: "#fff" }} aria-hidden="true" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim() || disabled}
              data-testid="button-send-message"
              aria-label={input.trim() ? "Відправити повідомлення" : "Введіть повідомлення для відправки"}
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: !input.trim() || disabled ? "hsla(32 45% 63% / 0.1)" : "hsl(32 45% 63%)",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: !input.trim() || disabled ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
                boxShadow: !input.trim() || disabled ? "none" : "0 2px 8px hsla(32 45% 45% / 0.25)",
                outline: "none",
              }}
              onFocus={e => {
                if (input.trim() && !disabled) {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 0 3px hsla(32 45% 63% / 0.3)";
                }
              }}
              onBlur={e => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow = !input.trim() || disabled ? "none" : "0 2px 8px hsla(32 45% 45% / 0.25)";
              }}
              onMouseEnter={e => {
                if (input.trim() && !disabled) {
                  (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-50%) scale(1.05)";
                }
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-50%) scale(1)";
              }}
            >
              <Send style={{ 
                width: 18, 
                height: 18, 
                color: !input.trim() || disabled ? "hsl(32 45% 63% / 0.4)" : "#fff" 
              }} aria-hidden="true" />
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
