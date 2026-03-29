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
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  return (
    <div className="input-area px-4 pb-4 pt-3 shrink-0">
      <div className="input-container max-w-[520px] mx-auto flex items-end gap-3 px-5 py-2.5 min-h-[56px]">
        <textarea
          ref={textareaRef}
          rows={1}
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Ваше запитання..."
          disabled={isTyping}
          className="flex-1 bg-transparent outline-none text-[14px] text-[#2A2520] placeholder:text-[#7A756F]/45 resize-none py-1.5 custom-scrollbar max-h-[120px]"
          maxLength={2000}
        />
        {isTyping && onStop ? (
          <button
            onClick={onStop}
            className="send-btn mb-1 active"
            aria-label="Зупинити"
            title="Зупинити генерацію"
          >
            <Square size={14} strokeWidth={2} fill="currentColor" />
          </button>
        ) : (
          <button
            onClick={() => handleSend()}
            disabled={!hasInput || isTyping}
            className={cn("send-btn mb-1", hasInput && !isTyping && "active")}
            aria-label="Надіслати"
          >
            <Send size={16} strokeWidth={2} />
          </button>
        )}
      </div>
    </div>
  );
}