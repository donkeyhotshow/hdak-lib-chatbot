import React, {
  memo,
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  BookMarked,
  BookOpen,
  Phone,
  FlaskConical,
  Star,
  X,
  Trash2,
  Plus,
  ExternalLink,
  ChevronDown,
  Facebook,
  Instagram,
  Globe,
  Pencil,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Conversation } from "./types";
import { ALL_LINKS, LIBRARY, isLibraryOpen } from "@/lib/constants";

const MAIN_LINKS = [
  { icon: Search, title: "Електронний каталог", url: ALL_LINKS.catalog_search },
  { icon: BookMarked, title: "Репозитарій ХДАК", url: ALL_LINKS.repository },
  { icon: Star, title: "Нові надходження", url: ALL_LINKS.new_books },
  { icon: BookOpen, title: "Правила бібліотеки", url: ALL_LINKS.rules },
] as const;

const SCIENCE_LINKS = [
  { icon: FlaskConical, title: "Scopus", url: ALL_LINKS.scopus },
  { icon: FlaskConical, title: "Web of Science", url: ALL_LINKS.wos },
  { icon: Globe, title: "Springer Link", url: ALL_LINKS.springer },
  { icon: Search, title: "Пошук наук. інфо", url: ALL_LINKS.sci_search },
] as const;

const CONTACT_ITEMS = [
  { label: "Телефон", value: LIBRARY.phone, href: `tel:${LIBRARY.phoneFull}` },
  { label: "Email", value: LIBRARY.email, href: `mailto:${LIBRARY.email}` },
  { label: "Viber/TG", value: "+380 66 145 84 84", href: ALL_LINKS.telegram },
] as const;

const BookIcon = memo(function BookIcon({
  size = 24,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size * 0.82}
      viewBox="0 0 28 23"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M14 4C14 4 8.5 2 2.5 4.5V20C8.5 17.5 14 19.5 14 19.5"
        stroke="currentColor"
        strokeWidth="1.4"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M14 4C14 4 19.5 2 25.5 4.5V20C19.5 17.5 14 19.5 14 19.5"
        stroke="currentColor"
        strokeWidth="1.4"
        fill="none"
        strokeLinecap="round"
        opacity="0.5"
      />
      <line
        x1="14"
        y1="3.5"
        x2="14"
        y2="19.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
});

const SidebarLink = memo(function SidebarLink({
  icon: Icon,
  title,
  subtitle,
  url,
  onClick,
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  url: string;
  onClick?: () => void;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      onClick={onClick}
      className="sidebar-link group"
    >
      <div className="sidebar-link-icon-wrap">
        <Icon size={14} strokeWidth={1.7} className="sidebar-icon" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="sidebar-text">{title}</div>
        {subtitle && <div className="sidebar-subtext">{subtitle}</div>}
      </div>
      <ExternalLink
        size={10}
        strokeWidth={1.5}
        className="sidebar-external opacity-0 group-hover:opacity-35 transition-opacity shrink-0"
      />
    </a>
  );
});

const SidebarSection = memo(function SidebarSection({
  label,
  children,
  defaultOpen = true,
}: {
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="sidebar-section-btn w-full flex items-center justify-between px-2 mb-1.5"
      >
        <span className="sidebar-label">{label}</span>
        <ChevronDown
          size={11}
          strokeWidth={2}
          className={cn(
            "text-[#D4A853]/30 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// ── ConvItem: rename + confirm-delete ────────────────────────────────────────
const ConvItem = memo(function ConvItem({
  conv,
  isActive,
  isNew,
  onLoad,
  onDelete,
  onRename,
}: {
  conv: Conversation;
  isActive: boolean;
  isNew: boolean;
  onLoad: (id: string) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onRename: (id: string, title: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(conv.title);
  // M43: sync editVal if conv.title changes externally (e.g. rename from another source)
  const prevTitleRef = React.useRef(conv.title);
  React.useEffect(() => {
    if (!editing && conv.title !== prevTitleRef.current) {
      setEditVal(conv.title);
      prevTitleRef.current = conv.title;
    }
  }, [conv.title, editing]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const deleteTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  React.useEffect(
    () => () => {
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    },
    [],
  );

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditVal(conv.title);
    setEditing(true);
  };

  const submitEdit = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    const trimmed = editVal.trim();
    if (trimmed && trimmed !== conv.title) onRename(conv.id, trimmed);
    setEditing(false);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmDelete) {
      onDelete(conv.id, e);
    } else {
      setConfirmDelete(true);
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
      deleteTimerRef.current = setTimeout(() => setConfirmDelete(false), 3000);
    }
  };

  return (
    <div
      onClick={() => !editing && onLoad(conv.id)}
      onKeyDown={(e) => {
        if (!editing && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onLoad(conv.id);
        }
      }}
      role="button"
      tabIndex={0}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group flex items-center gap-1.5 px-2 py-2 rounded-lg cursor-pointer transition-all",
        isActive
          ? "bg-[#D4A853]/10 border border-[#D4A853]/15"
          : "hover:bg-white/[0.04] border border-transparent",
      )}
    >
      {isNew && !isActive && (
        <span className="w-1.5 h-1.5 rounded-full bg-[#D4A853]/70 shrink-0" />
      )}
      {editing ? (
        <input
          autoFocus
          value={editVal}
          onChange={(e) => setEditVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submitEdit(e);
            if (e.key === "Escape") setEditing(false);
          }}
          onClick={(e) => e.stopPropagation()}
          aria-label="Назва розмови"
          className="flex-1 min-w-0 bg-white/[0.06] text-white/90 text-[12px] px-1.5 py-0.5 rounded outline-none border border-[#D4A853]/30"
        />
      ) : (
        <span className="text-[12.5px] leading-[1.45] text-white/65 group-hover:text-white/90 truncate flex-1 min-w-0 transition-colors">
          {conv.title}
        </span>
      )}
      <div className="flex items-center gap-0.5 shrink-0">
        {editing ? (
          <button
            onClick={submitEdit}
            className="p-2 text-[#D4A853]/60 hover:text-[#D4A853] transition-colors rounded min-w-[28px] min-h-[28px] flex items-center justify-center"
            aria-label="Зберегти"
          >
            <Check size={11} strokeWidth={2} />
          </button>
        ) : (
          <button
            onClick={startEdit}
            className="p-2 text-white/0 group-hover:text-white/20 hover:!text-[#D4A853]/60 transition-all rounded min-w-[28px] min-h-[28px] flex items-center justify-center"
            aria-label="Перейменувати"
          >
            <Pencil size={10} strokeWidth={1.5} />
          </button>
        )}
        <button
          onClick={handleDeleteClick}
          className={cn(
            "p-2 transition-all rounded text-[10px] min-w-[28px] min-h-[28px] flex items-center justify-center",
            confirmDelete
              ? "text-red-400/80 bg-red-400/10 font-medium px-2.5"
              : "text-white/0 group-hover:text-white/25 hover:!text-red-400/60",
          )}
          aria-label={confirmDelete ? "Підтвердити видалення" : "Видалити"}
          title={
            confirmDelete ? "Натисніть ще раз для підтвердження" : "Видалити"
          }
        >
          {confirmDelete ? "×?" : <Trash2 size={11} strokeWidth={1.5} />}
        </button>
      </div>
    </div>
  );
});

export interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isMobile?: boolean;
  sidebarRef: React.RefObject<HTMLElement | null>;
  conversations: Conversation[];
  currentConversation: Conversation | null;
  newConversationId?: string | null;
  loadConversation: (id: string) => void;
  deleteConversation: (id: string, e: React.MouseEvent) => void;
  renameConversation: (id: string, title: string) => void;
  createNewConversation: () => void;
  hasMore?: boolean;
  loadMore?: () => void;
  isLoadingConversations?: boolean;
}

// Fix #15: memo on entire Sidebar
export const Sidebar = memo(function Sidebar({
  isOpen,
  setIsOpen,
  isMobile,
  sidebarRef,
  conversations,
  currentConversation,
  newConversationId,
  loadConversation,
  deleteConversation,
  renameConversation,
  createNewConversation,
  hasMore = false,
  loadMore,
  isLoadingConversations = false,
}: SidebarProps) {
  // H1: avoid hydration mismatch — evaluate library status only on client after mount
  const [open, setOpen] = useState(false);
  useEffect(() => {
    try {
      setOpen(isLibraryOpen());
    } catch {
      /* Intl not supported */
    }
    const id = setInterval(() => {
      try {
        setOpen(isLibraryOpen());
      } catch {
        /* Intl not supported */
      }
    }, 60_000);
    return () => clearInterval(id);
  }, []);
  // Fix #6: search state — clear when sidebar closes so stale filter doesn't persist
  const [search, setSearch] = useState("");
  // UX2: loading state for "Показати ще" button
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  // Reset loading state when conversations change (load more completed)
  const prevConvCountRef = useRef(conversations.length);
  useEffect(() => {
    if (conversations.length !== prevConvCountRef.current) {
      setIsLoadingMore(false);
      prevConvCountRef.current = conversations.length;
    }
  }, [conversations.length]);
  useEffect(() => {
    if (!isOpen) setSearch("");
  }, [isOpen]);

  // Focus trap for mobile sidebar
  useEffect(() => {
    if (!isOpen || !isMobile || !sidebarRef.current) return;

    const focusableElements = sidebarRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[
      focusableElements.length - 1
    ] as HTMLElement;

    const handleTabKeyPress = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    window.addEventListener("keydown", handleTabKeyPress);
    return () => window.removeEventListener("keydown", handleTabKeyPress);
  }, [isOpen, isMobile, sidebarRef]);

  const handleNavClick = useCallback(() => {
    if (isMobile) setIsOpen(false);
  }, [isMobile]); // setIsOpen is a stable state setter — omitted from deps

  // Lock body scroll on mobile when drawer is open
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.innerWidth >= 768) return;
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const filtered = useMemo(
    () =>
      search.trim()
        ? conversations.filter((c) =>
            c.title
              .toLocaleLowerCase("uk")
              .includes(search.toLocaleLowerCase("uk")),
          )
        : conversations,
    [search, conversations],
  );

  return (
    <>
      {/* ── Backdrop (mobile only) ────────────────────────────────────────── */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-[#0D0B09]/60 backdrop-blur-sm md:hidden",
          "transition-opacity duration-200",
          isOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none",
        )}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      {/* ── Drawer / Sidebar panel ────────────────────────────────────────── */}
      <aside
        ref={sidebarRef}
        className={cn(
          "sidebar-premium flex flex-col",
          // Mobile: fixed overlay that slides; Desktop: relative in flex layout
          "fixed md:relative z-50",
          // CSS slide on mobile; no transition on desktop
          "transition-transform duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] md:transition-none",
          // Mobile: translate in/out based on open state
          isOpen ? "translate-x-0" : "-translate-x-full",
          // Desktop: hide from flex layout when closed
          !isOpen && "md:hidden",
        )}
        role="dialog"
        aria-modal={isOpen ? "true" : "false"}
        aria-label="Бокове меню"
      >
        {/* HEADER */}
        <div className="sidebar-header shrink-0">
          <div className="sidebar-header-glow" />
          <div className="relative flex items-center justify-between px-4 pt-4 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="sidebar-logo-icon">
                <BookIcon size={16} className="text-[#D4A853]" />
              </div>
              <div>
                <div className="logo-text text-[19px] leading-none">ХДАК</div>
                <div className="sidebar-subtitle">БІБЛІОТЕКА</div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="sidebar-close-btn"
              aria-label="Закрити меню"
            >
              <X size={16} strokeWidth={1.8} />
            </button>
          </div>
          <div className="px-4 pb-3">
            <div className="sidebar-status-inline">
              <span
                className={cn(
                  "sidebar-status-dot",
                  open ? "bg-emerald-400" : "bg-red-400/80",
                )}
              />
              <span
                className={cn(
                  "sidebar-status-inline-text",
                  open ? "text-emerald-400/70" : "text-red-400/60",
                )}
              >
                {open ? "Відкрито" : "Зачинено"}
              </span>
              <span className="sidebar-status-hours">
                {open
                  ? (() => {
                      const d = new Date().getDay();
                      return d === 6 ? "до 13:30" : "до 16:45";
                    })()
                  : (() => {
                      const d = new Date().getDay();
                      return d === 6 ? "Сб 9:00–13:30" : "Пн–Пт 9:00–16:45";
                    })()}
              </span>
            </div>
          </div>
          <div className="sidebar-header-divider" />
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 py-3 px-3">
          <SidebarSection label="Ресурси">
            <div className="space-y-0.5">
              {MAIN_LINKS.map((item) => (
                <SidebarLink
                  key={item.title}
                  {...item}
                  onClick={handleNavClick}
                />
              ))}
            </div>
          </SidebarSection>

          <SidebarSection label="Наукові бази" defaultOpen={false}>
            <div className="space-y-0.5">
              {SCIENCE_LINKS.map((item) => (
                <SidebarLink
                  key={item.title}
                  {...item}
                  onClick={handleNavClick}
                />
              ))}
            </div>
          </SidebarSection>

          <SidebarSection label="Контакти" defaultOpen={true}>
            <div className="space-y-1 px-1 pb-1">
              {CONTACT_ITEMS.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={handleNavClick}
                  className="sidebar-contact-row group"
                >
                  <span className="sidebar-contact-label">{item.label}</span>
                  <span className="sidebar-contact-value group-hover:text-[#D4A853] transition-colors">
                    {item.value}
                  </span>
                </a>
              ))}
              <div className="flex gap-2 mt-2">
                <a
                  href={ALL_LINKS.facebook}
                  target="_blank"
                  rel="noreferrer"
                  onClick={handleNavClick}
                  className="sidebar-social-btn"
                  title="Facebook"
                  aria-label="Facebook"
                >
                  <Facebook size={13} strokeWidth={1.6} />
                </a>
                <a
                  href={ALL_LINKS.instagram}
                  target="_blank"
                  rel="noreferrer"
                  onClick={handleNavClick}
                  className="sidebar-social-btn"
                  title="Instagram"
                  aria-label="Instagram"
                >
                  <Instagram size={13} strokeWidth={1.6} />
                </a>
                <a
                  href={ALL_LINKS.telegram}
                  target="_blank"
                  rel="noreferrer"
                  onClick={handleNavClick}
                  className="sidebar-social-btn"
                  title="Telegram"
                  aria-label="Telegram"
                >
                  <Phone size={13} strokeWidth={1.6} />
                </a>
              </div>
              <a
                href={ALL_LINKS.main}
                target="_blank"
                rel="noreferrer"
                onClick={handleNavClick}
                className="sidebar-website-btn"
              >
                <Globe size={12} strokeWidth={1.6} />
                <span>Сайт бібліотеки</span>
                <ExternalLink
                  size={10}
                  strokeWidth={1.5}
                  className="opacity-40 ml-auto"
                />
              </a>
            </div>
          </SidebarSection>

          {/* History with search */}
          <SidebarSection label="Історія" defaultOpen={true}>
            {isLoadingConversations && conversations.length === 0 && (
              <div className="space-y-2 px-1 py-2">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-8 rounded-lg bg-white/[0.04] animate-pulse"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
            )}
            {!isLoadingConversations &&
              conversations.length === 0 &&
              !search && (
                <p className="text-[11px] text-white/25 text-center py-3 px-2">
                  Розмов ще немає. Почніть новий чат!
                </p>
              )}
            {conversations.length >= 2 && (
              <div className="relative mb-1.5 px-1">
                <Search
                  size={11}
                  strokeWidth={1.8}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none"
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Пошук..."
                  aria-label="Пошук розмов"
                  className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg pl-7 pr-3 py-1.5 text-[11.5px] text-white/60 placeholder:text-white/25 outline-none focus:border-[#D4A853]/20 transition-colors"
                />
              </div>
            )}
            <div className="space-y-0.5">
              {filtered.map((conv) => (
                <ConvItem
                  key={conv.id}
                  conv={conv}
                  isActive={currentConversation?.id === conv.id}
                  isNew={conv.id === newConversationId}
                  onLoad={(id) => {
                    loadConversation(id);
                    handleNavClick();
                  }}
                  onDelete={deleteConversation}
                  onRename={renameConversation}
                />
              ))}
              {filtered.length === 0 && search && (
                <p className="text-[11px] text-white/25 text-center py-2">
                  Нічого не знайдено
                </p>
              )}
              {hasMore && loadMore && !search && (
                <button
                  onClick={() => {
                    setIsLoadingMore(true);
                    loadMore();
                  }}
                  disabled={isLoadingMore}
                  className="w-full py-1.5 text-[11px] text-[#D4A853]/30 hover:text-[#D4A853]/60 transition-colors text-center tracking-wide disabled:opacity-40 disabled:cursor-wait"
                >
                  {isLoadingMore ? "Завантаження..." : "Показати ще..."}
                </button>
              )}
            </div>
          </SidebarSection>
        </div>

        {/* FOOTER */}
        <div className="px-3 pb-3 pt-2 shrink-0 border-t border-white/[0.04]">
          <button
            onClick={() => {
              createNewConversation();
              handleNavClick();
            }}
            className="btn-new-chat w-full py-3 rounded-xl text-[11px] flex items-center justify-center gap-2 tracking-[0.12em]"
          >
            <Plus size={14} strokeWidth={2.5} />
            <span>НОВИЙ ЧАТ</span>
          </button>
        </div>
      </aside>
    </>
  );
});
