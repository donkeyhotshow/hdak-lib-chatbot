import React, { memo, useMemo, useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Search, Clock, BookOpen, MapPin, ClipboardList, Globe, Copy, ArrowDown, AlertCircle, ChevronRight } from 'lucide-react';
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
  table: (props: React.HTMLAttributes<HTMLTableElement>) => (
    <div className="overflow-x-auto my-3 rounded-xl border border-[#E5E1D8] shadow-sm">
      <table className="w-full border-collapse text-[13px]" {...props} />
    </div>
  ),
  thead: (props: React.HTMLAttributes<HTMLTableSectionElement>) => (
    <thead className="bg-[#B87830]/10" {...props} />
  ),
  tbody: (props: React.HTMLAttributes<HTMLTableSectionElement>) => (
    <tbody {...props} />
  ),
  tr: (props: React.HTMLAttributes<HTMLTableRowElement>) => (
    <tr className="border-b border-[#E5E1D8] odd:bg-white even:bg-[#FDFBF7] last:border-0" {...props} />
  ),
  th: (props: React.ThHTMLAttributes<HTMLTableCellElement>) => (
    <th className="text-left px-3 py-2 font-semibold text-[#1A1612] whitespace-nowrap" {...props} />
  ),
  td: (props: React.TdHTMLAttributes<HTMLTableCellElement>) => (
    <td className="px-3 py-2 text-[#2A2520]" {...props} />
  ),
};

const MessageBubble = memo(function MessageBubble({ msg, isStreaming, formatTime, copyToClipboard, onRetry }: {
  msg: Message; isStreaming: boolean; formatTime: (d: string) => string; copyToClipboard: (t: string) => void; onRetry?: () => void;
}) {
  const isUser = msg.role === 'USER';
  const isError = msg.status === 'error';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }} 
      className={cn("flex gap-3 group animate-fade-in-slide-up", isUser && "flex-row-reverse")} 
      role="article" 
      aria-label={isUser ? 'Ваше повідомлення' : 'Відповідь асистента'}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#B87830]/15 to-[#D4A853]/10 border border-[#B87830]/15 flex items-center justify-center shrink-0 mt-auto mb-1 shadow-sm">
          <BookIcon size={14} className="text-[#B87830]" />
        </div>
      )}
      <div className={cn("flex flex-col", isUser ? "max-w-[85%] items-end" : "flex-1 min-w-0")}>
        <div className={cn(
          "px-5 py-3.5 text-[14.5px] leading-[1.625] relative shadow-sm transition-all message-bubble",
          isUser ? "message-user message-bubble-user rounded-[1.25rem] rounded-br-[4px]" : "message-assistant message-bubble-assistant rounded-[1.25rem] rounded-bl-[4px] bg-[#F9F7F2] border border-[#E5E1D8]",
          isError && "border-red-400 bg-red-50/50 shadow-none"
        )}>
          {isUser ? (
            <p className="whitespace-pre-wrap">{msg.content}</p>
          ) : (
            <div className="prose prose-sm max-w-none prose-p:leading-[1.625] prose-strong:text-[#D4A853]">
              <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
              {isStreaming && <motion.span className="inline-block w-[2px] h-[14px] bg-[#B87830] ml-[1px] align-baseline" animate={{ opacity: [1, 0] }} transition={{ duration: 0.5, repeat: Infinity, ease: 'easeInOut' }} />}
            </div>
          )}
          {isError && (
             <div className="flex items-center gap-1.5 mt-2 text-red-500 text-[11px] font-semibold">
               <AlertCircle size={13} />
               <span>Помилка доставки</span>
               {onRetry && (
                 <button onClick={onRetry} className="ml-1 underline decoration-red-300 underline-offset-2 hover:no-underline transition-all">Повторити</button>
               )}
             </div>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1.5 px-2">
          <span className="text-[10px] text-[#7A756F]/40 tabular-nums font-medium uppercase tracking-wider">{formatTime(msg.createdAt)}</span>
          {!isUser && !isStreaming && !isError && (
            <button
              onClick={() => copyToClipboard(msg.content)}
              className="p-1 text-[#7A756F]/30 opacity-60 md:opacity-0 md:group-hover:opacity-100 message-actions-mobile-visible hover:text-[#B87830] transition-all"
              aria-label="Копіювати"
            >
              <Copy size={13} strokeWidth={1.8} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}, (prev, next) => (
  prev.msg.id === next.msg.id &&
  prev.msg.content === next.msg.content &&
  prev.msg.status === next.msg.status &&
  prev.isStreaming === next.isStreaming
));

const TypingIndicator = memo(function TypingIndicator() {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex gap-3" role="status" aria-label="Асистент думає">
      <div className="w-8 h-8 rounded-full bg-[#B87830]/10 flex items-center justify-center shrink-0 mt-auto mb-1"><BookIcon size={14} className="text-[#B87830]" /></div>
      <div className="px-5 py-3.5 message-assistant rounded-[1.25rem] rounded-bl-[4px] bg-[#F9F7F2] border border-[#E5E1D8] shadow-sm"><div className="flex gap-1.5 items-center h-5">
        {[0,1,2].map((i) => <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-[#B87830]/40" animate={{ y:[0,-4,0] }} transition={{ duration:0.6, repeat:Infinity, delay:i*0.12, ease:'easeInOut' }} />)}
      </div></div>
    </motion.div>
  );
});

const MessageSkeleton = () => (
  <div className="flex gap-3 mb-6 animate-pulse">
    <div className="w-8 h-8 rounded-full bg-[#2A2520]/[0.03] shrink-0 mt-auto" />
    <div className="flex flex-col flex-1 gap-2.5">
      <div className="h-14 bg-[#2A2520]/[0.03] rounded-[1.25rem] w-full" />
      <div className="h-3 bg-[#2A2520]/[0.03] rounded w-16 ml-2" />
    </div>
  </div>
);

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

function ChatAreaComponent({ messages, isTyping, isLoadingConversation, error, handleFaqSend, streamingMessageId, messagesEndRef, formatTime, copyToClipboard, onRetry }: ChatAreaProps) {
  const [locale, setLocale] = useState<'uk' | 'en'>('uk');
  useEffect(() => {
    const lang = navigator.language || navigator.languages?.[0] || 'uk';
    setLocale(lang.startsWith('en') ? 'en' : 'uk');
  }, []);

  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-hide chips: visible only after 3s idle since last bot response; hidden on user interaction
  const [chipsReady, setChipsReady] = useState(false);
  const chipsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lastBotMessageId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'ASSISTANT') return messages[i].id;
    }
    return null;
  }, [messages]);

  const lastMessageRole = messages.length > 0 ? messages[messages.length - 1].role : null;

  // Hide chips immediately when user sends a message
  useEffect(() => {
    if (lastMessageRole === 'USER') {
      if (chipsTimerRef.current) clearTimeout(chipsTimerRef.current);
      setChipsReady(false);
    }
  }, [lastMessageRole]);

  // Show chips 3s after bot finishes responding (not while streaming)
  useEffect(() => {
    if (!isTyping && lastBotMessageId && lastMessageRole === 'ASSISTANT') {
      if (chipsTimerRef.current) clearTimeout(chipsTimerRef.current);
      chipsTimerRef.current = setTimeout(() => setChipsReady(true), 3000);
    } else {
      if (chipsTimerRef.current) clearTimeout(chipsTimerRef.current);
    }
    return () => {
      if (chipsTimerRef.current) clearTimeout(chipsTimerRef.current);
    };
  }, [isTyping, lastBotMessageId, lastMessageRole]);


  const QUICK_MENU = locale === 'en' ? QUICK_MENU_EN : QUICK_MENU_UK;
  const QUICK_CHIPS = locale === 'en' ? QUICK_CHIPS_EN : QUICK_CHIPS_UK;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isUp = scrollTop < scrollHeight - clientHeight - 200;
    setShowScrollButton(isUp);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const { lastMsg, lastMsgHasCatalog, lastAssistantContent } = useMemo(() => {
    let lastAssistant = '';
    let lastAssistantMsg: Message | undefined;
    let last: Message | undefined;
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
    const hasCatalog = lastAssistantMsg ? (lastAssistantMsg.content?.includes('[РЕЗУЛЬТАТИ КАТАЛОГУ') || lastAssistantMsg.content?.includes('Знайдено за')) : false;
    return { lastMsg: last, lastMsgHasCatalog: hasCatalog, lastAssistantContent: lastAssistant };
  }, [messages]);

  const showChips = chipsReady && !isTyping && !!lastMsg && lastMsg.role === 'ASSISTANT' && lastMsg.id !== streamingMessageId && !lastMsgHasCatalog;

  const handleChipClick = (kw: string) => {
    setChipsReady(false);
    if (chipsTimerRef.current) clearTimeout(chipsTimerRef.current);
    handleFaqSend(kw);
  };

  if (messages.length === 0 && !isLoadingConversation) {
    return (
      <motion.div variants={containerVariants} initial="initial" animate="animate" className="flex-1 overflow-y-auto custom-scrollbar chat-scroll-area flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-[560px] flex flex-col items-center">
          <motion.div variants={itemVariants} className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#B87830]/15 to-[#D4A853]/5 flex items-center justify-center mb-6 border border-[#B87830]/15 shadow-md shadow-[#B87830]/5 shrink-0">
            <BookIcon size={24} className="text-[#B87830]" />
          </motion.div>
          <motion.h2 variants={itemVariants} className="hero-title text-[28px] md:text-[32px] mb-2 text-center font-serif">Чим я можу допомогти?</motion.h2>
          <motion.p variants={itemVariants} className="hero-subtitle text-[15px] mb-8 text-center text-[#7A756F]/80 max-w-[400px] leading-relaxed">
            {locale === 'en' 
              ? 'I can help with library hours, finding books in our catalog, registration rules, and online resources.' 
              : 'Я допоможу дізнатися графік роботи, знайти книгу в каталозі, розкажу про правила запису та електронні ресурси.'}
          </motion.p>
          
          {error && (
            <motion.div variants={itemVariants} className="mb-6 w-full p-4 bg-red-50 rounded-2xl text-red-600 text-[14px] border border-red-100/50 flex items-center justify-between gap-4 shadow-sm">
              <span className="font-medium">{error}</span>
              {onRetry && <button onClick={onRetry} className="shrink-0 text-[13px] font-bold underline underline-offset-4 hover:no-underline transition-all">Спробувати знову</button>}
            </motion.div>
          )}

          <motion.div variants={containerVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
            {QUICK_MENU.map((item, idx) => (
              <motion.button 
                key={item.id}
                variants={itemVariants}
                onClick={() => handleFaqSend(item.kw)}
                disabled={isTyping}
                className={cn(
                  "flex items-center gap-3.5 p-4 rounded-2xl bg-white border border-[#2A2520]/[0.06] hover:border-[#D4A853]/40 hover:bg-[#FDFBF7] hover:shadow-md transition-all group text-left",
                  `stagger-delay-${idx + 1}`
                )}
              >
                <div className="w-10 h-10 rounded-xl bg-[#B87830]/5 flex items-center justify-center transition-colors group-hover:bg-[#B87830]/10">
                  <item.icon size={18} className="text-[#B87830]/70 group-hover:text-[#B87830]" />
                </div>
                <span className="text-[14px] font-semibold text-[#2A2520]/80 group-hover:text-[#1A1612] flex-1">{item.title}</span>
                <ChevronRight size={16} className="text-[#B87830]/30 group-hover:text-[#B87830]/60 shrink-0 transition-colors" />
              </motion.button>
            ))}
          </motion.div>
          
          <motion.p variants={itemVariants} className="mt-10 text-[11px] font-bold text-[#7A756F]/40 uppercase tracking-[0.2em]">ХДАК БІБЛІОТЕКА © 2024</motion.p>
        </div>
      </motion.div>
    );
  }

  return (
    <>
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {streamingMessageId ? lastAssistantContent : ''}
    </div>
    <div className="flex-1 overflow-y-auto px-4 py-6 custom-scrollbar chat-scroll-area relative" onScroll={handleScroll} aria-label="Повідомлення чату">
      <div className="w-full max-w-[800px] mx-auto space-y-7">
        {error && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 text-red-600 text-[13.5px] bg-red-50 border border-red-100 rounded-xl shadow-sm">
            <div className="flex items-center gap-2">
              <AlertCircle size={15} />
              <span className="font-medium">{error}</span>
            </div>
            {onRetry && <button onClick={onRetry} className="shrink-0 text-[12px] font-bold underline underline-offset-4 hover:no-underline">Повторити</button>}
          </div>
        )}
        {isLoadingConversation && messages.length === 0 && (
          <div className="space-y-8 mt-4">
             <MessageSkeleton />
             <MessageSkeleton />
             <MessageSkeleton />
          </div>
        )}
        {messages.map((msg) => <MessageBubble key={msg.id} msg={msg} isStreaming={msg.id === streamingMessageId} formatTime={formatTime} copyToClipboard={copyToClipboard} onRetry={onRetry} />)}
        <AnimatePresence>{isTyping && <TypingIndicator />}</AnimatePresence>
        
        <AnimatePresence>{showChips && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="pt-2 pl-11">
            <span className="text-[11px] font-bold text-[#7A756F]/40 uppercase tracking-wider block mb-3">{locale === 'en' ? 'Quick suggestions:' : 'Швидкі підказки:'}</span>
            <div className="chip-scroll-container no-scrollbar">
              {QUICK_CHIPS.map((chip, idx) => (
                <button 
                  key={chip.id} 
                  onClick={() => handleChipClick(chip.kw)} 
                  disabled={isTyping} 
                  className={cn(
                    "flex-shrink-0 px-4 py-2 text-[13px] font-semibold rounded-full border border-[#D4A853]/30 text-[#B87830] hover:bg-[#D4A853]/10 hover:border-[#D4A853]/60 transition-all bg-white/50",
                    `animate-fade-in-slide-up stagger-delay-${idx + 1}`
                  )}
                >
                  {chip.title}
                </button>
              ))}
            </div>
          </motion.div>
        )}</AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      <AnimatePresence>
        {showScrollButton && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            onClick={scrollToBottom}
            className="scroll-to-bottom-btn"
            aria-label="Прокрутити до кінця"
          >
            <ArrowDown size={20} strokeWidth={2.5} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
    </>
  );
}

export const ChatArea = memo(ChatAreaComponent);