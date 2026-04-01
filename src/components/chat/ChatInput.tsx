import React, { useRef, useEffect } from 'react';
import { Send, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  inputValue: string;
  setInputValue: (val: string) => void;
  isTyping: boolean;
  handleSend: (query?: string) => void;
  onStop?: () => void;
  currentConversationId?: string | null;
}

export function ChatInput({ inputValue, setInputValue, isTyping, handleSend, onStop, currentConversationId }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasInput = inputValue.trim().length > 0;
  const charCount = inputValue.length;

  // M4+M16: reset height when input is cleared externally
  // Use null as initial value to avoid false positive on first render with non-empty input
  const prevValueRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevValueRef.current !== null && prevValueRef.current !== '' && inputValue === '' && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    prevValueRef.current = inputValue;
  }, [inputValue]);

  // UX5: auto-focus textarea when conversation changes (new chat or switch)
  useEffect(() => {
    textareaRef.current?.focus();
  }, [currentConversationId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Guard against IME composition (CJK input methods)
    if ((e.nativeEvent as KeyboardEvent).isComposing) return;
    if (e.key === 'Enter' && !e.shiftKey && !isTyping) {
      e.preventDefault();
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  };

  const handleSendClick = () => {
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    handleSend();
  };

  return (
    <div className="input-area px-4 pb-5 pt-2 shrink-0">
      <div className="input-wrap max-w-[900px] mx-auto">
        <div className="input-container">
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Напишіть запитання..."
            disabled={isTyping}
            className="input-textarea"
            maxLength={2000}
            aria-label="Повідомлення для чату"
            aria-describedby="chat-input-hint"
          />
          <div className="input-footer">
            <span className="input-hint" id="chat-input-hint">Enter  надіслати  Shift+Enter  новий рядок</span>
            <div className="flex items-center gap-2">
              {charCount > 1500 && (
                <span className={cn(
                  "input-counter transition-colors",
                  charCount > 1900 ? "text-red-500/80 font-medium" : charCount > 1700 ? "text-orange-400/70" : "text-[#7A756F]/45"
                )}>
                  {2000 - charCount} залишилось
                </span>
              )}
              {isTyping && onStop ? (
                <button onClick={onStop} className="send-btn active" aria-label="Зупинити">
                  <Square size={13} strokeWidth={2} fill="currentColor" />
                </button>
              ) : (
                <button
                  onClick={handleSendClick}
                  disabled={!hasInput || isTyping}
                  className={cn("send-btn", hasInput && !isTyping && "active")}
                  aria-label="Надіслати"
                >
                  <Send size={15} strokeWidth={2} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}