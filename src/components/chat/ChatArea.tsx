import React, { memo } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Search, Clock, BookOpen, MapPin, ClipboardList, Globe, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Message } from './types';

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

const containerVariants: Variants = {
  animate: { transition: { staggerChildren: 0.04, delayChildren: 0.06 } },
};

const itemVariants: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] } },
};

const BookIcon = memo(function BookIcon({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size * 0.8} viewBox="0 0 28 22" fill="none" className={className}>
      <path d="M14 3C14 3 9 1.5 3 3.5V19C9 17 14 18.5 14 18.5" stroke="currentColor" strokeWidth="1.2" fill="none"/>
      <path d="M14 3C14 3 19 1.5 25 3.5V19C19 17 14 18.5 14 18.5" stroke="currentColor" strokeWidth="1.2" fill="none" opacity="0.55"/>
      <line x1="14" y1="2.5" x2="14" y2="18" stroke="currentColor" strokeWidth="1"/>
    </svg>
  );
});

const ActionCard = memo(function ActionCard({ icon: Icon, title, subtitle, kw, isTyping, onClick }: {
  icon: React.ElementType; title: string; subtitle: string; kw: string; isTyping: boolean; onClick: (kw: string) => void;
}) {
  return (
    <motion.button variants={itemVariants} onClick={() => onClick(kw)} disabled={isTyping} className="action-card w-full text-left disabled:opacity-50 disabled:cursor-not-allowed">
      <div className="action-card-icon-wrap"><Icon size={20} strokeWidth={1.5} className="action-card-icon" /></div>
      <div className="flex-1 min-w-0"><p className="action-card-title">{title}</p><p className="action-card-subtitle">{subtitle}</p></div>
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
    const isInline = !className;
    return isInline ? (
      <code className="bg-[#1A1612]/5 text-[#B87830] px-1.5 py-0.5 rounded text-sm" {...rest} />
    ) : (
      <code className={cn("block bg-[#1A1612]/5 p-3 rounded-lg text-sm overflow-x-auto", className)} {...rest} />
    );
  },
};

const MessageBubble = memo(function MessageBubble({ msg, isStreaming, formatTime, copyToClipboard }: { msg: Message; isStreaming: boolean; formatTime: (d: string) => string; copyToClipboard: (t: string) => void; }) {
  const isUser = msg.role === 'USER';
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }} className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", isUser ? "bg-gradient-to-br from-[#1A1612] to-[#2A2520]" : "bg-gradient-to-br from-[#B87830]/15 to-[#D4A853]/10 border border-[#B87830]/15")}>
        {isUser ? <span className="text-[9px] font-semibold text-[#D4A853] tracking-wider">ВИ</span> : <BookIcon size={14} className="text-[#B87830]" />}
      </div>
      <div className={cn("flex flex-col max-w-[70%]", isUser && "items-end")}>
        <div className={cn("px-4 py-3 text-[14px] leading-[1.65]", isUser ? "message-user" : "message-assistant")}>
          {isUser ? (
            <p className="whitespace-pre-wrap">{msg.content}</p>
          ) : (
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown components={markdownComponents}>{msg.content}</ReactMarkdown>
              {isStreaming && (
                <motion.span
                  className="inline-block w-[2px] h-[14px] bg-[#B87830] ml-[1px] align-text-bottom"
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1.5 px-1">
          <span className="text-[10px] text-[#7A756F]/60 font-medium">{formatTime(msg.createdAt)}</span>
          {!isUser && !isStreaming && (
            <button onClick={() => copyToClipboard(msg.content)} className="p-1 text-[#7A756F]/40 hover:text-[#B87830] transition-colors" aria-label="Копіювати">
              <Copy size={10} strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
});

const TypingIndicator = memo(function TypingIndicator() {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#B87830]/15 to-[#D4A853]/10 border border-[#B87830]/15 flex items-center justify-center">
        <BookIcon size={14} className="text-[#B87830]" />
      </div>
      <div className="px-4 py-3 message-assistant">
        <div className="flex gap-1.5 items-center">
          {[0, 1, 2].map((i) => <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-[#B87830]/60" animate={{ y: [0, -4, 0], opacity: [0.6, 1, 0.6] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }} />)}
        </div>
      </div>
    </motion.div>
  );
});

interface ChatAreaProps {
  messages: Message[];
  isTyping: boolean;
  error: string | null;
  handleSend: (query?: string) => void;
  handleFaqSend: (query: string) => void;
  streamingMessageId: string | null;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  formatTime: (d: string) => string;
  copyToClipboard: (t: string) => void;
}

export function ChatArea({ messages, isTyping, error, handleSend, handleFaqSend, streamingMessageId, messagesEndRef, formatTime, copyToClipboard }: ChatAreaProps) {
  const showChips = !isTyping && messages.length > 0 && messages.length <= 2 && messages[0].role === 'USER';

  if (messages.length === 0) {
    return (
      <motion.div variants={containerVariants} initial="initial" animate="animate" className="flex-1 flex flex-col items-center justify-center px-5 py-6">
        <motion.div variants={itemVariants} className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#B87830]/10 to-[#D4A853]/5 flex items-center justify-center mb-4 border border-[#B87830]/10 animate-subtle-float">
          <BookIcon size={28} className="text-[#B87830]" />
        </motion.div>
        <motion.h1 variants={itemVariants} className="hero-title mb-1.5">Ваш особистий асистент</motion.h1>
        <motion.p variants={itemVariants} className="hero-subtitle mb-5">Оберіть тему або напишіть запитання</motion.p>
        
        {error && <motion.div variants={itemVariants} className="mb-5 p-3 bg-red-50/90 backdrop-blur rounded-xl text-red-600 text-sm border border-red-100">{error}</motion.div>}

        <motion.div variants={containerVariants} className="w-full max-w-[420px] grid grid-cols-2 gap-2.5">
          {QUICK_MENU.map((item) => <ActionCard key={item.id} {...item} isTyping={isTyping} onClick={handleFaqSend} />)}
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar">
      <div className="max-w-[520px] mx-auto space-y-4">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} isStreaming={msg.id === streamingMessageId} formatTime={formatTime} copyToClipboard={copyToClipboard} />
        ))}
        <AnimatePresence>
          {isTyping && <TypingIndicator />}
        </AnimatePresence>
        
        <AnimatePresence>
          {showChips && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} className="flex flex-wrap gap-2 pt-2">
              <span className="text-[10px] text-[#7A756F]/60 w-full mb-0.5">Також можете запитати:</span>
              {QUICK_CHIPS.map((chip) => (
                <button key={chip.id} onClick={() => handleFaqSend(chip.kw)} className="quick-chip">
                  {chip.title}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
