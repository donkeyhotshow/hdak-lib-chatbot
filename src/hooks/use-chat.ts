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
  loadMoreConversations: () => Promise<void>;
  formatTime: (d: string) => string;
  copyToClipboard: (t: string) => Promise<void>;
}

export function useChat(toast: (opts: { description: string; duration?: number }) => void): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [hasMoreConversations, setHasMoreConversations] = useState(false);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
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
    const res = await fetch('/api/conversations?limit=15&offset=0');
    if (res.ok) {
      const data = await res.json();
      setConversations(data.items ?? data);
      setHasMoreConversations(data.hasMore ?? false);
      setConvOffset(data.items?.length ?? 0);
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
        setError('Не вдалося завантажити розмову');
      }
    } catch {
      setIsTyping(false);
      setStreamingMessageId(null);
      setError('Помилка мережі. Перевірте з\'єднання.');
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

  const deleteConversation = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
      setConversations(prev => prev.filter(c => c.id !== id));
      if (currentConversation?.id === id) {
        setCurrentConversation(null);
        setMessages([]);
      }
    } catch {}
  }, [currentConversation]);

  // Fix #5: consume SSE stream
  const handleSend = useCallback(async (query?: string) => {
    const text = (query || inputValue).trim();
    if (!text || isTyping) return;

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setInputValue('');
    setIsTyping(true);
    setError(null);

    const tempUserId = `temp-user-${Date.now()}`;
    const botId = `bot-${Date.now()}`;

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
        throw new Error(errData.error || 'Failed');
      }

      if (!res.body) throw new Error('No stream body');

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
      setError('Не вдалося надіслати повідомлення. Спробуйте ще раз.');
      setMessages(prev => prev.filter(m => m.id !== tempUserId && m.id !== botId));
      setStreamingMessageId(null);
    } finally {
      setIsTyping(false);
      abortControllerRef.current = null;
    }
  }, [inputValue, isTyping, currentConversation, loadConversation, refreshConversations]);

  // Fix #1 + #2: FAQ saves to DB via API, timers tracked in refs
  const handleFaqSend = useCallback((query: string) => {
    if (isTyping) return;

    const faq = getFaqResponse(query);
    if (!faq) {
      handleSend(query);
      return;
    }

    setError(null);
    const botId = `bot-faq-${Date.now()}`;

    setMessages(prev => [...prev, {
      id: `user-faq-${Date.now()}`,
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

          // Fix #1: save FAQ conversation to DB after animation completes
          fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              conversationId: null,
              message: query,
              _faqAnswer: fullContent, // hint for server
            }),
          }).then(async res => {
            if (res.ok && res.body) {
              // Drain the stream silently to get conversationId
              const reader = res.body.getReader();
              const decoder = new TextDecoder();
              let buf = '';
              let convId: string | null = null;
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buf += decoder.decode(value, { stream: true });
                const lines = buf.split('\n');
                buf = lines.pop() ?? '';
                for (const line of lines) {
                  if (!line.startsWith('data:')) continue;
                  try {
                    const chunk = JSON.parse(line.slice(5).trim());
                    if (chunk.conversationId) convId = chunk.conversationId;
                    if (chunk.done) break;
                  } catch { /* skip */ }
                }
              }
              if (convId) {
                // conversation will be loaded via refreshConversations
                await refreshConversations();
              }
            }
          }).catch(() => {});
        }
      }, faq.stepDelay);
    }, faq.thinkDelay);
  }, [isTyping, handleSend, refreshConversations]);

  // Fix #2: handleStop clears timers
  const handleStop = useCallback(() => {
    if (thinkTimerRef.current) { clearTimeout(thinkTimerRef.current); thinkTimerRef.current = null; }
    if (typeIntervalRef.current) { clearInterval(typeIntervalRef.current); typeIntervalRef.current = null; }
    abortControllerRef.current?.abort();
    setIsTyping(false);
    setStreamingMessageId(null);
  }, []);

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
    await navigator.clipboard.writeText(t);
    toast({ description: 'Скопіювано', duration: 1500 });
  }, [toast]);

  return {
    messages, inputValue, setInputValue, isTyping, isLoadingConversation, error,
    conversations, currentConversation, streamingMessageId,
    hasMoreConversations, messagesEndRef,
    handleSend, handleFaqSend, handleStop,
    loadConversation, createNewConversation, deleteConversation,
    loadMoreConversations, formatTime, copyToClipboard,
  };
}
