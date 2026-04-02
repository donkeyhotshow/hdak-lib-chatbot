import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Send, Square, Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSpeech } from '@/hooks/use-speech';

interface ChatInputProps {
  inputValue: string;
  setInputValue: (val: string) => void;
  isTyping: boolean;
  handleSend: (query?: string) => void;
  onStop?: () => void;
  currentConversationId?: string | null;
  onSpeechError?: (msg: string) => void;
}

export function ChatInput({
  inputValue, setInputValue, isTyping, handleSend, onStop,
  currentConversationId, onSpeechError,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  const hasInput = inputValue.trim().length > 0;
  const charCount = inputValue.length;

  // Auto-resize textarea (max 5 lines ~ 140px)
  const adjustHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 140);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, []);

  // VisualViewport API for mobile keyboard stability
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const handleResize = () => {
      if (containerRef.current) {
        const offset = window.innerHeight - vv.height;
        // Apply keyboard offset as bottom padding to keep input above the keyboard
        containerRef.current.style.paddingBottom = offset > 0
          ? `calc(${offset}px + env(safe-area-inset-bottom, 0px))`
          : '';
      }
    };

    vv.addEventListener('resize', handleResize);
    vv.addEventListener('scroll', handleResize);
    return () => {
      vv.removeEventListener('resize', handleResize);
      vv.removeEventListener('scroll', handleResize);
    };
  }, []);

  const handleSpeechResult = useCallback((text: string) => {
    setInputValue(inputValue ? `${inputValue} ${text}` : text);
    requestAnimationFrame(() => {
      adjustHeight();
      textareaRef.current?.focus();
    });
  }, [inputValue, setInputValue, adjustHeight]);

  const { state: speechState, isSupported: isSpeechSupported, start: startSpeech, stop: stopSpeech } = useSpeech({
    onResult: handleSpeechResult,
    onError: onSpeechError,
    lang: 'uk-UA',
  });

  const isListening = speechState === 'listening';
  const isProcessing = speechState === 'processing';

  useEffect(() => {
    adjustHeight();
  }, [inputValue, adjustHeight]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [currentConversationId]);

  useEffect(() => {
    if (isTyping && isListening) stopSpeech();
  }, [isTyping, isListening, stopSpeech]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.nativeEvent as KeyboardEvent).isComposing) return;
    if (e.key === 'Enter' && !e.shiftKey && !isTyping) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleMicClick = () => {
    if (isListening) stopSpeech();
    else startSpeech();
  };

  return (
    <>
      {/* Background Dimming Overlay */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/20 backdrop-blur-[1.5px] z-40 transition-opacity duration-300 pointer-events-none",
          isFocused ? "opacity-100" : "opacity-0"
        )} 
      />

      <div 
        ref={containerRef}
        className="input-area px-4 pb-4 pt-2 shrink-0 relative z-50"
      >
        <div className="input-wrap max-w-[800px] mx-auto">
          <div className={cn(
            "input-container transition-all duration-300 border-[#D4A853]/10",
            isFocused && "border-[#D4A853]/40 shadow-xl shadow-[#D4A853]/5 ring-4 ring-[#D4A853]/5"
          )}>
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={isListening ? 'Слухаю...' : 'Запитайте про книги, графік або правила...'}
              disabled={isTyping}
              className={cn(
                "input-textarea transition-all py-4 px-5 text-[15px] leading-relaxed", 
                isListening && "placeholder:text-[#B87830] animate-pulse"
              )}
              maxLength={2000}
              aria-label="Запитання до асистента"
            />
            <div className="input-footer px-5 pb-3">
              <span className="input-hint opacity-40 text-[11px] font-medium uppercase tracking-wider">
                {charCount > 1800 ? `${2000 - charCount} символів` : "Enter — надіслати"}
              </span>
              
              <div className="flex items-center gap-2">
                {isSpeechSupported && !isTyping && (
                  <button
                    onClick={handleMicClick}
                    disabled={isProcessing}
                    className={cn(
                      "w-11 h-11 rounded-xl flex items-center justify-center transition-all bg-[#2A2520]/[0.03] text-[#7A756F]",
                      isListening && "bg-[#B87830]/10 text-[#B87830] ring-2 ring-[#B87830]/20",
                      isProcessing && "opacity-40"
                    )}
                    aria-label={isListening ? 'Вимкнути мікрофон' : 'Увімкнути голосовий ввід'}
                  >
                    {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                  </button>
                )}

                {isTyping && onStop ? (
                  <button 
                    onClick={onStop} 
                    className="w-11 h-11 rounded-xl flex items-center justify-center bg-gradient-to-br from-[#1A1612] to-[#2A2520] text-white shadow-lg"
                    aria-label="Зупинити відповідь"
                  >
                    <Square size={16} fill="currentColor" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleSend()}
                    disabled={!hasInput || isTyping}
                    className={cn(
                      "w-11 h-11 rounded-xl flex items-center justify-center transition-all",
                      hasInput && !isTyping 
                        ? "bg-gradient-to-br from-[#D4A853] via-[#B87830] to-[#A66B28] text-white shadow-lg shadow-[#B87830]/20 scale-100" 
                        : "bg-[#2A2520]/[0.04] text-[#2A2520]/20 scale-95"
                    )}
                    aria-label="Надіслати повідомлення"
                  >
                    <Send size={18} className={cn(hasInput && "translate-x-0.5 -translate-y-0.5")} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
