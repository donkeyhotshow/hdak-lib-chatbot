'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Menu } from 'lucide-react';
import { Message, Conversation } from '@/components/chat/types';
import { Sidebar } from '@/components/chat/Sidebar';
import { ChatInput } from '@/components/chat/ChatInput';
import { ChatArea } from '@/components/chat/ChatArea';

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/conversations', { signal: controller.signal })
      .then(res => res.ok && res.json())
      .then(data => data && setConversations(data))
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
      const convRes = await fetch('/api/conversations');
      if (convRes.ok) setConversations(await convRes.json());
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

  const formatTime = useCallback((d: string) => {
    try { return new Date(d).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }); }
    catch { return ''; }
  }, []);

  const copyToClipboard = useCallback((t: string) => navigator.clipboard.writeText(t), []);

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
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative h-full overflow-hidden">
        {/* Header */}
        <header className="relative h-12 flex items-center justify-between px-4 border-b border-[#2A2520]/[0.04] bg-white/50 backdrop-blur-sm shrink-0">
          <div className="w-9 shrink-0">
            {!isSidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[#7A756F] hover:text-[#2A2520] hover:bg-[#2A2520]/[0.03] transition-all"
                aria-label="Відкрити меню"
              >
                <Menu size={17} strokeWidth={1.5} />
              </button>
            )}
          </div>
          <span className="logo-text text-[22px]">ХДАК</span>
          <div className="w-9 flex justify-end shrink-0">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#1A1612] to-[#2A2520] flex items-center justify-center text-[9px] font-semibold text-[#D4A853]">
              В
            </div>
          </div>
        </header>

        <div className="h-px bg-gradient-to-r from-transparent via-[#B87830]/20 to-transparent shrink-0" />

        <ChatArea
          messages={messages}
          isTyping={isTyping}
          error={error}
          handleSend={handleSend}
          messagesEndRef={messagesEndRef}
          formatTime={formatTime}
          copyToClipboard={copyToClipboard}
        />

        <ChatInput
          inputValue={inputValue}
          setInputValue={setInputValue}
          isTyping={isTyping}
          handleSend={handleSend}
        />
      </main>
    </div>
  );
}
