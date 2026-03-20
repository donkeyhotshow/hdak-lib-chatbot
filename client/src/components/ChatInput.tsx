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

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [input]);

  // Focus on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || disabled || isStreaming) return;
    onSend(trimmed);
    setInput("");
    // reset height
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }, [input, disabled, isStreaming, onSend]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const canSend = input.trim().length > 0 && !disabled && !isStreaming;

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-3 pt-2">
      <form onSubmit={handleSubmit}>
        <div className={`
          relative flex items-end gap-2 px-4 py-3
          bg-[#faf6f0] border-2 rounded-2xl shadow-md
          transition-all duration-200
          ${isStreaming
            ? "border-amber-400/50 shadow-amber-200/40"
            : "border-amber-300/60 focus-within:border-amber-500/60 focus-within:shadow-amber-100/60"
          }
        `}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Задайте питання про каталог, послуги або ресурси бібліотеки..."
            data-testid="input-chat-message"
            disabled={disabled || isStreaming}
            rows={1}
            className="
              flex-1 min-h-[42px] max-h-[200px] resize-none bg-transparent outline-none border-none
              text-[15px] text-amber-950 placeholder:text-amber-500/50
              py-1.5 leading-relaxed font-sans disabled:opacity-60
            "
          />

          {isStreaming ? (
            <button
              type="button"
              onClick={onStop}
              data-testid="button-stop-stream"
              className="
                shrink-0 w-9 h-9 rounded-xl mb-0.5
                bg-red-600 hover:bg-red-500 text-white
                flex items-center justify-center
                transition-colors shadow-sm
              "
            >
              <StopCircle className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!canSend}
              data-testid="button-send-message"
              className="
                shrink-0 w-9 h-9 rounded-xl mb-0.5
                bg-amber-800 hover:bg-amber-700 text-amber-100
                flex items-center justify-center
                transition-all shadow-sm
                disabled:opacity-35 disabled:cursor-not-allowed
              "
            >
              <SendHorizontal className="w-4 h-4" />
            </button>
          )}
        </div>

        <p className="text-center text-[11px] text-amber-600/45 mt-2 font-medium">
          ШІ може помилятися. Перевіряйте важливу інформацію в офіційних джерелах.
        </p>
      </form>
    </div>
  );
}
