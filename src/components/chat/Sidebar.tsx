import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Sparkles, Link2, FlaskConical, X, Trash2, Plus, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Conversation } from './types';
import { ALL_LINKS } from '@/lib/constants';

const SIDEBAR_RESOURCES = [
  { icon: Search, title: 'Пошук у каталозі', url: ALL_LINKS.catalog_search },
  { icon: Sparkles, title: 'Репозитарій', url: ALL_LINKS.repository },
  { icon: Link2, title: 'Нові надходження', url: ALL_LINKS.new_books },
  { icon: FlaskConical, title: 'Наукова інформація', url: ALL_LINKS.sci_search },
] as const;

const BookIcon = memo(function BookIcon({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size * 0.82} viewBox="0 0 28 23" fill="none" className={className}>
      <path d="M14 4C14 4 8.5 2 2.5 4.5V20C8.5 17.5 14 19.5 14 19.5" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round"/>
      <path d="M14 4C14 4 19.5 2 25.5 4.5V20C19.5 17.5 14 19.5 14 19.5" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.5"/>
      <line x1="14" y1="3.5" x2="14" y2="19.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
});

const SidebarLink = memo(function SidebarLink({ icon: Icon, title, url }: {
  icon: React.ElementType; title: string; url: string;
}) {
  return (
    <a href={url} target="_blank" rel="noreferrer" className="sidebar-link group">
      <div className="sidebar-link-icon-wrap">
        <Icon size={15} strokeWidth={1.6} className="sidebar-icon" />
      </div>
      <span className="sidebar-text">{title}</span>
      <ExternalLink size={11} strokeWidth={1.5} className="sidebar-external opacity-0 group-hover:opacity-40 transition-opacity shrink-0" />
    </a>
  );
});

export interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  sidebarRef: React.RefObject<HTMLDivElement | null>;
  conversations: Conversation[];
  currentConversation: Conversation | null;
  loadConversation: (id: string) => void;
  deleteConversation: (id: string, e: React.MouseEvent) => void;
  createNewConversation: () => void;
  hasMore?: boolean;
  loadMore?: () => void;
}

export function Sidebar({
  isOpen, setIsOpen, sidebarRef, conversations, currentConversation,
  loadConversation, deleteConversation, createNewConversation, hasMore = false, loadMore,
}: SidebarProps) {
  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
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
            className="sidebar-premium h-full fixed md:relative z-50 flex flex-col"
          >

            {/*  HEADER  */}
            <div className="sidebar-header shrink-0">
              <div className="sidebar-header-glow" />
              <div className="relative flex items-start justify-between px-5 pt-5 pb-4">
                <div className="flex items-center gap-3.5">
                  <div className="sidebar-logo-icon">
                    <BookIcon size={22} className="text-[#D4A853]" />
                  </div>
                  <div>
                    <div className="logo-text text-[24px] leading-none">ХДАК</div>
                    <div className="sidebar-subtitle">БІБЛІОТЕКА</div>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="sidebar-close-btn mt-0.5"
                  aria-label="Закрити меню"
                >
                  <X size={15} strokeWidth={1.8} />
                </button>
              </div>
              <div className="sidebar-header-divider" />
            </div>

            {/*  SCROLLABLE BODY  */}
            <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 py-3 px-3">

              {/* Resources */}
              <p className="sidebar-label px-2 mb-2">Ресурси</p>
              <div className="space-y-0.5 mb-4">
                {SIDEBAR_RESOURCES.map((item) => (
                  <SidebarLink key={item.title} {...item} />
                ))}
              </div>

              {/* History */}
              {conversations.length > 0 && (
                <>
                  <div className="sidebar-section-divider" />
                  <p className="sidebar-label px-2 mb-2 mt-3">Історія</p>
                  <div className="space-y-0.5">
                    {conversations.map((conv) => (
                      <div
                        key={conv.id}
                        onClick={() => loadConversation(conv.id)}
                        className={cn(
                          "group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all",
                          currentConversation?.id === conv.id
                            ? "bg-[#D4A853]/10 border border-[#D4A853]/15"
                            : "hover:bg-white/[0.04] border border-transparent"
                        )}
                      >
                        <span className="text-[12.5px] leading-[1.4] text-white/60 group-hover:text-white/90 truncate flex-1 min-w-0 transition-colors font-normal">
                          {conv.title}
                        </span>
                        <button
                          onClick={(e) => deleteConversation(conv.id, e)}
                          className="p-1.5 text-white/0 group-hover:text-white/30 hover:!text-red-400/60 transition-all shrink-0 rounded"
                          aria-label="Видалити"
                        >
                          <Trash2 size={12} strokeWidth={1.5} />
                        </button>
                      </div>
                    ))}
                    {hasMore && loadMore && (
                      <button
                        onClick={loadMore}
                        className="w-full py-2 text-[11px] text-[#D4A853]/35 hover:text-[#D4A853]/65 transition-colors text-center tracking-wide"
                      >
                        Показати ще...
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            {/*  FOOTER  */}
            <div className="px-3 pb-3 pt-2 shrink-0 border-t border-white/[0.04]">
              <button
                onClick={createNewConversation}
                className="btn-new-chat w-full py-3 rounded-xl text-[11px] flex items-center justify-center gap-2 tracking-[0.12em]"
              >
                <Plus size={14} strokeWidth={2.5} />
                <span>НОВИЙ ЧАТ</span>
              </button>
            </div>

          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}