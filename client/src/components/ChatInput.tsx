import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowRight, Square } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop: () => void;
  disabled?: boolean;
  isStreaming?: boolean;
  chips?: { label: string; icon?: string }[];
  primaryChip?: string;
}

const DEFAULT_CHIPS = [
  { label: "Шукати в каталозі", icon: "🔍", primary: true },
  { label: "Як записатися?", icon: "⚡" },
  { label: "Правила користування", icon: "📘" },
  { label: "Графік роботи", icon: "🕐" },
  { label: "Контакти", icon: "📞" },
];

export function ChatInput({ onSend, onStop, disabled, isStreaming, chips, primaryChip }: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [focused, setFocused] = useState(false);

  const activeChips = chips
    ? chips.map(c => ({ label: c.label, icon: c.icon, primary: c.label === primaryChip }))
    : DEFAULT_CHIPS;

  const grow = useCallback(() => {
    requestAnimationFrame(() => {
      if (!textareaRef.current) return;
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
    });
  }, []);

  useEffect(() => {
    grow();
  }, [input, grow]);

  useEffect(() => {
    if (!isStreaming) textareaRef.current?.focus();
  }, [isStreaming]);

  const handleSubmit = useCallback((text?: string) => {
    const trimmed = (text ?? input).trim();
    if (!trimmed || disabled || isStreaming) return;
    onSend(trimmed);
    setInput("");
    requestAnimationFrame(() => {
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    });
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
        style={{
          marginBottom: 8,
          WebkitMaskImage: "linear-gradient(to right, transparent 0%, #000 4%, #000 96%, transparent 100%)",
          maskImage: "linear-gradient(to right, transparent 0%, #000 4%, #000 96%, transparent 100%)",
          opacity: isStreaming ? 0.45 : 1,
          pointerEvents: isStreaming ? "none" : "auto",
          transition: "opacity .12s",
        }}
      >
        {activeChips.map(({ label, icon, primary }) => (
          <button
            key={label}
            role="listitem"
            onClick={() => handleSubmit(label)}
            disabled={isStreaming || disabled}
            data-testid={`button-chip-${label}`}
            style={{
              flexShrink: 0,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              height: 30,
              padding: "0 12px",
              background: primary ? "var(--brown-1)" : "rgba(255,252,245,.8)",
              border: `1.5px solid ${primary ? "var(--brown-1)" : "var(--border-md)"}`,
              borderRadius: 999,
              color: primary ? "rgba(245,234,216,.95)" : "var(--text-2)",
              fontSize: 12.5,
              fontWeight: 500,
              whiteSpace: "nowrap",
              transition: "all .12s",
              cursor: isStreaming || disabled ? "not-allowed" : "pointer",
              fontFamily: "var(--ff-b)",
            }}
          >
            {icon && <span style={{ fontSize: 13 }}>{icon}</span>}
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
          background: "var(--bg-input)",
          border: `1.5px solid ${focused ? "var(--border-lg)" : "var(--border-md)"}`,
          borderRadius: 22,
          padding: "5px 6px 5px 16px",
          boxShadow: focused ? "0 0 0 3px rgba(60,35,10,.06)" : "none",
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
            fontSize: 15.5,
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
              background: "var(--brown-1)",
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
          color: "var(--text-faint)",
          textAlign: "center",
          paddingTop: 5,
          letterSpacing: ".01em",
        }}
        className="hidden sm:block"
      >
        Enter — надіслати · Shift+Enter — новий рядок · ↑ — редагувати
      </p>
    </div>
  );
}
