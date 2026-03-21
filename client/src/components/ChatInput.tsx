import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowRight, Square } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop: () => void;
  disabled?: boolean;
  isStreaming?: boolean;
}

const CHIPS = [
  { label: "🔍 Шукати в каталозі", primary: true },
  { label: "⚡ Як записатися?" },
  { label: "📘 Правила користування" },
  { label: "🕐 Графік роботи" },
  { label: "📞 Контакти" },
];

export function ChatInput({ onSend, onStop, disabled, isStreaming }: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [input]);

  useEffect(() => {
    if (!isStreaming) textareaRef.current?.focus();
  }, [isStreaming]);

  const handleSubmit = useCallback((text?: string) => {
    const trimmed = (text ?? input).trim();
    if (!trimmed || disabled || isStreaming) return;
    onSend(trimmed);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }, [input, disabled, isStreaming, onSend]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  return (
    <div
      style={{
        flexShrink: 0,
        background: "rgba(237,224,200,.92)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        borderTop: "1px solid var(--border-mid)",
        padding: "10px 14px",
        paddingBottom: "max(10px, env(safe-area-inset-bottom))",
      }}
    >
      {/* Chips row */}
      <div
        className="chips-row"
        role="list"
        aria-label="Швидкі запити"
        style={{ marginBottom: 8 }}
      >
        {CHIPS.map(({ label, primary }) => (
          <button
            key={label}
            role="listitem"
            onClick={() => handleSubmit(label.replace(/^[\p{Emoji}\s]+/u, "").trim())}
            disabled={isStreaming || disabled}
            style={{
              flexShrink: 0,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              height: 30,
              padding: "0 12px",
              background: primary ? "var(--b1)" : "rgba(255,252,245,.8)",
              border: `1.5px solid ${primary ? "var(--b1)" : "var(--border-mid)"}`,
              borderRadius: "var(--r-pill)",
              color: primary ? "rgba(245,234,216,.95)" : "var(--text-2)",
              fontSize: 12.5,
              fontWeight: 500,
              whiteSpace: "nowrap",
              transition: "all .12s",
              cursor: isStreaming || disabled ? "not-allowed" : "pointer",
              opacity: isStreaming || disabled ? 0.5 : 1,
              fontFamily: "var(--ff-b)",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Input row */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 8,
          background: "rgba(255,252,245,.95)",
          border: `1.5px solid ${focused ? "var(--border-strong)" : "var(--border-mid)"}`,
          borderRadius: "var(--r-xl)",
          padding: "5px 6px 5px 16px",
          boxShadow: focused ? "0 0 0 3px rgba(92,58,30,.07)" : "none",
          transition: "border-color .12s, box-shadow .12s",
        }}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={isStreaming ? "Зачекайте відповіді…" : "Введіть запитання…"}
          data-testid="input-chat-message"
          aria-label="Введіть запитання до бібліотеки"
          aria-describedby="kb-hint"
          disabled={disabled || isStreaming}
          rows={1}
          inputMode="text"
          autoComplete="off"
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "var(--text-0)",
            fontSize: 15,
            fontFamily: "var(--ff-b)",
            fontWeight: 400,
            resize: "none",
            lineHeight: 1.55,
            padding: "8px 0",
            minHeight: 36,
            maxHeight: 120,
          }}
        />

        {isStreaming ? (
          <button
            type="button"
            onClick={onStop}
            data-testid="button-stop-stream"
            aria-label="Зупинити відповідь"
            style={{
              width: 36, height: 36, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "#991a1a",
              border: "none",
              borderRadius: "var(--r-md)",
              color: "var(--p1)",
              transition: "background .12s",
              cursor: "pointer",
            }}
          >
            <Square style={{ width: 13, height: 13, fill: "currentColor" }} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={!input.trim() || disabled}
            data-testid="button-send-message"
            aria-label="Надіслати"
            style={{
              width: 36, height: 36, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "var(--b1)",
              border: "none",
              borderRadius: "var(--r-md)",
              color: "var(--p1)",
              transition: "background .12s, transform .1s",
              cursor: !input.trim() || disabled ? "not-allowed" : "pointer",
              opacity: !input.trim() || disabled ? 0.45 : 1,
            }}
          >
            <ArrowRight style={{ width: 14, height: 14 }} />
          </button>
        )}
      </div>

      {/* Keyboard hints — hidden on touch devices */}
      <p
        id="kb-hint"
        style={{
          fontSize: 10.5,
          color: "var(--text-4)",
          textAlign: "center",
          paddingTop: 5,
          letterSpacing: ".01em",
        }}
        className="hidden sm:block"
      >
        Enter — надіслати · Shift+Enter — новий рядок
      </p>
    </div>
  );
}
