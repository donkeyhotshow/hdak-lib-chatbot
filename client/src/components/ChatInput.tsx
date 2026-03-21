import { useState, useRef, useEffect, useCallback } from "react";
import { SendHorizontal, StopCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

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

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-2">
      <form onSubmit={handleSubmit} className="relative group">
        <div className="
          relative flex items-end p-2 bg-background
          border-2 border-border/60 rounded-2xl shadow-sm
          focus-within:border-primary/40 focus-within:ring-4 focus-within:ring-primary/5
          transition-all duration-200
        ">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Запитайте про книги, послуги або ресурси бібліотеки..."
            data-testid="input-chat-message"
            aria-label="Повідомлення"
            className="
              min-h-[56px] w-full resize-none bg-transparent border-0
              focus-visible:ring-0 focus-visible:ring-offset-0
              py-4 px-4 placeholder:text-muted-foreground/60
              text-[16px] leading-relaxed
            "
            style={{ fontSize: "16px" }}
            rows={1}
            disabled={disabled || isStreaming}
          />

          <div className="pb-2 pr-2">
            {isStreaming ? (
              <Button
                type="button"
                onClick={onStop}
                size="icon"
                data-testid="button-stop-stream"
                aria-label="Зупинити відповідь"
                className="rounded-xl h-11 w-11 shrink-0 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              >
                <StopCircle className="w-5 h-5" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || disabled}
                data-testid="button-send-message"
                aria-label="Надіслати повідомлення"
                className="rounded-xl h-11 w-11 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
              >
                <SendHorizontal className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        <p className="mt-2 text-center text-xs text-muted-foreground/60">
          ШІ може помилятися. Перевіряйте важливу інформацію в офіційних джерелах.
        </p>
      </form>
    </div>
  );
}
