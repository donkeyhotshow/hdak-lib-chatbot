'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Menu, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useChat } from '@/hooks/use-chat';
import { Sidebar } from '@/components/chat/Sidebar';
import { ChatInput } from '@/components/chat/ChatInput';
import { ChatArea } from '@/components/chat/ChatArea';
import { useIsMobile } from '@/hooks/use-mobile';

export default function ChatPage() {
  const { toast } = useToast();
  // BUG FIX: declare isMobile before any useEffect that uses it
  const isMobile = useIsMobile() ?? false;

  // Fix #18: avoid hydration mismatch - start null, resolve after mount
  const [isSidebarOpen, setSidebarOpen] = useState<boolean | null>(null);
  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setSidebarOpen(!isMobile);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally run once on mount  isMobile is undefined on server

  const {
    messages, inputValue, setInputValue, isTyping, isLoadingConversation, isLoadingConversations, error,
    conversations, currentConversation, streamingMessageId,
    hasMoreConversations, messagesEndRef,
    handleSend, handleFaqSend, handleStop,
    loadConversation, createNewConversation, deleteConversation, renameConversation,
    newConversationId,
    loadMoreConversations, formatTime, copyToClipboard, retryLastMessage,
  } = useChat(toast);

  // Close sidebar on mobile click-outside or Escape key
  useEffect(() => {
    if (!isSidebarOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (isMobile && sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        setSidebarOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobile) setSidebarOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSidebarOpen, isMobile]);

  // Avoid layout flash: render nothing until sidebar state is resolved
  if (isSidebarOpen === null) {
    return (
      <div className="h-screen flex items-center justify-center bg-antique-paper" aria-busy="true">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#B87830]/10 animate-pulse" />
          <span className="text-[13px] text-[#7A756F]/50">Завантаження...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-antique-paper bg-ambient-glow overflow-hidden">
      <Sidebar
        isOpen={isSidebarOpen}
        setIsOpen={setSidebarOpen}
        isMobile={isMobile}
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
        isLoadingConversations={isLoadingConversations}
      />

      <main className="flex-1 flex flex-col min-w-0 relative h-full overflow-hidden">
        <header className="glass-header h-14 flex items-center justify-between px-4 shrink-0">
          <button
            onClick={() => setSidebarOpen(v => !(v ?? false))}
            className="w-11 h-11 flex items-center justify-center rounded-xl text-[#7A756F] hover:text-[#2A2520] hover:bg-[#2A2520]/[0.04] transition-all"
            aria-label={isSidebarOpen ? 'Закрити меню' : 'Відкрити меню'}
          >
            {isSidebarOpen ? <X size={18} strokeWidth={1.5} /> : <Menu size={18} strokeWidth={1.5} />}
          </button>
          <div className="flex flex-col items-center">
            <h1 className="logo-text text-[24px] leading-tight m-0">ХДАК</h1>
            <span className="text-[9px] uppercase tracking-[0.2em] text-[#D4A853]/60 font-bold -mt-0.5">БІБЛІОТЕКА</span>
          </div>
          <div className="w-11" />
        </header>

        <ChatArea
          messages={messages}
          isTyping={isTyping}
          isLoadingConversation={isLoadingConversation}
          error={error}
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
          currentConversationId={currentConversation?.id}
          onSpeechError={(msg) => toast({ description: msg, duration: 4000 })}
        />
      </main>
    </div>
  );
}
