import React, { memo, useMemo, useEffect, useState } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Search, Clock, BookOpen, MapPin, ClipboardList, Globe, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Message } from './types';

const QUICK_MENU_UK = [
  { id: 'schedule', title: 'Графік роботи', icon: Clock, kw: 'Який графік роботи бібліотеки?' },
  { id: 'register', title: 'Як записатися', icon: ClipboardList, kw: 'Як записатися до бібліотеки?' },
  { id: 'catalog', title: 'Каталог', icon: Search, kw: 'Як знайти книгу в каталозі?' },
  { id: 'contacts', title: 'Контакти', icon: MapPin, kw: 'Які контакти бібліотеки?' },
  { id: 'rules', title: 'Правила', icon: BookOpen, kw: 'Які правила користування бібліотекою?' },
  { id: 'resources', title: 'Ресурси', icon: Globe, kw: 'Які електронні ресурси доступні?' },
] as const;

const QUICK_MENU_EN = [
  { id: 'schedule', title: 'Library hours', icon: Clock, kw: 'What are the library hours?' },
  { id: 'register', title: 'How to register', icon: ClipboardList, kw: 'How to register at the library?' },
  { id: 'catalog', title: 'Catalog', icon: Search, kw: 'How to find a book in the catalog?' },
  { id: 'contacts', title: 'Contacts', icon: MapPin, kw: 'What are the library contacts?' },
  { id: 'rules', title: 'Rules', icon: BookOpen, kw: 'What are the library rules?' },
  { id: 'resources', title: 'Resources', icon: Globe, kw: 'What electronic resources are available?' },
] as const;

const QUICK_CHIPS_UK = [
  { id: 'chip1', title: 'Графік роботи', kw: 'Який графік роботи бібліотеки?' },
  { id: 'chip2', title: 'Як записатися', kw: 'Як записатися до бібліотеки?' },
  { id: 'chip3', title: 'Пошук книги', kw: 'Як знайти книгу в каталозі?' },
] as const;

const QUICK_CHIPS_EN = [
  { id: 'chip1', title: 'Library hours', kw: 'What are the library hours?' },
  { id: 'chip2', title: 'How to register', kw: 'How to register at the library?' },
  { id: 'chip3', title: 'Find a book', kw: 'How to find a book in the catalog?' },
] as const;

const containerVariants: Variants = {
  animate: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
};
const itemVariants: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.25, 0.1, 0.25, 1] } },
};

const BookIcon = memo(function BookIcon({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size * 0.8} viewBox='0 0 28 22' fill='none' className={className} aria-hidden="true">
      <path d='M14 3C14 3 9 1.5 3 3.5V19C9 17 14 18.5 14 18.5' stroke='currentColor' strokeWidth='1.2' fill='none'/>
      <path d='M14 3C14 3 19 1.5 25 3.5V19C19 17 14 18.5 14 18.5' stroke='currentColor' strokeWidth='1.2' fill='none' opacity='0.55'/>
      <line x1='14' y1='2.5' x2='14' y2='18' stroke='currentColor' strokeWidth='1'/>
    </svg>
  );
});

const QuickBtn = memo(function QuickBtn({ icon: Icon, title, kw, isTyping, onClick }: {
  icon: React.ElementType; title: string; kw: string; isTyping: boolean; onClick: (kw: string) => void;
}) {
  return (
    <motion.button
      variants={itemVariants}
      onClick={() => onClick(kw)}
      disabled={isTyping}
      className="quick-btn disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <Icon size={12} strokeWidth={1.8} className="quick-btn-icon shrink-0" />
      <span className="quick-btn-text">{title}</span>
    </motion.button>
  );
});

const markdownComponents = {
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => <ul className="list-disc pl-4 my-2 space-y-1" {...props} />,
  ol: (props: React.HTMLAttributes<HTMLOListElement>) => <ol className="list-decimal pl-4 my-2 space-y-1" {...props} />,
  li: (props: React.HTMLAttributes<HTMLLIElement>) => <li {...props} />,
  strong: (props: React.HTMLAttributes<HTMLElement>) => <strong className="font-semibold text-[#1A1612]" {...props} />,
  a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a target="_blank" rel="noopener noreferrer" className="text-[#B87830] underline underline-offset-2 hover:text-[#D4A853] transition-colors" {...props} />,
  code: ({ className, ...rest }: React.HTMLAttributes<HTMLElement>) => {
    const isInline = !className?.startsWith('language-');
    return isInline
      ? <code className="bg-[#1A1612]/5 text-[#B87830] px-1.5 py-0.5 rounded text-[13px]" {...rest} />
      : <code className={cn("block bg-[#1A1612]/5 p-3 rounded-lg text-[13px] overflow-x-auto", className)} {...rest} />;
  },
};

const MessageBubble = memo(function MessageBubble({ msg, isStreaming, formatTime, copyToClipboard }: {
  msg: Message; isStreaming: boolean; formatTime: (d: string) => string; copyToClipboard: (t: string) => void;
}) {
  const isUser = msg.role === 'USER';
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }} className={cn("flex gap-2.5 group", isUser && "flex-row-reverse")} role="article" aria-label={isUser ? 'Ваше повідомлення' : 'Відповідь асистента'}>
      <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5", isUser ? "bg-gradient-to-br from-[#1A1612] to-[#2A2520]" : "bg-gradient-to-br from-[#B87830]/12 to-[#D4A853]/8 border border-[#B87830]/12")}>
        {isUser ? <span className="text-[8px] font-bold text-[#D4A853] tracking-wider">ВИ</span> : <BookIcon size={12} className="text-[#B87830]" />}
      </div>
      <div className={cn("flex flex-col", isUser ? "max-w-[72%] items-end" : "flex-1 min-w-0")}>
        <div className={cn("px-4 py-3 text-[14px] leading-[1.7]", isUser ? "message-user" : "message-assistant")}>
          {isUser ? (
            <p className="whitespace-pre-wrap">{msg.content}</p>
          ) : (
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown components={markdownComponents}>{msg.content}</ReactMarkdown>
              {isStreaming && <motion.span className="inline-block w-[2px] h-[13px] bg-[#B87830] ml-[1px] align-text-bottom" animate={{ opacity: [1, 0] }} transition={{ duration: 0.5, repeat: Infinity, ease: 'easeInOut' }} />}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-1 px-1">
          <span className="text-[10px] text-[#7A756F]/50 tabular-nums">{formatTime(msg.createdAt)}</span>
          {!isUser && !isStreaming && (
            <button
              onClick={() => copyToClipboard(msg.content)}
              className="p-1 text-[#7A756F]/40 opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:text-[#B87830] transition-all"
              aria-label="Копіювати відповідь"
            >
              <Copy size={13} strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
});

const TypingIndicator = memo(function TypingIndicator() {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex gap-2.5" role="status" aria-label="Асистент друкує">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#B87830]/12 to-[#D4A853]/8 border border-[#B87830]/12 flex items-center justify-center shrink-0 mt-0.5"><BookIcon size={12} className="text-[#B87830]" /></div>
      <div className="px-4 py-3 message-assistant"><div className="flex gap-1 items-center h-5">
        {[0,1,2].map((i) => <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-[#B87830]/50" animate={{ y:[0,-3,0], opacity:[0.5,1,0.5] }} transition={{ duration:0.55, repeat:Infinity, delay:i*0.1, ease:'easeInOut' }} />)}
      </div></div>
    </motion.div>
  );
});

interface ChatAreaProps {
  messages: Message[];
  isTyping: boolean;
  error: string | null;
  isLoadingConversation?: boolean;
  handleFaqSend: (query: string) => void;
  streamingMessageId: string | null;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  formatTime: (d: string) => string;
  copyToClipboard: (t: string) => void;
  onRetry?: () => void;
}

export function ChatArea({ messages, isTyping, isLoadingConversation, error, handleFaqSend, streamingMessageId, messagesEndRef, formatTime, copyToClipboard, onRetry }: ChatAreaProps) {
  // Detect browser locale for localized quick buttons (client-only, no SSR mismatch)
  const [locale, setLocale] = useState<'uk' | 'en'>('uk');
  useEffect(() => {
    const lang = navigator.language || navigator.languages?.[0] || 'uk';
    setLocale(lang.startsWith('en') ? 'en' : 'uk');
  }, []);

  const QUICK_MENU = locale === 'en' ? QUICK_MENU_EN : QUICK_MENU_UK;
  const QUICK_CHIPS = locale === 'en' ? QUICK_CHIPS_EN : QUICK_CHIPS_UK;

  // All hooks must be before any conditional return (Rules of Hooks)
  // Memoize O(n) scans so they don't run on every render
  const { lastMsg, lastMsgHasCatalog, lastAssistantContent } = useMemo(() => {
    let lastAssistant = '';
    let lastAssistantMsg: typeof messages[0] | undefined;
    let last: typeof messages[0] | undefined;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (!last) last = messages[i];
      if (messages[i].role === 'ASSISTANT') {
        if (!lastAssistant) {
          lastAssistant = messages[i].content;
          lastAssistantMsg = messages[i];
        }
        break;
      }
    }
    // H3: only check catalog on the last ASSISTANT message, not on USER messages
    const hasCatalog = lastAssistantMsg ? (lastAssistantMsg.content?.includes('[РЕЗУЛЬТАТИ КАТАЛОГУ') || lastAssistantMsg.content?.includes('Знайдено за')) : false;
    return { lastMsg: last, lastMsgHasCatalog: hasCatalog, lastAssistantContent: lastAssistant };
  }, [messages]);

  const showChips = !isTyping && !!lastMsg && lastMsg.role === 'ASSISTANT' && lastMsg.id !== streamingMessageId && !lastMsgHasCatalog;

  if (messages.length === 0) {
    return (
      <motion.div variants={containerVariants} initial="initial" animate="animate" className="flex-1 overflow-y-auto custom-scrollbar chat-scroll-area flex flex-col items-center justify-center px-4 py-6">
        <div className="w-full max-w-[520px] flex flex-col items-center">
          <motion.div variants={itemVariants} className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#B87830]/10 to-[#D4A853]/5 flex items-center justify-center mb-3 border border-[#B87830]/10 animate-subtle-float shrink-0">
            <BookIcon size={18} className="text-[#B87830]" />
          </motion.div>
          <motion.h1 variants={itemVariants} className="hero-title mb-1 text-center">Асистент бібліотеки ХДАК</motion.h1>
          <motion.p variants={itemVariants} className="hero-subtitle mb-2 text-center">{locale === 'en' ? 'Ask about hours, books, rules, or resources' : 'Запитайте про графік, книги, правила або ресурси'}</motion.p>
          <motion.p variants={itemVariants} className="text-[12px] text-[#7A756F]/50 mb-5 text-center">{locale === 'en' ? 'E.g.: "What are the library hours?" or "Find books on jazz"' : 'Наприклад: «Коли відкрита бібліотека?» або «Є книга з культурології?»'}</motion.p>
          {error && (
            <motion.div variants={itemVariants} className="mb-3 w-full p-3 bg-red-50/90 rounded-xl text-red-600 text-[13px] border border-red-100 flex items-center justify-between gap-3">
              <span>{error}</span>
              {onRetry && <button onClick={onRetry} className="shrink-0 text-[12px] font-medium underline underline-offset-2 hover:no-underline transition-all">Повторити</button>}
            </motion.div>
          )}
          <motion.div variants={containerVariants} className="flex flex-wrap gap-2 justify-center">
            {QUICK_MENU.map((item) => <QuickBtn key={item.id} {...item} isTyping={isTyping} onClick={handleFaqSend} />)}
          </motion.div>
        </div>
      </motion.div>
    );
  }

  return (
    <>
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {streamingMessageId ? lastAssistantContent : ''}
    </div>
    <div className="flex-1 overflow-y-auto px-3 py-4 custom-scrollbar chat-scroll-area" aria-label="Повідомлення чату">
      <div className="w-full max-w-[900px] mx-auto space-y-3">
        {error && (
          <div className="flex items-center justify-between gap-3 px-1 py-2 text-red-500/80 text-[13px] bg-red-50/60 rounded-lg">
            <span>{error}</span>
            {onRetry && <button onClick={onRetry} className="shrink-0 text-[12px] font-medium underline underline-offset-2 hover:no-underline">Повторити</button>}
          </div>
        )}
        {isLoadingConversation && (
          <div className="flex items-center gap-2 px-1 py-2 text-[#7A756F]/50 text-[13px]">
            <div className="flex gap-1">
              {[0,1,2].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#B87830]/40 animate-bounce" style={{ animationDelay: `${i * 0.1}s` }} />
              ))}
            </div>
            <span>Завантаження...</span>
          </div>
        )}
        {messages.map((msg) => <MessageBubble key={msg.id} msg={msg} isStreaming={msg.id === streamingMessageId} formatTime={formatTime} copyToClipboard={copyToClipboard} />)}
        <AnimatePresence>{isTyping && <TypingIndicator />}</AnimatePresence>
        <AnimatePresence>{showChips && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-wrap gap-1.5 pt-1 pl-9">
            <span className="text-[10px] text-[#7A756F]/45 w-full mb-0.5">{locale === 'en' ? 'You can also ask:' : 'Також можете запитати:'}</span>
            {QUICK_CHIPS.map((chip) => <button key={chip.id} onClick={() => handleFaqSend(chip.kw)} disabled={isTyping} className="quick-chip disabled:opacity-40 disabled:cursor-not-allowed">{chip.title}</button>)}
          </motion.div>
        )}</AnimatePresence>
        <div ref={messagesEndRef} />
      </div>
    </div>
    </>
  );
}