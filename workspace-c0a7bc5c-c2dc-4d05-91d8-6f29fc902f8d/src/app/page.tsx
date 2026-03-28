'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Clock, BookOpen, Send, Menu, MapPin, Plus, Copy, 
  Sparkles, ClipboardList, FlaskConical, Link2, Trash2, X, Globe
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Types
interface Message {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  createdAt: string;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

// Constants
const ALL_LINKS = {
  catalog_search: 'https://library-service.com.ua:8443/khkhdak/DocumentSearchForm',
  repository: 'https://repository.ac.kharkov.ua/home',
  new_books: 'https://lib-hdak.in.ua/new-acquisitions.html',
  helpful_links: 'https://lib-hdak.in.ua/helpful-links.html',
  sci_search: 'https://lib-hdak.in.ua/search-scientific-info.html',
  author_profiles: 'https://lib-hdak.in.ua/author-profiles-instructions.html',
  exhibitions: 'https://lib-hdak.in.ua/virtual-exhibitions.html',
  rules: 'https://lib-hdak.in.ua/rules-library.html',
} as const;

const QUICK_MENU = [
  { id: 'schedule', title: 'Графік роботи', subtitle: 'Години відкриття', icon: Clock, kw: 'Який графік роботи бібліотеки?' },
  { id: 'register', title: 'Як записатися', subtitle: 'Отримати квиток', icon: ClipboardList, kw: 'Як записатися до бібліотеки?' },
  { id: 'catalog', title: 'Пошук у каталозі', subtitle: 'Книги та видання', icon: Search, kw: 'Як знайти книгу в каталозі?' },
  { id: 'contacts', title: 'Контакти', subtitle: 'Зв\'язатися з нами', icon: MapPin, kw: 'Які контакти бібліотеки?' },
  { id: 'rules', title: 'Правила', subtitle: 'Регламент бібліотеки', icon: BookOpen, kw: 'Які правила користування бібліотекою?' },
  { id: 'resources', title: 'Ресурси', subtitle: 'Електронні бази', icon: Globe, kw: 'Які електронні ресурси доступні?' },
] as const;

const QUICK_CHIPS = [
  { id: 'chip1', title: 'Графік роботи', kw: 'Який графік роботи бібліотеки?' },
  { id: 'chip2', title: 'Як записатися', kw: 'Як записатися до бібліотеки?' },
  { id: 'chip3', title: 'Пошук книги', kw: 'Як знайти книгу в каталозі?' },
] as const;

const SIDEBAR_RESOURCES = [
  { icon: Search, title: 'Пошук у каталозі', url: ALL_LINKS.catalog_search },
  { icon: Sparkles, title: 'Репозитарій', url: ALL_LINKS.repository },
  { icon: Link2, title: 'Нові надходження', url: ALL_LINKS.new_books },
  { icon: FlaskConical, title: 'Наукова інформація', url: ALL_LINKS.sci_search },
] as const;

// Animation variants
const containerVariants = {
  animate: {
    transition: { staggerChildren: 0.04, delayChildren: 0.06 },
  },
};

const itemVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] },
  },
};

// Book Icon
const BookIcon = memo(({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size * 0.8} viewBox="0 0 28 22" fill="none" className={className}>
    <path d="M14 3C14 3 9 1.5 3 3.5V19C9 17 14 18.5 14 18.5" stroke="currentColor" strokeWidth="1.2" fill="none"/>
    <path d="M14 3C14 3 19 1.5 25 3.5V19C19 17 14 18.5 14 18.5" stroke="currentColor" strokeWidth="1.2" fill="none" opacity="0.55"/>
    <line x1="14" y1="2.5" x2="14" y2="18" stroke="currentColor" strokeWidth="1"/>
  </svg>
));

// Action Card Component - v13.0
const ActionCard = memo(({ icon: Icon, title, subtitle, kw, isTyping, onClick }: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  kw: string;
  isTyping: boolean;
  onClick: (kw: string) => void;
}) => (
  <motion.button
    variants={itemVariants}
    onClick={() => onClick(kw)}
    disabled={isTyping}
    className="action-card w-full text-left disabled:opacity-50 disabled:cursor-not-allowed"
  >
    <div className="action-card-icon-wrap">
      <Icon size={20} strokeWidth={1.5} className="action-card-icon" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="action-card-title">{title}</p>
      <p className="action-card-subtitle">{subtitle}</p>
    </div>
  </motion.button>
));

// Sidebar Link - Fixed truncation
const SidebarLink = memo(({ icon: Icon, title, url }: {
  icon: React.ElementType;
  title: string;
  url: string;
}) => (
  <a href={url} target="_blank" rel="noreferrer" className="sidebar-link group">
    <Icon size={18} strokeWidth={1.5} className="sidebar-icon" />
    <span className="sidebar-text">{title}</span>
  </a>
));

// Markdown Components
const markdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
  ul: ({ children }: { children?: React.ReactNode }) => <ul className="list-disc pl-4 my-2 space-y-1">{children}</ul>,
  ol: ({ children }: { children?: React.ReactNode }) => <ol className="list-decimal pl-4 my-2 space-y-1">{children}</ol>,
  li: ({ children }: { children?: React.ReactNode }) => <li>{children}</li>,
  strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-semibold text-[#1A1612]">{children}</strong>,
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#B87830] underline underline-offset-2 hover:text-[#D4A853] transition-colors">
      {children}
    </a>
  ),
  code: ({ className, children }: { className?: string; children?: React.ReactNode }) => {
    const isInline = !className;
    return isInline ? (
      <code className="bg-[#1A1612]/5 text-[#B87830] px-1.5 py-0.5 rounded text-sm">{children}</code>
    ) : (
      <code className="block bg-[#1A1612]/5 p-3 rounded-lg text-sm overflow-x-auto">{children}</code>
    );
  },
};

// Message Component
const MessageBubble = memo(({ msg, formatTime, copyToClipboard }: {
  msg: Message;
  formatTime: (d: string) => string;
  copyToClipboard: (t: string) => void;
}) => {
  const isUser = msg.role === 'USER';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      className={cn("flex gap-3", isUser && "flex-row-reverse")}
    >
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
        isUser 
          ? "bg-gradient-to-br from-[#1A1612] to-[#2A2520]" 
          : "bg-gradient-to-br from-[#B87830]/15 to-[#D4A853]/10 border border-[#B87830]/15"
      )}>
        {isUser ? (
          <span className="text-[9px] font-semibold text-[#D4A853] tracking-wider">ВИ</span>
        ) : (
          <BookIcon size={14} className="text-[#B87830]" />
        )}
      </div>

      <div className={cn("flex flex-col max-w-[70%]", isUser && "items-end")}>
        <div className={cn("px-4 py-3 text-[14px] leading-[1.65]", isUser ? "message-user" : "message-assistant")}>
          {isUser ? (
            <p className="whitespace-pre-wrap">{msg.content}</p>
          ) : (
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown components={markdownComponents}>{msg.content}</ReactMarkdown>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1.5 px-1">
          <span className="text-[10px] text-[#7A756F]/60 font-medium">{formatTime(msg.createdAt)}</span>
          {!isUser && (
            <button onClick={() => copyToClipboard(msg.content)} className="p-1 text-[#7A756F]/40 hover:text-[#B87830] transition-colors" aria-label="Копіювати">
              <Copy size={10} strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
});

// Typing Indicator
const TypingIndicator = memo(() => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 8 }}
    className="flex gap-3"
  >
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#B87830]/15 to-[#D4A853]/10 border border-[#B87830]/15 flex items-center justify-center">
      <BookIcon size={14} className="text-[#B87830]" />
    </div>
    <div className="px-4 py-3 message-assistant">
      <div className="flex gap-1.5 items-center">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-[#B87830]/60"
            animate={{ y: [0, -4, 0], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
          />
        ))}
      </div>
    </div>
  </motion.div>
));

// Main Component
export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
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

      if (!res.ok) throw new Error();
      
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

  const showChips = useMemo(() => !isTyping && messages.length === 1 && messages[0].role === 'USER', [isTyping, messages]);
  const hasInput = inputValue.trim().length > 0;

  return (
    <div className="h-screen flex bg-antique-paper bg-ambient-glow overflow-hidden">
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-[#0D0B09]/60 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar - Academic Dark Glass v13.0 */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.aside
            ref={sidebarRef}
            initial={{ x: -280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -280, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
            className="sidebar-premium h-full fixed md:relative z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-5 pb-3 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#B87830]/20 to-[#D4A853]/10 flex items-center justify-center border border-[#D4A853]/15 shrink-0">
                    <BookIcon size={20} className="text-[#D4A853]" />
                  </div>
                  <div className="min-w-0">
                    <span className="logo-text text-[22px]">ХДАК</span>
                    <p className="text-[9px] text-white/45 tracking-[0.2em] mt-0.5 font-medium">БІБЛІОТЕКА</p>
                  </div>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 rounded-lg text-white/45 hover:text-white/80 hover:bg-white/[0.05] transition-all shrink-0 ml-2"
                  aria-label="Закрити меню"
                >
                  <X size={16} strokeWidth={1.5} />
                </button>
              </div>
            </div>

            <div className="h-px mx-5 shrink-0 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

            {/* Resources */}
            <nav className="flex-1 overflow-y-auto py-4 custom-scrollbar px-3 min-h-0">
              <p className="sidebar-label">Ресурси</p>
              <div className="space-y-0.5">
                {SIDEBAR_RESOURCES.map((item) => (
                  <SidebarLink key={item.title} {...item} />
                ))}
              </div>
            </nav>

            {/* Conversations - Fixed overflow */}
            {conversations.length > 0 && (
              <div className="px-3 pb-3 shrink-0">
                <div className="h-px mx-2 mb-3 bg-white/[0.04]" />
                <p className="sidebar-label">Історія</p>
                <div className="space-y-0.5 max-h-[180px] overflow-y-auto custom-scrollbar">
                  {conversations.slice(0, 5).map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => loadConversation(conv.id)}
                      className={cn(
                        "group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all gap-2",
                        currentConversation?.id === conv.id
                          ? "bg-[#D4A853]/12 border border-[#D4A853]/18"
                          : "hover:bg-white/[0.03] border border-transparent"
                      )}
                    >
                      <span className="text-[12px] text-white/70 group-hover:text-white/95 truncate flex-1 min-w-0 transition-colors">
                        {conv.title}
                      </span>
                      <button
                        onClick={(e) => deleteConversation(conv.id, e)}
                        className="p-1 text-white/0 group-hover:text-white/35 hover:!text-red-400/70 transition-all shrink-0"
                        aria-label="Видалити"
                      >
                        <Trash2 size={11} strokeWidth={1.5} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="p-3 border-t border-white/[0.04] shrink-0">
              <button
                onClick={createNewConversation}
                className="btn-new-chat w-full py-3 rounded-xl text-[11px] flex items-center justify-center gap-2"
              >
                <Plus size={15} strokeWidth={2.5} />
                <span>НОВИЙ ЧАТ</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

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

        {/* Content */}
        <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
          {messages.length === 0 ? (
            <motion.div
              variants={containerVariants}
              initial="initial"
              animate="animate"
              className="flex-1 flex flex-col items-center justify-center px-5 py-6"
            >
              {/* Icon */}
              <motion.div 
                variants={itemVariants}
                className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#B87830]/10 to-[#D4A853]/5 flex items-center justify-center mb-4 border border-[#B87830]/10 animate-subtle-float"
              >
                <BookIcon size={28} className="text-[#B87830]" />
              </motion.div>

              <motion.h1 variants={itemVariants} className="hero-title mb-1.5">
                Ваш особистий асистент
              </motion.h1>

              <motion.p variants={itemVariants} className="hero-subtitle mb-5">
                Оберіть тему або напишіть запитання
              </motion.p>

              {error && (
                <motion.div variants={itemVariants} className="mb-5 p-3 bg-red-50/90 backdrop-blur rounded-xl text-red-600 text-sm border border-red-100">
                  {error}
                </motion.div>
              )}

              {/* Action Grid */}
              <motion.div 
                variants={containerVariants}
                className="w-full max-w-[420px] grid grid-cols-2 gap-2.5"
              >
                {QUICK_MENU.map((item) => (
                  <ActionCard
                    key={item.id}
                    {...item}
                    isTyping={isTyping}
                    onClick={handleSend}
                  />
                ))}
              </motion.div>
            </motion.div>
          ) : (
            <div className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar">
              <div className="max-w-[520px] mx-auto space-y-4">
                {messages.map((msg) => (
                  <MessageBubble key={msg.id} msg={msg} formatTime={formatTime} copyToClipboard={copyToClipboard} />
                ))}
                <AnimatePresence>
                  {isTyping && <TypingIndicator />}
                </AnimatePresence>
                
                {/* Quick Chips */}
                <AnimatePresence>
                  {showChips && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      className="flex flex-wrap gap-2 pt-2"
                    >
                      <span className="text-[10px] text-[#7A756F]/60 w-full mb-0.5">Також можете запитати:</span>
                      {QUICK_CHIPS.map((chip) => (
                        <button
                          key={chip.id}
                          onClick={() => handleSend(chip.kw)}
                          className="quick-chip"
                        >
                          {chip.title}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <div ref={messagesEndRef} />
              </div>
            </div>
          )}
        </div>

        {/* Input Area - Weightless Glass v13.0 */}
        <div className="input-area px-4 pb-4 pt-3 shrink-0">
          <div className="input-container max-w-[520px] mx-auto flex items-center gap-3 px-5 py-1.5">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !isTyping && handleSend()}
              placeholder="Ваше запитання..."
              disabled={isTyping}
              className="flex-1 h-11 bg-transparent outline-none text-[14px] text-[#2A2520] placeholder:text-[#7A756F]/45"
              maxLength={2000}
            />
            <button
              onClick={() => handleSend()}
              disabled={!hasInput || isTyping}
              className={cn("send-btn", hasInput && !isTyping && "active")}
              aria-label="Надіслати"
            >
              {isTyping ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                </motion.div>
              ) : (
                <Send size={16} strokeWidth={2} />
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
