import React, { useRef, useEffect, useCallback } from 'react';
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
  const hasInput = inputValue.trim().length > 0;
  const charCount = inputValue.length;

  // Speech result handler — appends transcript to current input
  const handleSpeechResult = useCallback((text: string) => {
    setInputValue(inputValue ? `${inputValue} ${text}` : text);
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
        textareaRef.current.focus();
      }
    });
  }, [inputValue, setInputValue]);

  const { state: speechState, isSupported: isSpeechSupported, start: startSpeech, stop: stopSpeech } = useSpeech({
    onResult: handleSpeechResult,
    onError: onSpeechError,
    lang: 'uk-UA',
  });

  const isListening = speechState === 'listening';
  const isProcessing = speechState === 'processing';

  // M4+M16: reset height when input is cleared externally
  const prevValueRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevValueRef.current !== null && prevValueRef.current !== '' && inputValue === '' && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    prevValueRef.current = inputValue;
  }, [inputValue]);

  // UX5: auto-focus textarea when conversation changes
  useEffect(() => {
    textareaRef.current?.focus();
  }, [currentConversationId]);

  // Stop speech recognition when bot starts typing
  useEffect(() => {
    if (isTyping && isListening) stopSpeech();
  }, [isTyping, isListening, stopSpeech]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
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

  const handleMicClick = () => {
    if (isListening) {
      stopSpeech();
    } else {
      startSpeech();
    }
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
            placeholder={isListening ? 'Говоріть...' : 'Напишіть запитання...'}
            disabled={isTyping}
            className={cn("input-textarea transition-colors", isListening && "placeholder:text-[#B87830]/60")}
            maxLength={2000}
            aria-label="Повідомлення для чату"
            aria-describedby="chat-input-hint"
          />
          <div className="input-footer">
            <span className="input-hint" id="chat-input-hint">Enter — надіслати · Shift+Enter — новий рядок</span>
            <div className="flex items-center gap-2">
              {charCount > 1500 && (
                <span className={cn(
                  "input-counter transition-colors",
                  charCount > 1900 ? "text-red-500/80 font-medium" : charCount > 1700 ? "text-orange-400/70" : "text-[#7A756F]/45"
                )}>
                  {2000 - charCount} залишилось
                </span>
              )}

              {isSpeechSupported && !isTyping && (
                <button
                  onClick={handleMicClick}
                  disabled={isProcessing}
                  className={cn(
                    "send-btn transition-all",
                    isListening && "mic-btn-listening",
                    isProcessing && "opacity-50 cursor-wait"
                  )}
                  aria-label={isListening ? 'Зупинити запис' : 'Голосовий ввід'}
                  title={isListening ? 'Зупинити запис' : 'Голосовий ввід'}
                >
                  {isListening
                    ? <MicOff size={15} strokeWidth={2} className="text-[#B87830]" />
                    : <Mic size={15} strokeWidth={2} />
                  }
                </button>
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
