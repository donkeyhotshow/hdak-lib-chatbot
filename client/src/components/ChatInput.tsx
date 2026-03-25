import { useState, useRef, useEffect, useCallback } from "react";
import { StopCircle } from "lucide-react";
import { CHIPS } from "@/pages/Home";

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop: () => void;
  disabled?: boolean;
  isStreaming?: boolean;
}

export function ChatInput({ onSend, onStop, disabled, isStreaming }: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [input]);

  useEffect(() => {
    if (!isStreaming) textareaRef.current?.focus();
  }, [isStreaming]);

  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = input.trim();
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

  const handleChip = useCallback((label: string) => {
    if (disabled || isStreaming) return;
    onSend(label);
  }, [disabled, isStreaming, onSend]);

  return (
    <div style={{ width: "100%" }}>
      {/* Chips row */}
      <div
        style={{
          display: "flex",
          gap: 6,
          overflowX: "auto",
          padding: "8px 16px 0",
          scrollbarWidth: "none",
        }}
      >
        {CHIPS.map((chip, i) => (
          <button
            key={chip.label}
            onClick={() => handleChip(chip.label)}
            disabled={disabled || isStreaming}
            className="chip-sm"
            data-testid={`chip-input-${i}`}
            style={{
              flexShrink: 0,
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              height: 32,
              padding: "0 11px",
              background: "hsl(38 70% 97%)",
              border: "0.5px solid hsl(var(--border))",
              borderRadius: 999,
              fontSize: 12,
              fontFamily: "var(--font-sans)",
              color: "hsl(var(--b2))",
              cursor: disabled || isStreaming ? "not-allowed" : "pointer",
              opacity: disabled || isStreaming ? 0.5 : 1,
              whiteSpace: "nowrap",
              transition: "all 0.12s",
            }}
          >
            <span style={{ fontSize: 12 }}>{chip.emoji}</span>
            {chip.label}
          </button>
        ))}
      </div>

      {/* Input area */}
      <div style={{ padding: "8px 16px 12px" }}>
        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 8,
            maxWidth: 680,
            margin: "0 auto",
            background: "hsl(38 70% 97%)",
            border: "1px solid hsl(var(--border))",
            borderRadius: 14,
            padding: "6px 6px 6px 14px",
            transition: "border-color 0.15s",
          }}
          onFocus={e => (e.currentTarget.style.borderColor = "hsl(var(--b4))")}
          onBlur={e => (e.currentTarget.style.borderColor = "hsl(var(--border))")}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Введіть запитання..."
            data-testid="input-chat-message"
            rows={1}
            disabled={disabled || isStreaming}
            style={{
              flex: 1,
              resize: "none",
              background: "transparent",
              border: "none",
              outline: "none",
              fontFamily: "var(--font-sans)",
              fontSize: 15,
              color: "hsl(var(--b0))",
              lineHeight: 1.5,
              minHeight: 36,
              maxHeight: 180,
              padding: "6px 0",
            }}
          />

          {isStreaming ? (
            <button
              type="button"
              onClick={onStop}
              data-testid="button-stop-stream"
              style={{
                flexShrink: 0,
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "hsl(0 65% 48%)",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "opacity 0.12s",
              }}
            >
              <StopCircle style={{ width: 18, height: 18, color: "#fff" }} />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim() || disabled}
              data-testid="button-send-message"
              style={{
                flexShrink: 0,
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: !input.trim() || disabled ? "hsl(37 35% 88%)" : "hsl(var(--b0))",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: !input.trim() || disabled ? "not-allowed" : "pointer",
                transition: "background 0.15s",
              }}
            >
              <span style={{
                color: !input.trim() || disabled ? "hsl(var(--b4))" : "hsl(var(--primary-foreground))",
                fontSize: 16,
                lineHeight: 1,
              }}>→</span>
            </button>
          )}
        </form>

        <p style={{
          marginTop: 5,
          textAlign: "center",
          fontSize: 11,
          color: "hsl(var(--muted-foreground))",
          opacity: 0.7,
        }}>
          ШІ може помилятися. Перевіряйте інформацію в офіційних джерелах.
        </p>
      </div>
    </div>
  );
}
