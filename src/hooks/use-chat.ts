'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Message, Conversation } from '@/components/chat/types';
import { getFaqResponse } from '@/lib/faq-responses';
import { getSessionId, SESSION_HEADER } from '@/lib/session';

interface UseChatReturn {
  messages: Message[];
  inputValue: string;
  setInputValue: (v: string) => void;
  isTyping: boolean;
  error: string | null;
  conversations: Conversation[];
  currentConversation: Conversation | null;
  streamingMessageId: string | null;
  hasMoreConversations: boolean;
  isLoadingConversation: boolean;
  isLoadingConversations: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  handleSend: (query?: string) => void;
  handleFaqSend: (query: string) => void;
  handleStop: () => void;
  loadConversation: (id: string) => Promise<void>;
  createNewConversation: () => void;
  deleteConversation: (id: string, e: React.MouseEvent) => Promise<void>;
  renameConversation: (id: string, title: string) => Promise<void>;
  newConversationId: string | null;
  loadMoreConversations: () => Promise<void>;
  formatTime: (d: string) => string;
  copyToClipboard: (t: string) => Promise<void>;
  retryLastMessage: () => void;
}

export function useChat(toast: (opts: { description: string; duration?: number }) => void): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);

  // H2: use ref for inputValue so handleSend doesn't recreate on every keystroke
  const inputValueRef = useRef('');
  const [inputValue, setInputValueState] = useState('');
  const setInputValue = useCallback((v: string) => {
    inputValueRef.current = v;
    setInputValueState(v);
    if (v.trim()) setError(null);
  }, []);

  const [isTyping, setIsTyping] = useState(false);
  // M27: ref mirrors isTyping for synchronous double-send guard
  const isTypingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  // Ref mirror for streamingMessageId to avoid stale closures in handleStop
  const streamingMessageIdRef = useRef<string | null>(null);
  useEffect(() => { streamingMessageIdRef.current = streamingMessageId; }, [streamingMessageId]);
  const [hasMoreConversations, setHasMoreConversations] = useState(false);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  // UX1: loading state for initial conversations list fetch
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [newConversationId, setNewConversationId] = useState<string | null>(null);
  const newConvTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // M2: guard against concurrent loadMore calls
  const isLoadingMoreRef = useRef(false);
  // M20: stable ref for convOffset so loadMoreConversations doesn't recreate
  const convOffsetRef = useRef(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const faqStoppedRef = useRef(false);
  const thinkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const refreshDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // C1: track mounted state to prevent post-unmount state updates
  const isMountedRef = useRef(true);

  // Keep currentConversation in a ref so handleSend doesn't need it in dep array
  const currentConversationRef = useRef<Conversation | null>(null);
  useEffect(() => { currentConversationRef.current = currentConversation; }, [currentConversation]);

  // Session header helper — reads sessionId once after hydration (client-only)
  const sessionIdRef = useRef('');
  useEffect(() => { sessionIdRef.current = getSessionId(); }, []);
  const sessionHeaders = () => ({ [SESSION_HEADER]: sessionIdRef.current });

  // Load conversations on mount; H12: set isMountedRef here (not at declaration)
  // so StrictMode double-mount correctly resets it before the second mount runs
  useEffect(() => {
    isMountedRef.current = true;
    const controller = new AbortController();
    setIsLoadingConversations(true);
    fetch('/api/conversations?limit=15&offset=0', { signal: controller.signal, headers: sessionHeaders() })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!isMountedRef.current) return;
        if (data) {
          // H5: if server says sessionRequired, sessionId wasn't ready yet — will retry on next mount
          setConversations(data.items ?? data);
          setHasMoreConversations(data.hasMore ?? false);
          convOffsetRef.current = data.items?.length ?? 0;
        }
      })
      .catch((err) => {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('Failed to load conversations:', err);
        }
      })
      .finally(() => {
        if (isMountedRef.current) setIsLoadingConversations(false);
      });
    return () => {
      isMountedRef.current = false;
      controller.abort();
      // H15: clean up all timers in the same effect to guarantee order
      if (thinkTimerRef.current) clearTimeout(thinkTimerRef.current);
      if (typeIntervalRef.current) clearInterval(typeIntervalRef.current);
      abortControllerRef.current?.abort();
      if (newConvTimerRef.current) clearTimeout(newConvTimerRef.current);
      if (refreshDebounceRef.current) clearTimeout(refreshDebounceRef.current);
    };
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: messages.length > 3 ? 'auto' : 'smooth' });
  }, [messages, isTyping]);



  const refreshConversations = useCallback(async (): Promise<void> => {
    if (refreshDebounceRef.current) clearTimeout(refreshDebounceRef.current);
    return new Promise<void>((resolve) => {
      refreshDebounceRef.current = setTimeout(async () => {
        refreshDebounceRef.current = null;
        try {
          const res = await fetch('/api/conversations?limit=15&offset=0', { headers: sessionHeaders() });
          if (res.ok && isMountedRef.current) {
            const data = await res.json();
            setConversations(data.items ?? data);
            setHasMoreConversations(data.hasMore ?? false);
            convOffsetRef.current = data.items?.length ?? 0;
          }
        } catch (err) {
          console.error('Не вдалося оновити список розмов:', err);
        }
        resolve();
      }, 300);
    });
  }, []);
  const loadConversation = useCallback(async (id: string) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (thinkTimerRef.current) { clearTimeout(thinkTimerRef.current); thinkTimerRef.current = null; }
    if (typeIntervalRef.current) { clearInterval(typeIntervalRef.current); typeIntervalRef.current = null; }
    isTypingRef.current = false;
    setIsTyping(false);
    setStreamingMessageId(null);

    setIsLoadingConversation(true);
    setError(null);
    try {
      const res = await fetch(`/api/conversations/${id}`, { headers: sessionHeaders() });
      if (res.ok) {
        const data = await res.json();
        // M51: update ref immediately so handleSend uses correct convId before next render
        currentConversationRef.current = data;
        setCurrentConversation(data);
        setMessages(data.messages || []);
      } else {
        setError('Не вдалося завантажити розмову. Перевірте з\'єднання.');
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setIsTyping(false);
      setStreamingMessageId(null);
      setError('Немає з\'єднання з сервером. Перевірте інтернет і спробуйте ще раз.');
    } finally {
      setIsLoadingConversation(false);
    }
  }, []);

  const createNewConversation = useCallback(() => {
    if (thinkTimerRef.current) { clearTimeout(thinkTimerRef.current); thinkTimerRef.current = null; }
    if (typeIntervalRef.current) { clearInterval(typeIntervalRef.current); typeIntervalRef.current = null; }
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    isTypingRef.current = false;
    setCurrentConversation(null);
    setMessages([]);
    setInputValue('');
    setError(null);
    setIsTyping(false);
    setStreamingMessageId(null);
  }, [setInputValue]);

  const renameConversation = useCallback(async (id: string, title: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...sessionHeaders() },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setConversations(prev => prev.map(c => c.id === id ? { ...c, title } : c));
      if (currentConversationRef.current?.id === id) {
        setCurrentConversation(prev => prev ? { ...prev, title } : prev);
      }
    } catch (err) {
      console.error('Не вдалося перейменувати:', err);
      toast({ description: 'Не вдалося перейменувати розмову', duration: 2000 });
    }
  }, [toast]);

  // L1: stop stream when deleting the active conversation
  const deleteConversation = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentConversationRef.current?.id === id) {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
      if (thinkTimerRef.current) { clearTimeout(thinkTimerRef.current); thinkTimerRef.current = null; }
      if (typeIntervalRef.current) { clearInterval(typeIntervalRef.current); typeIntervalRef.current = null; }
      setIsTyping(false);
      setStreamingMessageId(null);
    }
    try {
      const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE', headers: sessionHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setConversations(prev => {
        const next = prev.filter(c => c.id !== id);
        try {
          const cache = JSON.stringify({ items: next, ts: Date.now() });
          localStorage.setItem('hdak_conv_cache', cache);
        } catch (e) {
          // L34: QuotaExceededError or SecurityError — silently clear stale cache
          try { localStorage.removeItem('hdak_conv_cache'); } catch { /* ignore */ }
        }
        return next;
      });
      if (currentConversationRef.current?.id === id) {
        setCurrentConversation(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('Не вдалося видалити:', err);
      toast({ description: 'Не вдалося видалити розмову', duration: 2000 });
    }
  }, [toast]);

  // H2: no inputValue/currentConversation in deps — read from refs instead
  // H20: removed isTyping from deps — use isTypingRef for guard, no need to recreate on every isTyping change
  const handleSend = useCallback(async (query?: string) => {
    const text = (query || inputValueRef.current).trim();
    // M27: use ref for synchronous guard — prevents double-send on rapid clicks
    if (!text || isTypingRef.current) return;

    // H5: abort previous controller BEFORE creating new one
    const prevController = abortControllerRef.current;
    prevController?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setInputValue('');
    isTypingRef.current = true;
    setIsTyping(true);
    setError(null);

    // H7: capture stable IDs for this specific send invocation
    const tempUserId = `temp-user-${crypto.randomUUID()}`;
    const botId = `bot-${crypto.randomUUID()}`;

    setMessages(prev => [...prev, {
      id: tempUserId,
      role: 'USER',
      content: text,
      createdAt: new Date().toISOString(),
      status: 'sent'
    }]);

    let streamStarted = false;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...sessionHeaders() },
        body: JSON.stringify({ conversationId: currentConversationRef.current?.id || null, message: text }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Помилка сервера');
      }

      if (!res.body) throw new Error('Відсутній потік відповіді');

      setMessages(prev => [...prev, {
        id: botId,
        role: 'ASSISTANT',
        content: '',
        createdAt: new Date().toISOString(),
        status: 'sending'
      }]);
      setStreamingMessageId(botId);
      streamStarted = true;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let pendingText = '';
      let flushTimer: ReturnType<typeof setTimeout> | null = null;
      let serverError: string | null = null;

      const flushPending = () => {
        if (!pendingText) return;
        const toFlush = pendingText;
        pendingText = '';
        setMessages(prev => prev.map(m =>
          m.id === botId ? { ...m, content: m.content + toFlush } : m
        ));
      };

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
            flushPending();
            break;
          }
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data:')) continue;
            const raw = line.slice(5).trim();
            if (!raw) continue;
            try {
              const chunk = JSON.parse( raw);
              if (chunk.text) {
                pendingText += chunk.text;
                if (!flushTimer) {
                  flushTimer = setTimeout(() => { flushTimer = null; flushPending(); }, 50);
                }
              }
              if (chunk.error) serverError = chunk.error;
              if (chunk.done || chunk.error) {
                if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
                flushPending();
                setStreamingMessageId(null);
                setMessages(prev => prev.map(m => m.id === botId ? { ...m, status: 'sent' } : m));
              }
            } catch { /* skip malformed */ }
          }
        }
      } finally {
        if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
      }

      if (serverError) {
        setError('Сталася помилка під час відповіді. Показано частковий результат.');
        setStreamingMessageId(null);
        setMessages(prev => prev.map(m => m.id === botId ? { ...m, status: 'error' } : m));
      }

      if (abortControllerRef.current === controller) {
        refreshConversations();
      }

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;

      toast({
        description: "Помилка з'єднання. Перевірте інтернет та спробуйте ще раз.",
      });

      // H1+H7: use functional update with captured IDs — safe against concurrent state
      setMessages(prev => {
        const botMsg = prev.find(m => m.id === botId);
        if (!streamStarted || !botMsg || !botMsg.content) {
          // No partial content — mark user message as error and remove empty bot message if it exists
          return prev.map(m => m.id === tempUserId ? { ...m, status: 'error' as const } : m).filter(m => m.id !== botId);
        }
        // Has partial content — append error marker to our bot message only
        return prev.map(m => m.id === botId
          ? { ...m, content: m.content + '\n\n_⚠️ З\'єднання перервано_', status: 'error' as const }
          : m
        );
      });
      setError('Виникла помилка з\'єднання. Спробуйте ще раз або зателефонуйте до бібліотеки: (057) 731-27-83');
      setStreamingMessageId(null);
    } finally {
      isTypingRef.current = false;
      setIsTyping(false);
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  // H20: removed isTyping — guard uses isTypingRef, no stale closure issue
  }, [setInputValue, refreshConversations, toast]);

  // H6+M21: clear old timers AND abort active fetch before starting FAQ animation
  // H23: uses isTypingRef instead of isTyping — no stale closure, stable deps
  const handleFaqSend = useCallback((query: string) => {
    if (isTypingRef.current) return;

    const faq = getFaqResponse(query);
    if (!faq) {
      handleSend(query);
      return;
    }

    // M21: abort any active LLM fetch stream before starting FAQ
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    // H6: clear any running FAQ animation
    if (thinkTimerRef.current) { clearTimeout(thinkTimerRef.current); thinkTimerRef.current = null; }
    if (typeIntervalRef.current) { clearInterval(typeIntervalRef.current); typeIntervalRef.current = null; }
    setStreamingMessageId(null);

    setError(null);
    faqStoppedRef.current = false;
    const botId = `bot-faq-${crypto.randomUUID()}`;

    setMessages(prev => [...prev, {
      id: `user-faq-${crypto.randomUUID()}`,
      role: 'USER' as const,
      content: query,
      createdAt: new Date().toISOString(),
    }]);

    setIsTyping(true);
    isTypingRef.current = true; // H23: sync ref so double-click guard works during FAQ

    thinkTimerRef.current = setTimeout(() => {
      thinkTimerRef.current = null;
      // thinkDelay done — isTyping stays true via isTypingRef, animation starts
      setIsTyping(false);

      setMessages(prev => [...prev, {
        id: botId,
        role: 'ASSISTANT' as const,
        content: '',
        createdAt: new Date().toISOString(),
      }]);
      setStreamingMessageId(botId);

      let currentIndex = 0;
      const fullContent = faq.content;
      const totalSteps = Math.ceil(fullContent.length / faq.charsPerStep);

      typeIntervalRef.current = setInterval(() => {
        currentIndex++;
        const endIndex = Math.min(currentIndex * faq.charsPerStep, fullContent.length);
        setMessages(prev => prev.map(m =>
          m.id === botId ? { ...m, content: fullContent.substring(0, endIndex) } : m
        ));

        if (currentIndex >= totalSteps) {
          if (typeIntervalRef.current) {
            clearInterval(typeIntervalRef.current);
            typeIntervalRef.current = null;
          }
          setStreamingMessageId(null);
          // H23: reset ref BEFORE setMessages to avoid race with handleSend guard
          // handleStop also resets this ref, so it's safe if interval was cleared early
          isTypingRef.current = false;
          setMessages(prev => prev.map(m =>
            m.id === botId ? { ...m, content: fullContent } : m
          ));

          // C1: check isMountedRef instead of returning cleanup from setInterval callback
          // (React ignores cleanup functions returned from setInterval callbacks)
          if (!faqStoppedRef.current && isMountedRef.current) {
            fetch('/api/faq-save', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...sessionHeaders() },
              body: JSON.stringify({ question: query, answer: fullContent }),
            }).then(async res => {
              if (!isMountedRef.current) return; // C1: guard post-unmount state updates
              if (res.ok) {
                const data = await res.json().catch(() => ({}));
                if (data.conversationId) {
                  setNewConversationId(data.conversationId);
                  if (newConvTimerRef.current) clearTimeout(newConvTimerRef.current);
                  newConvTimerRef.current = setTimeout(() => {
                    if (isMountedRef.current) setNewConversationId(null);
                  }, 5000);
                  await refreshConversations();
                }
              }
            }).catch((err) => {
              // C6: log FAQ save failures — conversation won't persist after reload
              console.error('FAQ save failed — conversation will not persist:', err);
              if (isMountedRef.current) {
                toast({ description: 'Не вдалося зберегти розмову. Вона не збережеться після перезавантаження.', duration: 4000 });
              }
            });
          }
        }
      }, faq.stepDelay);
    }, faq.thinkDelay);
  // H23: removed isTyping from deps — guard uses isTypingRef synchronously
  }, [handleSend, refreshConversations, toast]);

  const handleStop = useCallback(() => {
    faqStoppedRef.current = true;
    if (thinkTimerRef.current) { clearTimeout(thinkTimerRef.current); thinkTimerRef.current = null; }
    if (typeIntervalRef.current) { clearInterval(typeIntervalRef.current); typeIntervalRef.current = null; }
    abortControllerRef.current?.abort();
    
    isTypingRef.current = false;
    setIsTyping(false);
    
    // Use ref to avoid stale closure — read current value synchronously
    const currentStreamingId = streamingMessageIdRef.current;
    if (currentStreamingId) {
      setMessages(prev => prev.map(m => m.id === currentStreamingId ? { ...m, status: 'sent' } : m));
    }
    setStreamingMessageId(null);
  }, []);

  // M2+M20: prevent duplicate entries; read offset from ref so callback is stable
  const loadMoreConversations = useCallback(async () => {
    if (isLoadingMoreRef.current) return;
    isLoadingMoreRef.current = true;
    try {
      const res = await fetch(`/api/conversations?limit=15&offset=${convOffsetRef.current}`, { headers: sessionHeaders() });
      if (res.ok && isMountedRef.current) {
        const data = await res.json();
        setConversations(prev => [...prev, ...(data.items ?? [])]);
        setHasMoreConversations(data.hasMore ?? false);
        convOffsetRef.current += (data.items?.length ?? 0);
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('Failed to load more conversations:', err);
      }
    }
    finally { isLoadingMoreRef.current = false; }
  }, []);

  const formatTime = useCallback((d: string) => {
    try { return new Date(d).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }); }
    catch { return ''; }
  }, []);

  const copyToClipboard = useCallback(async (t: string) => {
    try {
      await navigator.clipboard.writeText(t);
      toast({ description: '✓ Скопійовано', duration: 2000 });
    } catch {
      toast({ description: 'Не вдалося скопіювати', duration: 2000 });
    }
  }, [toast]);

  const retryLastMessage = useCallback(() => {
    if (isTypingRef.current) return;
    // Read last user message content before modifying state
    const lastUserContent = (() => {
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'USER') return messages[i].content;
      }
      return null;
    })();
    if (!lastUserContent) return;
    // Remove last user message + any trailing bot response, then resend
    setMessages(prev => {
      const lastUserIdx = [...prev].map(m => m.role).lastIndexOf('USER');
      if (lastUserIdx === -1) return prev;
      return prev.slice(0, lastUserIdx);
    });
    setError(null);
    isTypingRef.current = false;
    handleSend(lastUserContent);
  }, [handleSend, messages]);

  return {
    messages, inputValue, setInputValue, isTyping, isLoadingConversation, isLoadingConversations, error,
    conversations, currentConversation, streamingMessageId,
    hasMoreConversations, messagesEndRef, newConversationId,
    handleSend, handleFaqSend, handleStop,
    loadConversation, createNewConversation, deleteConversation, renameConversation,
    loadMoreConversations, formatTime, copyToClipboard, retryLastMessage,
  };
}
