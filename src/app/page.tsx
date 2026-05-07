"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Menu, X, Trash2, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useChat } from "@/hooks/use-chat";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sidebar } from "@/components/chat/Sidebar";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatArea } from "@/components/chat/ChatArea";

export default function ChatPage() {
  // L6/UX12: use the dedicated hook instead of window.innerWidth checks
  const isMobileDevice = useIsMobile();
  // Fix #18: avoid hydration mismatch — start null, resolve after isMobileDevice is known
  const [isSidebarOpen, setSidebarOpen] = useState<boolean | null>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (isMobileDevice === undefined) return; // still mounting
    setSidebarOpen(!isMobileDevice);
  }, [isMobileDevice]);

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

  // Handle swipe gestures on mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current || !isMobileDevice) return;

    const touchEnd = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY,
    };

    const diffX = touchEnd.x - touchStartRef.current.x;
    const diffY = touchEnd.y - touchStartRef.current.y;
    const distance = Math.sqrt(diffX * diffX + diffY * diffY);
    const minSwipeDistance = 30;

    // Swipe right to open sidebar
    if (diffX > minSwipeDistance && Math.abs(diffY) < 50 && !isSidebarOpen) {
      setSidebarOpen(true);
      // Haptic feedback
      if ("vibrate" in navigator) {
        try {
          navigator.vibrate(10);
        } catch (e) {
          // Haptics not supported
        }
      }
    }

    // Swipe left to close sidebar
    if (
      diffX < -minSwipeDistance &&
      Math.abs(diffY) < 50 &&
      isSidebarOpen &&
      isMobileDevice
    ) {
      setSidebarOpen(false);
      if ("vibrate" in navigator) {
        try {
          navigator.vibrate(10);
        } catch (e) {
          // Haptics not supported
        }
      }
    }

    touchStartRef.current = null;
  }, [isMobileDevice, isSidebarOpen]);

  // Close sidebar on mobile click-outside or Escape key (M24)
  useEffect(() => {
    if (!isSidebarOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        isMobileDevice &&
        sidebarRef.current &&
        !sidebarRef.current.contains(e.target as Node)
      ) {
        setSidebarOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMobileDevice) setSidebarOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSidebarOpen, isMobileDevice]);

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
    <div
      ref={mainRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="h-screen flex bg-antique-paper bg-ambient-glow overflow-hidden"
    >
      <Sidebar
        isOpen={isSidebarOpen}
        setIsOpen={setSidebarOpen}
        sidebarRef={sidebarRef}
        isMobile={isMobileDevice ?? false}
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
        <header className="chat-header relative min-h-[56px] md:min-h-[48px] flex items-center justify-between px-4 md:px-6 border-b border-[#D4A853]/[0.12] bg-white/45 backdrop-blur-lg shrink-0 shadow-sm">
          <button
            onClick={() => setSidebarOpen(v => !(v ?? false))}
            className="w-12 h-12 md:w-11 md:h-11 flex items-center justify-center rounded-lg md:rounded-xl text-[#7A756F] hover:text-[#1A1612] hover:bg-[#D4A853]/[0.08] transition-all active:scale-95 flex-shrink-0 hover:shadow-sm"
            aria-label={isSidebarOpen ? "Закрити меню" : "Відкрити меню"}
          >
            {isSidebarOpen ? (
              <X size={20} strokeWidth={1.5} className="md:w-[17px] md:h-[17px]" />
            ) : (
              <Menu size={20} strokeWidth={1.5} className="md:w-[17px] md:h-[17px]" />
            )}
          </button>
          <div className="flex flex-col items-center flex-1 px-3">
            <h1 className="logo-text text-[20px] md:text-[24px] m-0 leading-none font-bold">
              ХДАК
            </h1>
            <div className="flex items-center gap-2 mt-1.5">
              <span
                className={cn(
                  "w-2 h-2 rounded-full shrink-0 shadow-lg",
                  error
                    ? "bg-red-500"
                    : isTyping
                      ? "bg-amber-500 animate-pulse"
                      : "bg-emerald-500"
                )}
              />
              <span className="text-[9px] md:text-[10px] font-semibold tracking-wider text-[#7A756F] whitespace-nowrap uppercase">
                {error ? "Помилка" : isTyping ? "Думає..." : "Онлайн"}
              </span>
            </div>
          </div>
          <button
            onClick={createNewConversation}
            disabled={messages.length === 0}
            className="w-12 h-12 md:w-11 md:h-11 flex items-center justify-center rounded-lg md:rounded-xl text-[#7A756F] hover:text-[#1A1612] hover:bg-[#D4A853]/[0.08] transition-all disabled:opacity-0 disabled:pointer-events-none active:scale-95 flex-shrink-0 hover:shadow-sm"
            aria-label="Очистити чат"
            title="Очистити чат"
          >
            <Trash2 size={20} strokeWidth={1.6} className="md:w-[15px] md:h-[15px]" />
          </button>
        </header>

        <div className="h-px bg-gradient-to-r from-transparent via-[#D4A853]/25 to-transparent shrink-0" />

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
          onSpeechError={msg => toast({ description: msg, duration: 4000 })}
        />
      </main>
    </div>
  );
}
