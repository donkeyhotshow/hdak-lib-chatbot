import { useState, useRef, useEffect, useCallback } from "react";
import { StopCircle, Send, Sparkles } from "lucide-react";
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
      {/* Chips row - Quick buttons */}
      <div
        style={{
          display: "flex",
          gap: 10,
          overflowX: "auto",
          padding: "12px 20px 8px",
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
        <div style={{
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
        }}>
          <Sparkles style={{ width: 12, height: 12, color: "hsl(32 45% 63%)" }} />
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

          {isStreaming ? (
            <button
              type="button"
              onClick={onStop}
              data-testid="button-stop-stream"
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
              }}
            >
              <Send style={{ 
                width: 18, 
                height: 18, 
                color: !input.trim() || disabled ? "hsl(32 45% 63% / 0.4)" : "#fff" 
              }} />
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
