import React, { useRef } from 'react';
import { Send, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  inputValue: string;
  setInputValue: (val: string) => void;
  isTyping: boolean;
  handleSend: (query?: string) => void;
  onStop?: () => void;
}

export function ChatInput({ inputValue, setInputValue, isTyping, handleSend, onStop }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasInput = inputValue.trim().length > 0;
  const charCount = inputValue.length;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isTyping) {
      e.preventDefault();
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

  return (
    <div className="input-area px-4 pb-5 pt-2 shrink-0">
      <div className="input-wrap max-w-[680px] mx-auto">
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
          />
          <div className="input-footer">
            <span className="input-hint">Enter  надіслати  Shift+Enter  новий рядок</span>
            <div className="flex items-center gap-2">
              {charCount > 100 && (
                <span className={cn("input-counter", charCount > 1800 && "text-red-400/70")}>
                  {charCount}/2000
                </span>
              )}
              {isTyping && onStop ? (
                <button onClick={onStop} className="send-btn active" aria-label="Зупинити">
                  <Square size={13} strokeWidth={2} fill="currentColor" />
                </button>
              ) : (
                <button
                  onClick={() => handleSend()}
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