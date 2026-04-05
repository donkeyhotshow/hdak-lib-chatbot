"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop: () => void;
  disabled?: boolean;
  isStreaming?: boolean;
}

const CHIPS = [
  { label: "Каталог", highlight: true },
  { label: "Контакти" },
  { label: "Графік" },
];

export function ChatInput({ onSend, onStop, disabled, isStreaming }: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 116)}px`;
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
    <div>
      <form
        onSubmit={handleSubmit}
        style={{
          background: "#fff",
          border: "1px solid var(--ln2)",
          borderRadius: 16,
          transition: "border-color 0.14s, box-shadow 0.14s",
        }}
      >
        <span className="sr-only" id="kbd-hint">Enter — надіслати, Shift+Enter — новий рядок</span>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Запитайте про бібліотеку…"
          rows={1}
          disabled={disabled || isStreaming}
          aria-label="Введіть запитання"
          aria-describedby="kbd-hint"
          style={{
            display: "block",
            width: "100%",
            background: "transparent",
            border: "none",
            outline: "none",
            color: "var(--ink)",
            fontSize: 15,
            fontFamily: "var(--ff-b)",
            fontWeight: 300,
            resize: "none",
            lineHeight: 1.55,
            padding: "13px 16px 0",
            minHeight: 46,
            maxHeight: 116,
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "5px 7px 7px 12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 3, overflow: "hidden" }}>
            <div style={{ display: "flex", gap: 3, overflowX: "auto" }}>
              {CHIPS.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => handleChip(chip.label)}
                  disabled={disabled || isStreaming}
                  style={{
                    height: 23,
                    padding: "0 9px",
                    flexShrink: 0,
                    background: "transparent",
                    border: chip.highlight
                      ? "0.5px solid var(--goldb)"
                      : "0.5px solid var(--ln2)",
                    borderRadius: 100,
                    color: chip.highlight ? "var(--gold)" : "var(--ink3)",
                    fontSize: 11,
                    fontWeight: 300,
                    fontFamily: "var(--ff-b)",
                    whiteSpace: "nowrap",
                    cursor: disabled || isStreaming ? "not-allowed" : "pointer",
                    opacity: disabled || isStreaming ? 0.5 : 1,
                    transition: "all 0.1s",
                  }}
                >
                  {chip.highlight && (
                    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}>
                      <circle cx="7" cy="7" r="5"/><path d="M14 14l-3.5-3.5"/>
                    </svg>
                  )}
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {isStreaming ? (
            <button
              type="button"
              onClick={onStop}
              aria-label="Зупинити"
              style={{
                width: 30,
                height: 30,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "hsl(0 65% 48%)",
                border: "none",
                borderRadius: 9,
                color: "#fff",
                cursor: "pointer",
                transition: "background 0.12s",
              }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                <rect width="10" height="10" rx="1.5"/>
              </svg>
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim() || disabled}
              aria-label="Надіслати"
              style={{
                width: 30,
                height: 30,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: !input.trim() || disabled ? "var(--paper3)" : "var(--dk1)",
                border: "none",
                borderRadius: 9,
                color: !input.trim() || disabled ? "var(--ink4)" : "rgba(240,225,200,0.9)",
                cursor: !input.trim() || disabled ? "not-allowed" : "pointer",
                transition: "background 0.12s, transform 0.1s",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 7H1"/><path d="M8 2l5 5-5 5"/>
              </svg>
            </button>
          )}
        </div>
      </form>
      <p
        className="hidden md:block"
        style={{
          fontSize: 10,
          color: "var(--ink4)",
          textAlign: "center",
          paddingTop: 6,
        }}
      >
        Enter — надіслати · Shift+Enter — рядок
      </p>
    </div>
  );
}
