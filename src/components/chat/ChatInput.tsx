import React, { useRef } from 'react';
import { Send } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  inputValue: string;
  setInputValue: (val: string) => void;
  isTyping: boolean;
  handleSend: (query?: string) => void;
}

export function ChatInput({ inputValue, setInputValue, isTyping, handleSend }: ChatInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hasInput = inputValue.trim().length > 0;

  return (
    <div className="input-area px-4 pb-4 pt-3 shrink-0">
      <div className="input-container max-w-[520px] mx-auto flex items-center gap-3 px-5 py-1.5">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !isTyping) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Ваше запитання..."
          disabled={isTyping}
          className="flex-1 h-11 bg-transparent outline-none text-[14px] text-[#2A2520] placeholder:text-[#7A756F]/45"
          maxLength={2000}
        />
        <button
          onClick={() => handleSend()}
          disabled={!hasInput || isTyping}
          className={cn("send-btn", hasInput && !isTyping && "active")}
          aria-label="Надіслати"
        >
          {isTyping ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            </motion.div>
          ) : (
            <Send size={16} strokeWidth={2} />
          )}
        </button>
      </div>
    </div>
  );
}
