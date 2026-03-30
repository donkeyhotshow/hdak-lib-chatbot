'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Menu, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Message, Conversation } from '@/components/chat/types';
import { Sidebar } from '@/components/chat/Sidebar';
import { ChatInput } from '@/components/chat/ChatInput';
import { ChatArea } from '@/components/chat/ChatArea';
import { getFaqResponse } from '@/lib/faq-responses';

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSidebarOpen, setSidebarOpen] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 768 : true);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [hasMoreConversations, setHasMoreConversations] = useState(false);
  const [convOffset, setConvOffset] = useState(0);
  
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: messages.length > 3 ? 'auto' : 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (!isSidebarOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (window.innerWidth < 768 && sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        setSidebarOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isSidebarOpen]);

  const loadConversation = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}`);
      if (res.ok) {
        const data = await res.json();
        setCurrentConversation(data);
        setMessages(data.messages || []);
        setError(null);
      }
    } catch {
      setError('Не вдалося завантажити розмову');
    }
  }, []);

  const createNewConversation = useCallback(() => {
    abortControllerRef.current?.abort();
    setCurrentConversation(null);
    setMessages([]);
    setInputValue('');
    setError(null);
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

  const handleSend = useCallback(async (query?: string) => {
    const text = (query || inputValue).trim();
    if (!text || isTyping) return;

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setInputValue('');
    setIsTyping(true);
    setError(null);

    const tempId = `${Date.now()}`;
    setMessages(prev => [...prev, {
      id: tempId,
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
      
      const data = await res.json();
      const convRes = await fetch('/api/conversations?limit=15&offset=0');
      if (convRes.ok) {
        const convData = await convRes.json();
        setConversations(convData.items ?? convData);
        setHasMoreConversations(convData.hasMore ?? false);
        setConvOffset(convData.items?.length ?? 0);
      }
      await loadConversation(data.conversationId);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError('Не вдалося надіслати повідомлення');
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } finally {
      setIsTyping(false);
      abortControllerRef.current = null;
    }
  }, [inputValue, isTyping, currentConversation, loadConversation]);

  /** Симуляція відповіді для кнопок FAQ — без запиту до API */
  const handleFaqSend = useCallback((query: string) => {
    if (isTyping) return;

    const faq = getFaqResponse(query);
    if (!faq) {
      // Якщо немає готової відповіді — відправляємо через API
      handleSend(query);
      return;
    }

    setError(null);

    const userId = `user-${Date.now()}`;
    const botId = `bot-${Date.now()}`;

    // 1. Додаємо повідомлення користувача
    setMessages(prev => [...prev, {
      id: userId,
      role: 'USER' as const,
      content: query,
      createdAt: new Date().toISOString(),
    }]);

    // 2. Показуємо індикатор «друкує…»
    setIsTyping(true);

    // 3. Після затримки «думання» — починаємо «друкувати» відповідь
    const thinkTimer = setTimeout(() => {
      setIsTyping(false);

      // Додаємо порожнє повідомлення бота
      setMessages(prev => [...prev, {
        id: botId,
        role: 'ASSISTANT' as const,
        content: '',
        createdAt: new Date().toISOString(),
        simulated: true,
      }]);
      setStreamingMessageId(botId);

      // Поступово заповнюємо контент
      let currentIndex = 0;
      const fullContent = faq.content;
      const totalSteps = Math.ceil(fullContent.length / faq.charsPerStep);

      const typeInterval = setInterval(() => {
        currentIndex++;
        const endIndex = Math.min(currentIndex * faq.charsPerStep, fullContent.length);
        const visibleContent = fullContent.substring(0, endIndex);

        setMessages(prev => prev.map(m =>
          m.id === botId ? { ...m, content: visibleContent } : m
        ));

        if (currentIndex >= totalSteps) {
          clearInterval(typeInterval);
          setStreamingMessageId(null);
          // Фінальна підстраховка — гарантуємо повний текст
          setMessages(prev => prev.map(m =>
            m.id === botId ? { ...m, content: fullContent } : m
          ));
        }
      }, faq.stepDelay);

    }, faq.thinkDelay);

  }, [isTyping, handleSend]);

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

  const handleStop = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsTyping(false);
  }, []);

  const formatTime = useCallback((d: string) => {
    try { return new Date(d).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }); }
    catch { return ''; }
  }, []);

  const copyToClipboard = useCallback((t: string) => {
    navigator.clipboard.writeText(t).then(() => {
      toast({ description: 'Скопіювано', duration: 1500 });
    });
  }, [toast]);

  return (
    <div className="h-screen flex bg-antique-paper bg-ambient-glow overflow-hidden">
      <Sidebar
        isOpen={isSidebarOpen}
        setIsOpen={setSidebarOpen}
        sidebarRef={sidebarRef}
        conversations={conversations}
        currentConversation={currentConversation}
        loadConversation={loadConversation}
        deleteConversation={deleteConversation}
        createNewConversation={createNewConversation}
        hasMore={hasMoreConversations}
        loadMore={loadMoreConversations}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative h-full overflow-hidden">
        {/* Header */}
        <header className="relative h-12 flex items-center justify-between px-4 border-b border-[#2A2520]/[0.04] bg-white/50 backdrop-blur-sm shrink-0">
          <button
            onClick={() => setSidebarOpen(v => !v)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#7A756F] hover:text-[#2A2520] hover:bg-[#2A2520]/[0.03] transition-all"
            aria-label={isSidebarOpen ? "Закрити меню" : "Відкрити меню"}
          >
            {isSidebarOpen ? <X size={17} strokeWidth={1.5} /> : <Menu size={17} strokeWidth={1.5} />}
          </button>
          <span className="logo-text text-[22px]">ХДАК</span>
          <div className="w-9" />
        </header>

        <div className="h-px bg-gradient-to-r from-transparent via-[#B87830]/20 to-transparent shrink-0" />

        <ChatArea
          messages={messages}
          isTyping={isTyping}
          error={error}
          handleSend={handleSend}
          handleFaqSend={handleFaqSend}
          streamingMessageId={streamingMessageId}
          messagesEndRef={messagesEndRef}
          formatTime={formatTime}
          copyToClipboard={copyToClipboard}
        />

        <ChatInput
          inputValue={inputValue}
          setInputValue={setInputValue}
          isTyping={isTyping}
          handleSend={handleSend}
          onStop={handleStop}
        />
      </main>
    </div>
  );
}
