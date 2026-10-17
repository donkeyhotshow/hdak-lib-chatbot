"use client";

// REDESIGNED
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  Globe,
  History,
  Loader2,
  Menu,
  Plus,
  Send,
  Square,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useChat } from "@/hooks/use-chat";

type Language = "uk" | "en";
type ResourceItem = {
  icon: string;
  label: string;
  href: string;
  };
type ResourceGroup = {
  title: string;
  items: ResourceItem[];
};

const translations = {
  uk: {
    history: "Історія",
    resources: "Ресурси",
    newChat: "Новий чат",
    ask: "Чим можу допомогти?",
    subtitle: "Поставте запитання про каталог, ресурси або бібліотечні сервіси.",
    hint: "Enter — надіслати · Shift+Enter — новий рядок",
    placeholder: "Напишіть запитання...",
    noConversations: "Поки що немає розмов",
    examples: [
      "Як знайти книги з режисури?",
      "Де перевірити наукові статті?",
      "Підбери джерела для курсової",
      "Що є в електронному каталозі?",
    ],
  },
  en: {
    history: "History",
    resources: "Resources",
    newChat: "New chat",
    ask: "How can I help?",
    subtitle: "Ask about the catalog, research resources, or library services.",
    hint: "Enter — send · Shift+Enter — new line",
    placeholder: "Type your message...",
    noConversations: "No conversations yet",
    examples: [
      "How can I find directing books?",
      "Where can I search research papers?",
      "Suggest sources for coursework",
      "What is in the e-catalog?",
    ],
  },
} as const;

const resources: ResourceGroup[] = [
  {
    title: "Open access",
    items: [
      {
        icon: "🗂️",
        label: "Електронний каталог",
        href: "https://library-service.com.ua:8443/khkhdak/DocumentSearchForm",
      },
      {
        icon: "🏛️",
        label: "Репозитарій ХДАК",
        href: "https://repository.ac.kharkov.ua/home",
      },
      {
        icon: "🎭",
        label: "Культура України",
        href: "http://elib.nplu.org/",
      },
    ],
  },
  {
    title: "Open access",
    items: [
      {
        icon: "📖",
        label: "DOAJ",
        href: "https://lib-hdak.in.ua/catalog-doaj.html",
      },
      {
        icon: "📜",
        label: "УкрІНТЕІ",
        href: "http://nrat.ukrintei.ua/",
      },
      {
        icon: "🏠",
        label: "Сайт бібліотеки",
        href: "https://lib-hdak.in.ua/",
      },
    ],
  },
];

export default function ChatPage() {
  const { toast } = useToast();
  const [language, setLanguage] = useState<Language>("uk");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    messages,
    inputValue,
    setInputValue,
    isTyping,
    isLoadingConversation,
    isLoadingConversations,
    conversations,
    currentConversation,
    messagesEndRef,
    hasMoreConversations,
    handleSend,
    handleFaqSend,
    handleStop,
    loadConversation,
    createNewConversation,
    loadMoreConversations,
    formatTime,
  } = useChat(toast);

  const t = translations[language];
  const isEmptyState = messages.length === 0;

  const closeMenus = () => {
    setHistoryOpen(false);
    setResourcesOpen(false);
  };

  const adjustTextarea = () => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 100)}px`;
  };

  useEffect(() => {
    const link = document.createElement("link");
    link.href =
      "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  useEffect(() => {
    adjustTextarea();
  }, [inputValue]);

  const containerStyle = useMemo(
    () =>
      ({
        backgroundColor: "#f8f5ee",
        color: "#2a211b",
        fontFamily: "'DM Sans', sans-serif",
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='f'%3E%3CfeTurbulence baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23f)' opacity='0.035'/%3E%3C/svg%3E\")",
      }) as React.CSSProperties,
    []
  );

  return (
    <div className="min-h-screen" style={containerStyle}>
      <style>{` 
        @keyframes breathe {
          0%,100% { box-shadow: 0 0 32px rgba(200,168,75,0.22); }
          50% { box-shadow: 0 0 64px rgba(200,168,75,0.38); }
        }
        @keyframes msgIn {
          from { opacity:0; transform:translateY(8px); }
          to { opacity:1; transform:translateY(0); }
        }
        @keyframes dotPulse {
          0%,100% { transform:scale(.75); opacity:.3; }
          50% { transform:scale(1.2); opacity:.9; }
        }
      `}</style>

      {(historyOpen || resourcesOpen) && (
        <button
          className="fixed inset-0 z-30 cursor-default"
          aria-label="close menus"
          onClick={closeMenus}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 hidden w-[276px] border-r border-[#7b4b2a] bg-[#2b1a12] p-4 text-[#f3e4cf] shadow-[10px_0_35px_rgba(43,26,18,0.28)] backdrop-blur-sm transition-transform duration-200 md:block ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        aria-label="Історія розмов і ресурси"
      >
        <div className="flex min-h-12 items-center justify-between border-b border-[#8f5b35]/35 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">📚</span>
            <span className="text-[17px] font-semibold tracking-wide text-[#f3e4cf]" style={{ fontFamily: "'Playfair Display', serif" }}>
              Бібліотека ХДАК
            </span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-md p-1.5 text-[#c69a6b] hover:bg-[#8f5b35]/30 hover:text-[#fff6e9]"
            aria-label="Скрыть сайдбар"
          >
            ×
          </button>
        </div>
        <button
          onClick={createNewConversation}
          className="mt-4 flex min-h-11 w-full items-center gap-2 rounded-lg border border-[#b87830]/60 bg-[#8f5b35]/35 px-3 py-2.5 text-left text-sm text-[#fff6e9] hover:bg-[#a96e43]/45"
        >
          <Plus size={15} /> {t.newChat}
        </button>
        <div className="mt-5 border-t border-[#8f5b35]/35 pt-4">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#c69a6b]">
            <BookOpen size={13} /> {t.resources}
          </div>
          <div className="space-y-3">
            {resources.map((group, index) => (
              <div key={`${group.title}-${index}`}>
                <div className="mb-1 px-2 text-[10px] font-medium uppercase tracking-wider text-[#9f7654]">{group.title}</div>
                <div className="space-y-0.5">
                  {group.items.map(item => (
                    <a
                      key={item.label}
                      href={item.href}
                      target="_blank"
                      rel="noreferrer"
                      className="flex min-h-10 items-center justify-between rounded-lg px-3 py-2 text-sm text-[#ead5bc] transition hover:bg-[#8f5b35]/35 hover:text-[#fff6e9]"
                    >
                      <span className="mr-2 truncate">{item.icon} {item.label}</span>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-5 border-t border-[#8f5b35]/35 pt-4">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#c69a6b]">{t.history}</div>
        </div>
        <div className="max-h-[calc(100vh-470px)] min-h-[100px] space-y-1 overflow-y-auto">
          {isLoadingConversations ? (
            <div className="py-6 text-center text-xs text-[#9f7654]">Loading...</div>
          ) : conversations.length === 0 ? (
            <div className="py-6 text-center text-xs text-[#9f7654]">{t.noConversations}</div>
          ) : (
            conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => void loadConversation(conv.id)}
                className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition ${currentConversation?.id === conv.id ? "bg-[#8f5b35]/55 text-[#fff6e9]" : "text-[#ead5bc]/75 hover:bg-[#8f5b35]/30"}`}
              >
                <span className="block truncate">{conv.title}</span>
                <span className="mt-1 block text-[10px] text-[#8b7766]">{formatTime(conv.createdAt)}</span>
              </button>
            ))
          )}
        </div>
      </aside>
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed left-3 top-3 z-50 rounded-lg border border-[#7b4b2a] bg-[#2b1a12] p-2 text-[#f3e4cf] shadow-sm hover:bg-[#8f5b35]"
          aria-label="Показать сайдбар"
        >
          <Menu size={17} />
        </button>
      )}

      <header className="fixed top-0 z-40 h-[52px] w-full border-b border-[#b87830]/20 bg-[#fffdf9]/95 backdrop-blur-sm">
        <div className="mx-auto flex h-full max-w-[1100px] items-center justify-between px-4">
          <div className="relative">
            <button
              onClick={() => {
                setHistoryOpen(v => !v);
                setResourcesOpen(false);
              }}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-[#2a211b] hover:bg-[#b87830]/10"
            >
              <History size={16} />
              <span className="max-[480px]:hidden">{t.history}</span>
              <ChevronDown size={14} />
            </button>
            {historyOpen && (
              <div className="absolute left-0 top-[44px] z-50 w-[320px] rounded-xl border border-[#b87830]/25 bg-[#fffdf9] p-2 shadow-2xl max-w-[90vw]">
                <button
                  onClick={() => {
                    createNewConversation();
                    closeMenus();
                  }}
                  className="mb-2 flex w-full items-center gap-2 rounded-lg border border-[#b87830]/30 bg-[#b87830]/10 px-3 py-2 text-left text-sm text-[#2a211b] hover:bg-[#b87830]/20"
                >
                  <Plus size={15} /> {t.newChat}
                </button>
                <div className="max-h-[320px] overflow-y-auto pr-1">
                  {isLoadingConversations ? (
                    <div className="px-3 py-6 text-center text-sm text-[#8b7766]">
                      <Loader2 className="mx-auto mb-2 animate-spin" size={16} />
                      Loading...
                    </div>
                  ) : conversations.length === 0 ? (
                    <div className="px-3 py-6 text-center text-sm text-[#8b7766]">{t.noConversations}</div>
                  ) : (
                    conversations.map(conv => (
                      <button
                        key={conv.id}
                        onClick={() => {
                          void loadConversation(conv.id);
                          closeMenus();
                        }}
                        className={`mb-1 w-full rounded-lg px-3 py-2 text-left transition ${
                          currentConversation?.id === conv.id
                            ? "bg-[#b87830]/20 text-[#2a211b]"
                            : "text-[#2a211b] hover:bg-[#b87830]/10"
                        }`}
                      >
                        <div className="truncate text-sm">{conv.title}</div>
                        <div className="mt-1 text-xs text-[#8b7766]">{formatTime(conv.createdAt)}</div>
                      </button>
                    ))
                  )}
                </div>
                {hasMoreConversations && (
                  <button
                    onClick={() => void loadMoreConversations()}
                    className="mt-2 w-full rounded-lg border border-[#b87830]/20 px-3 py-2 text-xs text-[#2a211b] hover:bg-[#b87830]/10"
                  >
                    Load more
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="relative flex items-center gap-2">
            <button
              onClick={() => {
                setResourcesOpen(v => !v);
                setHistoryOpen(false);
              }}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-[#2a211b] hover:bg-[#b87830]/10"
            >
              <BookOpen size={16} />
              <span className="max-[480px]:hidden">{t.resources}</span>
              <ChevronDown size={14} />
            </button>
            <div className="flex items-center gap-1 rounded-md border border-[#b87830]/20 bg-[#f8f5ee]/60 p-1">
              <Globe size={13} className="text-[#8b7766]" />
              {(["uk", "en"] as Language[]).map(code => (
                <button
                  key={code}
                  onClick={() => setLanguage(code)}
                  className={`rounded px-1.5 py-0.5 text-[11px] ${
                    language === code
                      ? "bg-[#b87830] text-[#fffaf2]"
                      : "text-[#2a211b]/80 hover:bg-[#b87830]/15"
                  }`}
                >
                  {code === "uk" ? "УКР" : "ENG"}
                </button>
              ))}
            </div>
            {resourcesOpen && (
              <div className="absolute right-0 top-[44px] z-50 w-[360px] max-w-[94vw] rounded-xl border border-[#b87830]/25 bg-[#fffdf9] p-3 shadow-2xl">
                {resources.map((group, index) => (
                  <div key={`${group.title}-${index}`}>
                    {index > 0 && <div className="my-2 h-px bg-[#b87830]/15" />}
                    <div className="space-y-1">
                      {group.items.map(item => (
                        <a
                          key={item.label}
                          href={item.href}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between rounded-lg px-2.5 py-2 text-sm text-[#2a211b] hover:bg-[#b87830]/12"
                        >
                          <span className="mr-3 truncate">
                            {item.icon} {item.label}
                          </span>

                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto flex h-screen w-full max-w-[740px] flex-col px-6 pt-[52px] transition-[margin] duration-200 max-[640px]:px-4 md:ml-[calc(276px+max(0px,(100vw-1100px)/2))]">
        <section className="flex-1 overflow-y-auto py-6">
          {isLoadingConversation ? (
            <div className="flex h-full items-center justify-center text-[#8b7766]">
              <Loader2 className="animate-spin" />
            </div>
          ) : isEmptyState ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div
                className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#fffdf9] text-3xl"
                style={{ animation: "breathe 2.6s ease-in-out infinite" }}
              >
                📚
              </div>
              <h2
                className="text-[26px] font-semibold text-[#2a211b]"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {t.ask}
              </h2>
              <p className="mt-2 max-w-[520px] text-sm text-[#8b7766]">{t.subtitle}</p>
              <div className="my-4 flex items-center gap-3 text-[#b87830]/70">
                <div className="h-px w-14 bg-[#b87830]/25" />
                <span>✦</span>
                <div className="h-px w-14 bg-[#b87830]/25" />
              </div>
              <div className="grid max-w-[620px] grid-cols-1 gap-2 sm:grid-cols-2">
                {t.examples.map(example => (
                  <button
                    key={example}
                    onClick={() => handleFaqSend(example)}
                    className="rounded-full border border-[#8b7766]/40 bg-[#fffdf9]/70 px-4 py-2 text-sm text-[#2a211b] transition hover:border-[#b87830]"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-[14px]">
              {messages.map(message => {
                const isUser = message.role === "USER";
                return (
                  <div
                    key={message.id}
                    className={`flex items-end gap-2 ${isUser ? "justify-end" : "justify-start"}`}
                    style={{ animation: "msgIn .22s ease-out" }}
                  >
                    {!isUser && (
                      <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-[#fffdf9] text-sm">
                        📚
                      </div>
                    )}
                    <div
                      className={`max-w-[82%] rounded-2xl border px-3 py-2 text-sm leading-relaxed ${
                        isUser
                          ? "rounded-tr-[3px] border-[#b87830]/30 bg-[#eadcc8] text-[#2a211b]"
                          : "rounded-tl-[3px] border-[#8b7766]/35 bg-[#fffdf9] text-[#2a211b]"
                      }`}
                    >
                      <div className="whitespace-pre-wrap break-words">{message.content}</div>
                      <div className="mt-1 text-[10px] text-[#8b7766]">{formatTime(message.createdAt)}</div>
                    </div>
                    {isUser && (
                      <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-[#fffdf9] text-sm">
                        👤
                      </div>
                    )}
                  </div>
                );
              })}

              {isTyping && (
                <div className="flex items-end gap-2">
                  <div className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[#fffdf9] text-sm">
                    📚
                  </div>
                  <div className="rounded-2xl rounded-tl-[3px] border border-[#8b7766]/35 bg-[#fffdf9] px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      {[0, 1, 2].map(index => (
                        <span
                          key={index}
                          className="block h-2 w-2 rounded-full bg-[#b87830]"
                          style={{ animation: `dotPulse .9s ease-in-out ${index * 0.18}s infinite` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </section>

        <section className="sticky bottom-0 pb-[22px] pt-3">
          <div className="rounded-2xl border border-[#8b7766]/35 bg-[#fffdf9]/90 p-3 shadow-[0_10px_24px_rgba(0,0,0,0.35)] backdrop-blur-sm focus-within:border-[#b87830]/60 focus-within:shadow-[0_0_0_1px_rgba(200,168,75,.35),0_12px_30px_rgba(0,0,0,.45)]">
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => {
                  if ((e.nativeEvent as KeyboardEvent).isComposing) return;
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (isTyping) {
                      handleStop();
                    } else {
                      handleSend();
                    }
                  }
                }}
                placeholder={t.placeholder}
                className="max-h-[100px] min-h-[42px] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-[#2a211b] outline-none placeholder:text-[#8b7766]"
              />
              <button
                onClick={() => (isTyping ? handleStop() : handleSend())}
                className="mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#b87830] text-[#fffaf2] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!isTyping && inputValue.trim().length === 0}
                aria-label={isTyping ? "Stop" : "Send"}
              >
                {isTyping ? <Square size={14} fill="currentColor" /> : <Send size={14} />}
              </button>
            </div>
            <div className="mt-2 px-2 text-[11px] text-[#8b7766]">{t.hint}</div>
          </div>
        </section>
      </main>
    </div>
  );
}
