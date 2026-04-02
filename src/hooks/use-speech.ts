'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export type SpeechState = 'idle' | 'listening' | 'processing' | 'error';

interface UseSpeechOptions {
  onResult: (text: string) => void;
  onError?: (message: string) => void;
  lang?: string;
}

interface UseSpeechReturn {
  state: SpeechState;
  isSupported: boolean;
  start: () => void;
  stop: () => void;
}

// Extend Window type for cross-browser SpeechRecognition
// SpeechRecognition is not in all TS lib.dom versions — define minimal interface
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}
interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}
interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
interface SpeechRecognitionConstructor {
  new(): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export function useSpeech({ onResult, onError, lang = 'uk-UA' }: UseSpeechOptions): UseSpeechReturn {
  const [state, setState] = useState<SpeechState>('idle');
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  // BUG FIX: store callbacks in refs so start() always uses latest version
  // without needing them in the dependency array (avoids recreation on every render)
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  useEffect(() => { onResultRef.current = onResult; }, [onResult]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  // Check API availability once (client-only)
  const isSupported = typeof window !== 'undefined' &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      recognitionRef.current?.abort();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const stop = useCallback(() => {
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    if (isMountedRef.current) setState('idle');
  }, []);

  const start = useCallback(() => {
    if (!isSupported) return;

    // Stop any existing session
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }

    const SpeechRecognitionAPI = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = lang;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onstart = () => {
      if (!isMountedRef.current) return;
      setState('listening');
      // Auto-stop after 10s of silence
      timeoutRef.current = setTimeout(() => {
        recognition.stop();
      }, 10_000);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (!isMountedRef.current) return;
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
      setState('processing');
      const transcript = event.results[0]?.[0]?.transcript?.trim() ?? '';
      if (transcript) {
        onResultRef.current(transcript);
      }
      setState('idle');
      recognitionRef.current = null;
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (!isMountedRef.current) return;
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
      recognitionRef.current = null;

      // 'aborted' is triggered by our own stop() — not a real error
      if (event.error === 'aborted') {
        setState('idle');
        return;
      }

      setState('error');

      const messages: Record<string, string> = {
        'not-allowed': 'Доступ до мікрофона заборонено. Дозвольте доступ у налаштуваннях браузера.',
        'no-speech': 'Мовлення не розпізнано. Спробуйте ще раз.',
        'network': 'Помилка мережі. Перевірте з\'єднання.',
        'audio-capture': 'Мікрофон недоступний.',
        'service-not-allowed': 'Сервіс розпізнавання мовлення недоступний.',
      };
      const msg = messages[event.error] ?? 'Помилка розпізнавання мовлення.';
      onErrorRef.current?.(msg);

      // Reset to idle after showing error
      setTimeout(() => {
        if (isMountedRef.current) setState('idle');
      }, 3000);
    };

    recognition.onend = () => {
      if (!isMountedRef.current) return;
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
      // Only reset if we didn't already handle result/error
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
        setState('idle');
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported, lang]);

  return { state, isSupported, start, stop };
}
