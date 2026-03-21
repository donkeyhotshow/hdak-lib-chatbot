import { useState, useRef, useEffect, useCallback } from "react";
import { SendHorizontal, StopCircle } from "lucide-react";

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
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [input]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

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

  const canSend = !!input.trim() && !disabled && !isStreaming;

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-2">
      <form onSubmit={handleSubmit}>
        <div
          className="relative flex items-end p-2 rounded-2xl shadow-md transition-all duration-200"
          style={{
            background: "hsl(var(--brown-50))",
            border: "2px solid hsl(var(--brown-200))",
          }}
          onFocusCapture={(e) => {
            (e.currentTarget as HTMLDivElement).style.borderColor = "hsl(var(--brown-400))";
            (e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 0 4px hsl(var(--brown-200) / 0.4)";
          }}
          onBlurCapture={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) {
              (e.currentTarget as HTMLDivElement).style.borderColor = "hsl(var(--brown-200))";
              (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 12px rgb(92 58 30 / 0.08)";
            }
          }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Запитайте про книги, послуги або ресурси бібліотеки..."
            data-testid="input-chat-message"
            aria-label="Повідомлення"
            className="flex-1 resize-none bg-transparent border-0 outline-none min-h-[56px] py-4 px-3 leading-relaxed placeholder:opacity-50"
            style={{
              fontSize: "16px",
              color: "hsl(var(--brown-900))",
              fontFamily: "var(--font-sans)",
            }}
            rows={1}
            disabled={disabled || isStreaming}
          />

          <div className="pb-2 pr-1 shrink-0">
            {isStreaming ? (
              <button
                type="button"
                onClick={onStop}
                data-testid="button-stop-stream"
                aria-label="Зупинити відповідь"
                className="flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-150 shadow-sm"
                style={{
                  background: "hsl(239 68 68)",
                  color: "white",
                }}
              >
                <StopCircle className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!canSend}
                data-testid="button-send-message"
                aria-label="Надіслати повідомлення"
                className="flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-150 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: canSend ? "hsl(var(--brown-700))" : "hsl(var(--brown-300))",
                  color: "hsl(var(--brown-50))",
                }}
              >
                <SendHorizontal className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <p className="mt-2 text-center text-xs" style={{ color: "hsl(var(--brown-400))" }}>
          ШІ може помилятися. Перевіряйте важливу інформацію в офіційних джерелах.
        </p>
      </form>
    </div>
  );
}
