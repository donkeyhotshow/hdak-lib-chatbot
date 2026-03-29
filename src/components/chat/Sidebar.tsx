import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Sparkles, Link2, FlaskConical, X, Trash2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Conversation } from './types';
import { ALL_LINKS } from '@/lib/constants';

const SIDEBAR_RESOURCES = [
  { icon: Search, title: 'Пошук у каталозі', url: ALL_LINKS.catalog_search },
  { icon: Sparkles, title: 'Репозитарій', url: ALL_LINKS.repository },
  { icon: Link2, title: 'Нові надходження', url: ALL_LINKS.new_books },
  { icon: FlaskConical, title: 'Наукова інформація', url: ALL_LINKS.sci_search },
] as const;

// Book Icon
const BookIcon = memo(({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size * 0.8} viewBox="0 0 28 22" fill="none" className={className}>
    <path d="M14 3C14 3 9 1.5 3 3.5V19C9 17 14 18.5 14 18.5" stroke="currentColor" strokeWidth="1.2" fill="none"/>
    <path d="M14 3C14 3 19 1.5 25 3.5V19C19 17 14 18.5 14 18.5" stroke="currentColor" strokeWidth="1.2" fill="none" opacity="0.55"/>
    <line x1="14" y1="2.5" x2="14" y2="18" stroke="currentColor" strokeWidth="1"/>
  </svg>
));

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

export interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  sidebarRef: React.RefObject<HTMLDivElement | null>;
  conversations: Conversation[];
  currentConversation: Conversation | null;
  loadConversation: (id: string) => void;
  deleteConversation: (id: string, e: React.MouseEvent) => void;
  createNewConversation: () => void;
}

export function Sidebar({
  isOpen,
  setIsOpen,
  sidebarRef,
  conversations,
  currentConversation,
  loadConversation,
  deleteConversation,
  createNewConversation
}: SidebarProps) {
  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-[#0D0B09]/60 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.aside
            ref={sidebarRef}
            initial={{ x: -280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -280, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
            className="sidebar-premium h-full fixed md:relative z-50 flex flex-col overflow-hidden"
          >
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
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-lg text-white/45 hover:text-white/80 hover:bg-white/[0.05] transition-all shrink-0 ml-2"
                  aria-label="Закрити меню"
                >
                  <X size={16} strokeWidth={1.5} />
                </button>
              </div>
            </div>

            <div className="h-px mx-5 shrink-0 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

            <nav className="flex-1 overflow-y-auto py-4 custom-scrollbar px-3 min-h-0">
              <p className="sidebar-label">Ресурси</p>
              <div className="space-y-0.5">
                {SIDEBAR_RESOURCES.map((item) => (
                  <SidebarLink key={item.title} {...item} />
                ))}
              </div>
            </nav>

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
    </>
  );
}
