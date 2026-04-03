"use client";

import React, { useState, useEffect, useRef } from "react";
import { Menu, X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useChat } from "@/hooks/use-chat";
import { Sidebar } from "@/components/chat/Sidebar";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatArea } from "@/components/chat/ChatArea";

export default function ChatPage() {
  // Fix #18: avoid hydration mismatch - start null, resolve after mount
  const [isSidebarOpen, setSidebarOpen] = useState<boolean | null>(null);
  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setSidebarOpen(window.innerWidth >= 768);
  }, []);

  const { toast } = useToast();

  const {
    messages,
    inputValue,
    setInputValue,
    isTyping,
    isLoadingConversation,
    isLoadingConversations,
    error,
    conversations,
    currentConversation,
    streamingMessageId,
    hasMoreConversations,
    messagesEndRef,
    handleSend,
    handleFaqSend,
    handleStop,
    loadConversation,
    createNewConversation,
    deleteConversation,
    renameConversation,
    newConversationId,
    loadMoreConversations,
    formatTime,
    copyToClipboard,
    retryLastMessage,
  } = useChat(toast);

  // Close sidebar on mobile click-outside or Escape key (M24)
  useEffect(() => {
    if (!isSidebarOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        window.innerWidth < 768 &&
        sidebarRef.current &&
        !sidebarRef.current.contains(e.target as Node)
      ) {
        setSidebarOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && window.innerWidth < 768) setSidebarOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSidebarOpen]);

  // Avoid layout flash: render nothing until sidebar state is resolved
  if (isSidebarOpen === null) {
    return (
      <div
        className="h-screen flex items-center justify-center bg-antique-paper"
        aria-busy="true"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#B87830]/10 animate-pulse" />
          <span className="text-[13px] text-[#7A756F]/50">Завантаження...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-antique-paper bg-ambient-glow overflow-hidden pt-12 md:pt-0">
      {/* Header — fixed on mobile (z-30, below sidebar z-50 and backdrop z-40); in-flow on desktop */}
      <header className="chat-header fixed inset-x-0 top-0 z-30 h-12 flex items-center justify-between px-4 border-b border-[#2A2520]/[0.04] bg-white/50 backdrop-blur-sm md:relative md:z-[60] md:h-auto md:min-h-[48px] md:shrink-0">
        <button
          onClick={() => setSidebarOpen((v) => !(v ?? false))}
          className="w-11 h-11 flex items-center justify-center rounded-xl text-[#7A756F] hover:text-[#2A2520] hover:bg-[#2A2520]/[0.04] transition-all"
          aria-label={isSidebarOpen ? "Закрити меню" : "Відкрити меню"}
        >
          {isSidebarOpen ? (
            <X size={17} strokeWidth={1.5} />
          ) : (
            <Menu size={17} strokeWidth={1.5} />
          )}
        </button>
        <div className="flex flex-col items-center">
          <h1 className="logo-text text-[22px] m-0 leading-none">ХДАК</h1>
          <div className="flex items-center gap-1 mt-0.5">
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full shrink-0",
                error
                  ? "bg-red-400"
                  : isTyping
                    ? "bg-amber-400 animate-pulse"
                    : "bg-emerald-400",
              )}
            />
            <span className="text-[10px] font-medium tracking-wide text-[#7A756F]/60">
              {error ? "Помилка" : isTyping ? "Думає..." : "Онлайн"}
            </span>
          </div>
        </div>
        <button
          onClick={createNewConversation}
          disabled={messages.length === 0}
          className="w-11 h-11 flex items-center justify-center rounded-xl text-[#7A756F] hover:text-[#2A2520] hover:bg-[#2A2520]/[0.04] transition-all disabled:opacity-0 disabled:pointer-events-none"
          aria-label="Очистити чат"
          title="Очистити чат"
        >
          <Trash2 size={15} strokeWidth={1.6} />
        </button>
      </header>

      <div className="h-px bg-gradient-to-r from-transparent via-[#B87830]/20 to-transparent shrink-0" />

      {/* Content area — sidebar + chat, fills remaining height */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
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
          isLoadingConversations={isLoadingConversations}
        />

        <main className="flex-1 flex flex-col min-w-0 relative overflow-hidden">
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
    </div>
  );
}
