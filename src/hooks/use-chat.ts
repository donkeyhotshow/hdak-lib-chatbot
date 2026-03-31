'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Message, Conversation } from '@/components/chat/types';
import { getFaqResponse } from '@/lib/faq-responses';

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
  const [inputValue, setInputValueRaw] = useState('');
  const setInputValue = useCallback((v: string) => { setInputValueRaw(v); if (v.trim()) setError(null); }, []);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [hasMoreConversations, setHasMoreConversations] = useState(false);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [newConversationId, setNewConversationId] = useState<string | null>(null);
  const [convOffset, setConvOffset] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  // Fix #2: store timer refs so we can clear them on stop/unmount
  const thinkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load conversations on mount
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/conversations?limit=15&offset=0', { signal: controller.signal })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          setConversations(data.items ?? data);
          setHasMoreConversations(data.hasMore ?? false);
          setConvOffset(data.items?.length ?? 0);
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: messages.length > 3 ? 'auto' : 'smooth' });
  }, [messages, isTyping]);

  // Fix #2: cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (thinkTimerRef.current) clearTimeout(thinkTimerRef.current);
      if (typeIntervalRef.current) clearInterval(typeIntervalRef.current);
      abortControllerRef.current?.abort();
    };
  }, []);

  const refreshConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/conversations?limit=15&offset=0');
      if (res.ok) {
        const data = await res.json();
        setConversations(data.items ?? data);
        setHasMoreConversations(data.hasMore ?? false);
        setConvOffset(data.items?.length ?? 0);
      }
    } catch (err) {
      console.error('Не вдалося оновити список розмов:', err);
    }
  }, []);

  const loadConversation = useCallback(async (id: string) => {
    setIsLoadingConversation(true);
    setError(null);
    try {
      const res = await fetch(`/api/conversations/${id}`);
      if (res.ok) {
        const data = await res.json();
        setCurrentConversation(data);
        setMessages(data.messages || []);
      } else {
        setError('Не вдалося завантажити розмову. Перевірте з\'єднання.');
      }
    } catch {
      setIsTyping(false);
      setStreamingMessageId(null);
      setError('Немає з\'єднання з сервером. Перевірте інтернет і спробуйте ще раз.');
    } finally {
      setIsLoadingConversation(false);
    }
  }, []);

  const createNewConversation = useCallback(() => {
    // Fix #2: cancel any running timers
    if (thinkTimerRef.current) { clearTimeout(thinkTimerRef.current); thinkTimerRef.current = null; }
    if (typeIntervalRef.current) { clearInterval(typeIntervalRef.current); typeIntervalRef.current = null; }
    abortControllerRef.current?.abort();
    setCurrentConversation(null);
    setMessages([]);
    setInputValue('');
    setError(null);
    setIsTyping(false);
    setStreamingMessageId(null);
  }, []);


  const renameConversation = useCallback(async (id: string, title: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setConversations(prev => prev.map(c => c.id === id ? { ...c, title } : c));
      if (currentConversation?.id === id) {
        setCurrentConversation(prev => prev ? { ...prev, title } : prev);
      }
    } catch (err) {
      console.error('Не вдалося перейменувати:', err);
      toast({ description: 'Не вдалося перейменувати розмову', duration: 2000 });
    }
  }, [currentConversation, toast]);

  const deleteConversation = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setConversations(prev => {
        const next = prev.filter(c => c.id !== id);
        try { localStorage.setItem('hdak_conv_cache', JSON.stringify({ items: next, ts: Date.now() })); } catch {}
        return next;
      });
      if (currentConversation?.id === id) {
        setCurrentConversation(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('Не вдалося видалити:', err);
      toast({ description: 'Не вдалося видалити розмову', duration: 2000 });
    }
  }, [currentConversation, toast]);

  // Fix #5: consume SSE stream
  const handleSend = useCallback(async (query?: string) => {
    const text = (query || inputValue).trim();
    if (!text || isTyping) return;

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setInputValue('');
    setIsTyping(true);
    setError(null);

    const tempUserId = `temp-user-${crypto.randomUUID()}`;
    const botId = `bot-${crypto.randomUUID()}`;

    setMessages(prev => [...prev, {
      id: tempUserId,
      role: 'USER',
      content: text,
      createdAt: new Date().toISOString(),
    }]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: currentConversation?.id || null, message: text }),
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Помилка сервера');
      }

      if (!res.body) throw new Error('Відсутній потік відповіді');

      // Add empty bot message to stream into
      setMessages(prev => [...prev, {
        id: botId,
        role: 'ASSISTANT',
        content: '',
        createdAt: new Date().toISOString(),
      }]);
      setStreamingMessageId(botId);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let convId = currentConversation?.id || null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const raw = line.slice(5).trim();
          if (!raw) continue;
          try {
            const chunk = JSON.parse(raw);
            if (chunk.conversationId && !convId) {
              convId = chunk.conversationId;
            }
            if (chunk.text) {
              setMessages(prev => prev.map(m =>
                m.id === botId ? { ...m, content: m.content + chunk.text } : m
              ));
            }
            if (chunk.done) {
              setStreamingMessageId(null);
            }
          } catch { /* skip */ }
        }
      }

      // Fix #1: refresh conversations after real API call
      await refreshConversations();

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError('Виникла помилка з\'єднання. Спробуйте ще раз або зателефонуйте до бібліотеки: (057) 731-27-83');
      setMessages(prev => prev.filter(m => m.id !== tempUserId && m.id !== botId));
      setStreamingMessageId(null);
    } finally {
      setIsTyping(false);
      abortControllerRef.current = null;
    }
  }, [inputValue, isTyping, currentConversation, refreshConversations]);

  // Fix #1 + #2: FAQ saves to DB via API, timers tracked in refs
  const handleFaqSend = useCallback((query: string) => {
    if (isTyping) return;

    const faq = getFaqResponse(query);
    if (!faq) {
      handleSend(query);
      return;
    }

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

    // Fix #2: store timer in ref
    thinkTimerRef.current = setTimeout(() => {
      thinkTimerRef.current = null;
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

      // Fix #2: store interval in ref
      typeIntervalRef.current = setInterval(() => {
        currentIndex++;
        const endIndex = Math.min(currentIndex * faq.charsPerStep, fullContent.length);
        setMessages(prev => prev.map(m =>
          m.id === botId ? { ...m, content: fullContent.substring(0, endIndex) } : m
        ));

        if (currentIndex >= totalSteps) {
          clearInterval(typeIntervalRef.current!);
          typeIntervalRef.current = null;
          setStreamingMessageId(null);
          setMessages(prev => prev.map(m =>
            m.id === botId ? { ...m, content: fullContent } : m
          ));

          // Save FAQ conversation to DB after animation completes (only if not stopped)
          if (!faqStoppedRef.current) {
            fetch('/api/faq-save', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ question: query, answer: fullContent }),
            }).then(async res => {
              if (res.ok) {
                const data = await res.json().catch(() => ({}));
                if (data.conversationId) {
                  setNewConversationId(data.conversationId);
                  await refreshConversations();
                }
              }
            }).catch(() => {});
          }
        }
      }, faq.stepDelay);
    }, faq.thinkDelay);
  }, [isTyping, handleSend, refreshConversations]);

  // Fix #2: handleStop clears timers
  const handleStop = useCallback(() => {
    faqStoppedRef.current = true;
    if (thinkTimerRef.current) { clearTimeout(thinkTimerRef.current); thinkTimerRef.current = null; }
    if (typeIntervalRef.current) { clearInterval(typeIntervalRef.current); typeIntervalRef.current = null; }
    abortControllerRef.current?.abort();
    setIsTyping(false);
    setStreamingMessageId(null);
  }, []);

  // Track whether user stopped FAQ animation
  const faqStoppedRef = useRef(false);

  const loadMoreConversations = useCallback(async () => {
    try {
      const res = await fetch(`/api/conversations?limit=15&offset=${convOffset}`);
      if (res.ok) {
        const data = await res.json();
        setConversations(prev => [...prev, ...(data.items ?? [])]);
        setHasMoreConversations(data.hasMore ?? false);
        setConvOffset(prev => prev + (data.items?.length ?? 0));
      }
    } catch {}
  }, [convOffset]);

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
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'USER');
    if (lastUserMsg && !isTyping) {
      // Remove last user + assistant messages, then resend
      setMessages(prev => {
        const lastUserIdx = prev.map(m => m.role).lastIndexOf('USER');
        return prev.slice(0, lastUserIdx);
      });
      setError(null);
      handleSend(lastUserMsg.content);
    }
  }, [messages, isTyping, handleSend]);

  return {
    messages, inputValue, setInputValue, isTyping, isLoadingConversation, error,
    conversations, currentConversation, streamingMessageId,
    hasMoreConversations, messagesEndRef, newConversationId,
    handleSend, handleFaqSend, handleStop,
    loadConversation, createNewConversation, deleteConversation, renameConversation,
    loadMoreConversations, formatTime, copyToClipboard, retryLastMessage,
  };
}
