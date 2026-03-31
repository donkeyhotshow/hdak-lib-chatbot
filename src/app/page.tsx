'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Menu, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useChat } from '@/hooks/use-chat';
import { Sidebar } from '@/components/chat/Sidebar';
import { ChatInput } from '@/components/chat/ChatInput';
import { ChatArea } from '@/components/chat/ChatArea';

export default function ChatPage() {
  // Fix #18: avoid hydration mismatch - start closed, open on desktop after mount
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    setSidebarOpen(window.innerWidth >= 768);
  }, []);

  // Hide header on scroll down (mobile only)
  useEffect(() => {
    const el = document.querySelector('.chat-scroll-area');
    if (!el) return;
    const onScroll = () => {
      if (window.innerWidth >= 768) return;
      const y = el.scrollTop;
      setHeaderVisible(y < lastScrollY.current || y < 60);
      lastScrollY.current = y;
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const {
    messages, inputValue, setInputValue, isTyping, isLoadingConversation, error,
    conversations, currentConversation, streamingMessageId,
    hasMoreConversations, messagesEndRef,
    handleSend, handleFaqSend, handleStop,
    loadConversation, createNewConversation, deleteConversation, renameConversation,
    newConversationId,
    loadMoreConversations, formatTime, copyToClipboard, retryLastMessage,
  } = useChat(toast);

  // Close sidebar on mobile click-outside
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
        renameConversation={renameConversation}
        newConversationId={newConversationId}
        createNewConversation={createNewConversation}
        hasMore={hasMoreConversations}
        loadMore={loadMoreConversations}
      />

      <main className="flex-1 flex flex-col min-w-0 relative h-full overflow-hidden">
        <header className={`relative h-12 flex items-center justify-between px-4 border-b border-[#2A2520]/[0.04] bg-white/50 backdrop-blur-sm shrink-0 transition-transform duration-200 ${!headerVisible ? '-translate-y-full md:translate-y-0' : ''}`}>
          <button
            onClick={() => setSidebarOpen(v => !v)}
            className="w-11 h-11 flex items-center justify-center rounded-xl text-[#7A756F] hover:text-[#2A2520] hover:bg-[#2A2520]/[0.04] transition-all"
            aria-label={isSidebarOpen ? 'Закрити меню' : 'Відкрити меню'}
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
          isLoadingConversation={isLoadingConversation}
          error={error}
          handleSend={handleSend}
          handleFaqSend={handleFaqSend}
          streamingMessageId={streamingMessageId}
          messagesEndRef={messagesEndRef}
          formatTime={formatTime}
          copyToClipboard={copyToClipboard}
          onRetry={retryLastMessage}
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
