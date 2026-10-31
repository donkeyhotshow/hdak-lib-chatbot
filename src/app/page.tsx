"use client";

// REDESIGNED
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  Globe,
  History,
  Loader2,
  Plus,
  Send,
  Square,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
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
    subtitle:
      "Поставте запитання про каталог, ресурси або бібліотечні сервіси.",
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
  const lastMessage = messages[messages.length - 1];
  const followUpSuggestions = useMemo(() => {
    if (isTyping || !lastMessage || lastMessage.role !== "ASSISTANT") return [];
    const text = lastMessage.content.toLowerCase();
    if (/графік|розклад|годин|hours|schedule|open/i.test(text)) {
      return language === "uk"
        ? ["Як записатися до бібліотеки?", "Які контакти бібліотеки?"]
        : ["How to register at the library?", "What are the library contacts?"];
    }
    if (/книг|каталог|автор|book|catalog|author/i.test(text)) {
      return language === "uk"
        ? ["Як знайти книгу в каталозі?", "Які електронні ресурси доступні?"]
        : [
            "How to find a book in the catalog?",
            "What electronic resources are available?",
          ];
    }
    return language === "uk"
      ? ["Як знайти книгу в каталозі?", "Який графік роботи бібліотеки?"]
      : ["How to find a book in the catalog?", "What are the library hours?"];
  }, [isTyping, language, lastMessage]);

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
      "https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&family=Source+Sans+3:wght@400;500;600&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  useEffect(() => {
    adjustTextarea();
  }, [inputValue]);

  useEffect(() => {
    if (!historyOpen && !resourcesOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenus();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [historyOpen, resourcesOpen]);

  const containerStyle = useMemo(
    () =>
      ({
        backgroundColor: "var(--background)",
        color: "var(--foreground)",
        fontFamily: "'Source Sans 3', sans-serif",
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='f'%3E%3CfeTurbulence baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23f)' opacity='0.035'/%3E%3C/svg%3E\")",
      }) as React.CSSProperties,
    []
  );

  return (
    <div className="min-h-[100dvh] overflow-x-hidden" style={containerStyle}>
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
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: .01ms !important;
            animation-iteration-count: 1 !important;
            scroll-behavior: auto !important;
            transition-duration: .01ms !important;
          }
        }
      `}</style>

      {(historyOpen || resourcesOpen) && (
        <button
          className="fixed inset-0 z-30 cursor-default bg-[#3b2a1f]/10"
          aria-label="Закрити меню"
          onClick={closeMenus}
        />
      )}

      <header
        className="fixed inset-x-0 top-0 z-40 min-h-[52px] border-b border-[#8b5e3c]/20 pt-[env(safe-area-inset-top)] backdrop-blur-sm"
        style={{ backgroundColor: "rgba(255, 250, 242, 0.96)" }}
      >
        <div className="mx-auto flex h-[52px] max-w-[1100px] items-center justify-between gap-2 px-3 sm:px-4">
          <div className="relative">
            <button
              onClick={() => {
                setHistoryOpen(v => !v);
                setResourcesOpen(false);
              }}
              aria-label={historyOpen ? "Закрити історію" : t.history}
              aria-expanded={historyOpen}
              aria-haspopup="dialog"
              className="flex min-h-10 items-center gap-2 rounded-md px-2 py-1.5 text-sm text-[#3b2a1f] hover:bg-[#8b5e3c]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b5e3c]/50"
            >
              {historyOpen ? <X size={16} /> : <History size={16} />}
              <span className="max-[480px]:hidden">{t.history}</span>
              <ChevronDown size={14} />
            </button>
            {historyOpen && (
              <div className="absolute left-0 top-[44px] z-50 w-[320px] rounded-xl border border-[#8b5e3c]/25 bg-[#fffaf2] p-2 shadow-2xl max-w-[90vw]">
                <button
                  onClick={() => {
                    createNewConversation();
                    closeMenus();
                  }}
                  className="mb-2 flex w-full items-center gap-2 rounded-lg border border-[#8b5e3c]/30 bg-[#8b5e3c]/10 px-3 py-2 text-left text-sm text-[#3b2a1f] hover:bg-[#8b5e3c]/20"
                >
                  <Plus size={15} /> {t.newChat}
                </button>
                <div className="max-h-[min(60vh,320px)] overflow-y-auto overscroll-contain pr-1">
                  {isLoadingConversations ? (
                    <div className="px-3 py-6 text-center text-sm text-[#7a6350]">
                      <Loader2
                        className="mx-auto mb-2 animate-spin"
                        size={16}
                      />
                      Loading...
                    </div>
                  ) : conversations.length === 0 ? (
                    <div className="px-3 py-6 text-center text-sm text-[#7a6350]">
                      {t.noConversations}
                    </div>
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
                            ? "bg-[#8b5e3c]/20 text-[#3b2a1f]"
                            : "text-[#3b2a1f] hover:bg-[#8b5e3c]/10"
                        }`}
                      >
                        <div className="truncate text-sm">{conv.title}</div>
                        <div className="mt-1 text-xs text-[#7a6350]">
                          {formatTime(conv.createdAt)}
                        </div>
                      </button>
                    ))
                  )}
                </div>
                {hasMoreConversations && (
                  <button
                    onClick={() => void loadMoreConversations()}
                    className="mt-2 w-full rounded-lg border border-[#8b5e3c]/20 px-3 py-2 text-xs text-[#3b2a1f] hover:bg-[#8b5e3c]/10"
                  >
                    Load more
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-lg">📚</span>
            <span
              className="text-[18px] font-semibold text-[#3b2a1f]"
              style={{ fontFamily: "'Lora', serif" }}
            >
              Бібліотека ХДАК
            </span>
          </div>

          <div className="relative flex items-center gap-2">
            <button
              onClick={() => {
                setResourcesOpen(v => !v);
                setHistoryOpen(false);
              }}
              aria-label={resourcesOpen ? "Закрити ресурси" : t.resources}
              aria-expanded={resourcesOpen}
              aria-haspopup="dialog"
              className="flex min-h-10 items-center gap-2 rounded-md px-2 py-1.5 text-sm text-[#3b2a1f] hover:bg-[#8b5e3c]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b5e3c]/50"
            >
              <BookOpen size={16} />
              <span className="max-[480px]:hidden">{t.resources}</span>
              <ChevronDown size={14} />
            </button>
            <div className="flex shrink-0 items-center gap-1 rounded-md border border-[#8b5e3c]/20 bg-[#f5efe6]/60 p-1">
              <Globe size={13} className="text-[#7a6350]" />
              {(["uk", "en"] as Language[]).map(code => (
                <button
                  key={code}
                  onClick={() => setLanguage(code)}
                  className={`rounded px-1.5 py-0.5 text-[11px] ${
                    language === code
                      ? "bg-[#8b5e3c] text-[#1b1404]"
                      : "text-[#3b2a1f]/80 hover:bg-[#8b5e3c]/15"
                  }`}
                >
                  {code === "uk" ? "УКР" : "ENG"}
                </button>
              ))}
            </div>
            {resourcesOpen && (
              <div className="absolute right-0 top-[44px] z-50 w-[360px] max-w-[calc(100vw-24px)] rounded-xl border border-[#8b5e3c]/25 bg-[#fffaf2] p-3 shadow-2xl">
                {resources.map((group, index) => (
                  <div key={`${group.title}-${index}`}>
                    {index > 0 && <div className="my-2 h-px bg-[#8b5e3c]/15" />}
                    <div className="space-y-1">
                      {group.items.map(item => (
                        <a
                          key={item.label}
                          href={item.href}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between rounded-lg px-2.5 py-2 text-sm text-[#3b2a1f] hover:bg-[#8b5e3c]/12"
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

      <main className="mx-auto flex h-[100dvh] min-h-0 w-full max-w-[740px] flex-col px-6 pt-[calc(52px+env(safe-area-inset-top))] max-[640px]:px-3 sm:px-4">
        <section
          className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 pt-4 sm:px-0 sm:py-6 sm:pb-6 ${
            isEmptyState ? "pb-4" : "pb-[160px]"
          }`}
        >
          {isLoadingConversation ? (
            <div className="flex h-full items-center justify-center text-[#7a6350]">
              <Loader2 className="animate-spin" />
            </div>
          ) : isEmptyState ? (
            <div className="flex min-h-full flex-col items-center justify-start pt-8 text-center sm:justify-center sm:pt-0">
              <div
                className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#fffaf2] text-3xl"
                style={{ animation: "breathe 2.6s ease-in-out infinite" }}
              >
                📚
              </div>
              <h2
                className="text-[26px] font-semibold text-[#3b2a1f]"
                style={{ fontFamily: "'Lora', serif" }}
              >
                {t.ask}
              </h2>
              <p className="mt-2 max-w-[520px] text-sm text-[#7a6350]">
                {t.subtitle}
              </p>
              <div className="my-4 flex items-center gap-3 text-[#8b5e3c]/70">
                <div className="h-px w-14 bg-[#8b5e3c]/25" />
                <span>✦</span>
                <div className="h-px w-14 bg-[#8b5e3c]/25" />
              </div>
              <div className="grid max-w-[620px] grid-cols-1 gap-2 sm:grid-cols-2">
                {t.examples.map(example => (
                  <button
                    key={example}
                    onClick={() => handleFaqSend(example)}
                    className="rounded-full border border-[#7a6350]/40 bg-[#fffaf2]/70 px-4 py-2 text-sm text-[#3b2a1f] transition hover:border-[#8b5e3c]"
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
                      <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-[#fffaf2] text-sm">
                        📚
                      </div>
                    )}
                    <div
                      className={`max-w-[min(82%,620px)] rounded-2xl border px-3 py-2 text-sm leading-relaxed sm:px-4 ${
                        isUser
                          ? "rounded-tr-[3px] border-[#8b5e3c]/30 bg-[#8b5e3c] text-[#3b2a1f]"
                          : "rounded-tl-[3px] border-[#7a6350]/35 bg-[#fffaf2] text-[#3b2a1f]"
                      }`}
                    >
                      <div className="break-words [overflow-wrap:anywhere]">
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => (
                              <p className="mb-2 last:mb-0">{children}</p>
                            ),
                            a: ({ children, href }) => (
                              <a
                                href={href}
                                target="_blank"
                                rel="noreferrer"
                                className="break-all underline underline-offset-2"
                              >
                                {children}
                              </a>
                            ),
                            ul: ({ children }) => (
                              <ul className="mb-2 list-disc pl-5">
                                {children}
                              </ul>
                            ),
                            ol: ({ children }) => (
                              <ol className="mb-2 list-decimal pl-5">
                                {children}
                              </ol>
                            ),
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                      <div className="mt-1 text-[10px] text-[#7a6350]">
                        {formatTime(message.createdAt)}
                      </div>
                    </div>
                    {isUser && (
                      <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-[#fffaf2] text-sm">
                        👤
                      </div>
                    )}
                  </div>
                );
              })}

              {isTyping && (
                <div className="flex items-end gap-2">
                  <div className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[#fffaf2] text-sm">
                    📚
                  </div>
                  <div className="rounded-2xl rounded-tl-[3px] border border-[#7a6350]/35 bg-[#fffaf2] px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      {[0, 1, 2].map(index => (
                        <span
                          key={index}
                          className="block h-2 w-2 rounded-full bg-[#8b5e3c]"
                          style={{
                            animation: `dotPulse .9s ease-in-out ${index * 0.18}s infinite`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {!isTyping && followUpSuggestions.length > 0 && (
                <div
                  className="ml-8 flex flex-wrap gap-2 pt-1"
                  aria-label="Запропоновані запитання"
                >
                  {followUpSuggestions.map(question => (
                    <button
                      key={question}
                      type="button"
                      onClick={() => handleFaqSend(question)}
                      className="max-w-full rounded-xl border border-[#8b5e3c]/25 bg-[#fffaf2]/80 px-3 py-2 text-left text-xs leading-5 text-[#5d4637] transition hover:border-[#8b5e3c]/60 hover:bg-[#fffaf2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b5e3c]/50"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </section>

        <section className="sticky bottom-0 shrink-0 pb-[calc(12px+env(safe-area-inset-bottom))] pt-2 sm:pb-[22px] sm:pt-3">
          <div
            className="rounded-2xl border border-[#d9c9b0] p-3 shadow-[0_10px_24px_rgba(59,42,31,0.12)] backdrop-blur-sm focus-within:border-[#8b5e3c]/60 focus-within:shadow-[0_0_0_1px_rgba(139,94,60,.25),0_12px_30px_rgba(59,42,31,.12)]"
            style={{ backgroundColor: "rgba(255, 250, 242, 0.96)" }}
          >
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
                className="max-h-[120px] min-h-[42px] flex-1 resize-none overflow-y-auto bg-transparent px-2 py-2 text-sm leading-6 text-[#3b2a1f] outline-none placeholder:text-[#7a6350] focus-visible:ring-0"
              />
              <button
                onClick={() => (isTyping ? handleStop() : handleSend())}
                className="mb-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#8b5e3c] text-[#1b1404] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b5e3c]/50 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!isTyping && inputValue.trim().length === 0}
                aria-label={isTyping ? "Stop" : "Send"}
              >
                {isTyping ? (
                  <Square size={14} fill="currentColor" />
                ) : (
                  <Send size={14} />
                )}
              </button>
            </div>
            <div className="mt-2 px-2 text-[11px] text-[#7a6350]">{t.hint}</div>
          </div>
        </section>
      </main>
    </div>
  );
}
