// REDESIGNED
import { useState, useEffect, useRef, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import type { inferRouterOutputs } from "@trpc/server";

import { Markdown } from "@/components/Markdown";
import { trpc } from "@/lib/trpc";
import type { AppRouter } from "@/lib/server/routers";
import { RefreshCw } from "lucide-react";

type RouterOutput = inferRouterOutputs<AppRouter>;
type Conversation = RouterOutput["conversations"]["list"][number];
type DbMessage = RouterOutput["conversations"]["getMessages"][number];
type DisplayMessage = DbMessage | UIMessage;

const CHAT_TITLE_MAX_LENGTH = 50;
const SEND_DEBOUNCE_MS = 350;

type Language = "en" | "uk" | "ru";

const translations: Record<Language, Record<string, string>> = {
  en: {
    title: "HDAK Library Assistant",
    subtitle: "Your AI-powered library guide",
    newChat: "New Chat",
    language: "Language",
    logout: "Logout",
    login: "Login",
    sendMessage: "Send message",
    typeMessage: "Type your question here...",
    loading: "Loading...",
    error: "Error",
    noConversations: "No conversations yet.",
    startChat: "Start Chat",
    conversations: "Conversations",
    selectLanguage: "Select Language",
    english: "English",
    ukrainian: "Українська",
    russian: "Русский",
    overviewGreeting: "How can I help?",
    overviewDesc:
      "Find books in the catalog, learn about databases, navigate the HDAK library website.",
    examplesTitle: "Try asking:",
    ex1: "How do I register as a library reader?",
    ex2: "Does the library have access to Scopus?",
    ex3: "Books by Taras Shevchenko",
    ex4: "What is the HDAK repository?",
    ex5: "Where can I find the institutional repository?",
    deleteConversation: "Delete",
    sendFailed: "Failed to send. Please try again.",
    streamError: "Streaming failed. Please try again.",
    streamErrorTooLarge: "Message is too long (max 10,000 characters).",
    actionFindCatalog: "Find in Catalog",
    actionWriteLetter: "Write to Librarian",
    actionShare: "Share",
    interfaceLang: "Interface language",
    officialResources: "Official library resources",
    historyLabel: "Conversations",
    hint: "Enter — send · Shift+Enter — new line",
    langCode: "ENG",
  },
  uk: {
    title: "Помічник бібліотеки ХДАК",
    subtitle: "Ваш AI-помічник бібліотеки ХДАК",
    newChat: "Новий чат",
    language: "Мова",
    logout: "Вихід",
    login: "Вхід",
    sendMessage: "Надіслати",
    typeMessage: "Введіть своє запитання...",
    loading: "Завантаження...",
    error: "Помилка",
    noConversations: "Немає розмов.",
    startChat: "Почати чат",
    conversations: "Розмови",
    selectLanguage: "Виберіть мову",
    english: "English",
    ukrainian: "Українська",
    russian: "Русский",
    overviewGreeting: "Чим можу допомогти?",
    overviewDesc:
      "Знайду книги в каталозі, розповім про бази даних, допоможу орієнтуватися на сайті бібліотеки ХДАК.",
    examplesTitle: "Спробуйте запитати:",
    ex1: "Як записатися до бібліотеки?",
    ex2: "Чи є доступ до Scopus?",
    ex3: "Книги Тараса Шевченка",
    ex4: "Що таке репозитарій ХДАК?",
    ex5: "Де знайти інституційний репозитарій?",
    deleteConversation: "Видалити",
    sendFailed: "Помилка надсилання. Спробуйте ще раз.",
    streamError: "Помилка стрімінгу. Спробуйте ще раз.",
    streamErrorTooLarge:
      "Повідомлення занадто довге (максимум 10 000 символів).",
    actionFindCatalog: "Знайти в каталозі",
    actionWriteLetter: "Написати листа",
    actionShare: "Поділитися",
    interfaceLang: "Мова інтерфейсу",
    officialResources: "Офіційні ресурси бібліотеки",
    historyLabel: "Розмови",
    hint: "Enter — надіслати · Shift+Enter — новий рядок",
    langCode: "УКР",
  },
  ru: {
    title: "Помощник библиотеки ХДАК",
    subtitle: "Ваш AI-помощник библиотеки ХДАК",
    newChat: "Новый чат",
    language: "Язык",
    logout: "Выход",
    login: "Вход",
    sendMessage: "Отправить",
    typeMessage: "Введите свой вопрос...",
    loading: "Загрузка...",
    error: "Ошибка",
    noConversations: "Нет разговоров.",
    startChat: "Начать чат",
    conversations: "Разговоры",
    selectLanguage: "Выберите язык",
    english: "English",
    ukrainian: "Українська",
    russian: "Русский",
    overviewGreeting: "Чем могу помочь?",
    overviewDesc:
      "Найду книги в каталоге, расскажу о базах данных, помогу ориентироваться на сайте библиотеки ХДАК.",
    examplesTitle: "Попробуйте спросить:",
    ex1: "Как записаться в библиотеку?",
    ex2: "Есть ли доступ к Scopus?",
    ex3: "Книги Тараса Шевченко",
    ex4: "Что такое репозиторий ХДАК?",
    ex5: "Где найти институциональный репозиторий?",
    deleteConversation: "Удалить",
    sendFailed: "Ошибка отправки. Попробуйте ещё раз.",
    streamError: "Ошибка стриминга. Попробуйте ещё раз.",
    streamErrorTooLarge:
      "Сообщение слишком длинное (максимум 10 000 символов).",
    actionFindCatalog: "Найти в каталоге",
    actionWriteLetter: "Написать письмо",
    actionShare: "Поделиться",
    interfaceLang: "Язык интерфейса",
    officialResources: "Официальные ресурсы библиотеки",
    historyLabel: "Разговоры",
    hint: "Enter — отправить · Shift+Enter — новая строка",
    langCode: "РУС",
  },
};

function getMessageText(msg: DisplayMessage): string {
  if ("content" in msg && typeof msg.content === "string") return msg.content;
  if ("parts" in msg && Array.isArray(msg.parts)) {
    return msg.parts
      .filter(
        (p): p is { type: "text"; text: string } =>
          p !== null &&
          typeof p === "object" &&
          (p as { type?: string }).type === "text"
      )
      .map(p => p.text)
      .join("");
  }
  return "";
}

const RESOURCES = [
  {
    group: 1,
    ico: "🗂️",
    name: "Електронний каталог",
    sub: "Пошук книг, авторів, тем",
    url: "https://lib-hdak.in.ua/e-catalog.html",
    vpn: false,
  },
  {
    group: 1,
    ico: "🏛️",
    name: "Репозитарій ХДАК",
    sub: "Наукові праці академії",
    url: "https://repository.ac.kharkov.ua/home",
    vpn: false,
  },
  {
    group: 1,
    ico: "🎭",
    name: "Культура України",
    sub: "Електронна бібліотека",
    url: "http://elib.nplu.org/",
    vpn: false,
  },
  {
    group: 2,
    ico: "🔬",
    name: "Scopus",
    sub: "Реферативна база Elsevier",
    url: "https://www.scopus.com/",
    vpn: true,
  },
  {
    group: 2,
    ico: "🔭",
    name: "Web of Science",
    sub: "Наукові цитування Clarivate",
    url: "https://www.webofscience.com/",
    vpn: true,
  },
  {
    group: 2,
    ico: "📰",
    name: "ScienceDirect",
    sub: "Журнали та книги Elsevier",
    url: "https://www.sciencedirect.com/",
    vpn: true,
  },
  {
    group: 2,
    ico: "🔗",
    name: "Springer Link",
    sub: "Видання Springer Nature",
    url: "https://link.springer.com/",
    vpn: true,
  },
  {
    group: 2,
    ico: "🌍",
    name: "Research 4 Life",
    sub: "Міжнародний доступ для освіти",
    url: "https://login.research4life.org/",
    vpn: true,
  },
  {
    group: 3,
    ico: "📖",
    name: "DOAJ",
    sub: "Відкритий доступ до журналів",
    url: "https://lib-hdak.in.ua/catalog-doaj.html",
    vpn: false,
  },
  {
    group: 3,
    ico: "📜",
    name: "УкрІНТЕІ",
    sub: "Автореферати дисертацій",
    url: "http://nrat.ukrintei.ua/",
    vpn: false,
  },
  {
    group: 3,
    ico: "🏠",
    name: "Сайт бібліотеки",
    sub: "lib-hdak.in.ua",
    url: "https://lib-hdak.in.ua/",
    vpn: false,
  },
];

function formatTime(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000) {
    return d.toLocaleTimeString("uk-UA", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  if (diff < 172800000) return "Вчора";
  return d.toLocaleDateString("uk-UA", { day: "numeric", month: "short" });
}

export default function Home() {
  const [language, setLanguage] = useState<Language>("uk");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<
    number | null
  >(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [localInput, setLocalInput] = useState("");
  const [openDropdown, setOpenDropdown] = useState<
    "hist" | "res" | "lang" | null
  >(null);
  const userHasDeselected = useRef(false);
  const pendingPromptRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);
  const lastSendTimeRef = useRef(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const utils = trpc.useUtils();

  const conversationIdRef = useRef<number | null>(null);
  const languageRef = useRef<Language>("uk");
  conversationIdRef.current = currentConversationId;
  languageRef.current = language;

  useEffect(() => {
    const link = document.createElement("link");
    link.href =
      "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }, []);

  const chatTransport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: () => ({
          language: languageRef.current,
          conversationId: conversationIdRef.current,
        }),
        prepareSendMessagesRequest: ({ messages, body }) => {
          const lastUser = [...messages].reverse().find(m => m.role === "user");
          const lastUserText = lastUser ? getMessageText(lastUser) : "";
          return {
            body: {
              ...body,
              messages: lastUserText
                ? [{ role: "user", content: lastUserText }]
                : [],
            },
          };
        },
      }),
    []
  );

  const {
    messages: streamedMessages,
    sendMessage,
    status,
    error: streamError,
    setMessages: setStreamedMessages,
    regenerate,
  } = useChat({
    transport: chatTransport,
    onFinish: () => {
      const convId = conversationIdRef.current;
      if (convId !== null) {
        utils.conversations.getMessages.invalidate({ conversationId: convId });
      }
    },
  });

  const { data: conversationsData } = trpc.conversations.list.useQuery(
    undefined,
    {
      staleTime: 5 * 60 * 1000,
    }
  );

  const { data: messagesData } = trpc.conversations.getMessages.useQuery(
    { conversationId: currentConversationId! },
    {
      enabled: currentConversationId !== null,
      staleTime: 30_000,
    }
  );

  const createConversationMutation = trpc.conversations.create.useMutation({
    onSuccess: data => {
      setCurrentConversationId(data.id);
      conversationIdRef.current = data.id;
      setStreamedMessages([]);
      setLocalInput("");
      utils.conversations.list.invalidate();
      const pendingPrompt = pendingPromptRef.current;
      pendingPromptRef.current = null;
      if (pendingPrompt) void sendMessage({ text: pendingPrompt });
    },
    onError: () => {
      const restored = pendingPromptRef.current ?? "";
      pendingPromptRef.current = null;
      setLocalInput(restored);
      setSendError(t.sendFailed);
    },
  });

  const deleteConversationMutation = trpc.conversations.delete.useMutation({
    onSuccess: () => {
      userHasDeselected.current = true;
      setCurrentConversationId(null);
      setStreamedMessages([]);
      utils.conversations.list.invalidate();
    },
  });

  useEffect(() => {
    if (conversationsData) setConversations(conversationsData);
  }, [conversationsData]);

  const isStreaming = status === "submitted" || status === "streaming";

  const allMessages: DisplayMessage[] = useMemo(() => {
    const dbMsgs: DisplayMessage[] = messagesData ?? [];
    if (!isStreaming && streamedMessages.length === 0) return dbMsgs;
    return [...dbMsgs, ...streamedMessages];
  }, [messagesData, streamedMessages, isStreaming]);

  useEffect(() => {
    if (status === "ready" && streamedMessages.length > 0 && messagesData) {
      const lastStream = streamedMessages[streamedMessages.length - 1];
      const lastStreamText = getMessageText(lastStream);
      const lastDb = messagesData[messagesData.length - 1];
      if (lastDb?.content === lastStreamText) setStreamedMessages([]);
    }
  }, [status, messagesData, streamedMessages, setStreamedMessages]);

  useEffect(() => {
    const count = allMessages.length;
    if (count > prevMessageCountRef.current) {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMessageCountRef.current = count;
  }, [allMessages]);

  const handleSendMessage = (messageText?: string) => {
    const textToSend = messageText ?? localInput;
    if (!textToSend.trim() || isStreaming) return;
    setSendError(null);
    if (currentConversationId) {
      setLocalInput("");
      void sendMessage({ text: textToSend });
    } else {
      pendingPromptRef.current = textToSend;
      createConversationMutation.mutate({
        title: textToSend.slice(0, CHAT_TITLE_MAX_LENGTH),
        language,
      });
    }
  };

  const handleQuickStart = (prompt: string) => {
    setOpenDropdown(null);
    handleSendMessage(prompt);
  };

  const handleNewChat = () => {
    userHasDeselected.current = true;
    setCurrentConversationId(null);
    setStreamedMessages([]);
    setLocalInput("");
    setSendError(null);
    setOpenDropdown(null);
  };

  const handleSelectConversation = (conversationId: number) => {
    userHasDeselected.current = false;
    setCurrentConversationId(conversationId);
    setStreamedMessages([]);
    setSendError(null);
    setOpenDropdown(null);
  };

  const handleDeleteConversation = (
    e: React.MouseEvent,
    conversationId: number
  ) => {
    e.stopPropagation();
    deleteConversationMutation.mutate({ id: conversationId });
  };

  const toggleDropdown = (name: "hist" | "res" | "lang") => {
    setOpenDropdown(prev => (prev === name ? null : name));
  };

  const t = translations[language];

  const chips = useMemo(
    () => [
      { emoji: "📋", text: t.ex1 },
      { emoji: "🔬", text: t.ex2 },
      { emoji: "📚", text: t.ex3 },
      { emoji: "🏛️", text: t.ex4 },
    ],
    [t]
  );

  const showEmpty =
    !currentConversationId &&
    !userHasDeselected.current &&
    allMessages.length === 0;

  const adjustTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 100) + "px";
  };

  const langLabels: Record<Language, string> = {
    uk: "УКР",
    ru: "РУС",
    en: "ENG",
  };

  return (
    <>
      <style>{`
        @keyframes breathe {
          0%,100% { box-shadow: 0 0 32px rgba(200,168,75,0.22); }
          50%      { box-shadow: 0 0 64px rgba(200,168,75,0.38); }
        }
        @keyframes msgIn {
          from { opacity:0; transform:translateY(8px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes dotPulse {
          0%,100% { transform:scale(.75); opacity:.3; }
          50%      { transform:scale(1.2); opacity:.9; }
        }
        @keyframes ddIn {
          from { opacity:0; transform:translateY(-8px) scale(0.98); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(14px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .hdak-body {
          font-family: 'DM Sans', system-ui, sans-serif;
          background: #0b0f18;
          color: #ede3d0;
          height: 100vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          font-size: 14px;
          line-height: 1.5;
          position: relative;
        }
        .hdak-body::before {
          content: '';
          position: fixed; inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='f'%3E%3CfeTurbulence baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23f)' opacity='0.035'/%3E%3C/svg%3E");
          pointer-events: none; z-index: 0;
        }
        .hdak-serif { font-family: 'Playfair Display', Georgia, serif; }
        .hdak-dd-scroll::-webkit-scrollbar { width: 3px; }
        .hdak-dd-scroll::-webkit-scrollbar-thumb { background: rgba(180,148,80,0.14); border-radius: 3px; }
        .hdak-msg-scroll::-webkit-scrollbar { width: 3px; }
        .hdak-msg-scroll::-webkit-scrollbar-thumb { background: rgba(180,148,80,0.14); border-radius: 3px; }
        .hdak-textarea { resize: none; background: transparent; border: none; outline: none; color: #ede3d0; font-family: 'DM Sans', system-ui, sans-serif; font-size: 14px; line-height: 1.55; min-height: 22px; max-height: 100px; width: 100%; }
        .hdak-textarea::placeholder { color: #566070; }
        .hdak-bubble a { color: #c8a84b; text-underline-offset: 3px; }
        .hdak-bubble strong { color: #f2e8d5; font-weight: 500; }
        .hdak-bubble code { background: rgba(255,255,255,0.06); padding: 1px 5px; border-radius: 4px; font-size: 12.5px; }
        .hdak-bubble ul { padding-left: 18px; margin-top: 4px; }
        .hdak-bubble li { margin-bottom: 3px; }
        .hdak-bubble p { margin-bottom: 6px; }
        .hdak-chip:hover { border-color: #c8a84b; color: #ede3d0; background: rgba(200,168,75,0.10); transform: translateY(-1px); }
        .hdak-res-row:hover { background: rgba(200,168,75,0.10); }
        .hdak-hist-row:hover { background: rgba(200,168,75,0.10); }
        .hdak-lang-row:hover { background: rgba(200,168,75,0.10); color: #ede3d0; }
        .hdak-tb-btn:hover, .hdak-tb-btn.active { border-color: rgba(180,148,80,0.35); color: #ede3d0; background: rgba(200,168,75,0.10); }
        .hdak-send:hover:not(:disabled) { background: #d9b85a; transform: scale(1.07); box-shadow: 0 4px 14px rgba(200,168,75,.4); }
        .hdak-send:disabled { background: #1a2236; color: #566070; cursor: default; transform: none; box-shadow: none; }
        .hdak-input-row:focus-within { border-color: rgba(200,168,75,.38); box-shadow: 0 0 0 4px rgba(200,168,75,.06); }
        @media (max-width: 480px) { .tb-label { display: none; } }
      `}</style>

      <div className="hdak-body">
        {/* Overlay to close dropdowns */}
        {openDropdown && (
          <div
            style={{ position: "fixed", inset: 0, zIndex: 100 }}
            onClick={() => setOpenDropdown(null)}
          />
        )}

        {/* ── TOPBAR ── */}
        <header
          style={{
            position: "relative",
            zIndex: 110,
            height: 52,
            display: "flex",
            alignItems: "center",
            padding: "0 20px",
            gap: 10,
            borderBottom: "1px solid rgba(180,148,80,0.14)",
            background: "#131929",
            flexShrink: 0,
          }}
        >
          {/* History button */}
          <div style={{ position: "relative" }}>
            <button
              className={`hdak-tb-btn${openDropdown === "hist" ? " active" : ""}`}
              onClick={() => toggleDropdown("hist")}
              style={{
                height: 30,
                padding: "0 11px",
                background: "transparent",
                border: "1px solid rgba(180,148,80,0.14)",
                borderRadius: 7,
                color: "#566070",
                fontFamily: "'DM Sans', system-ui, sans-serif",
                fontSize: 12,
                fontWeight: 400,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
                transition: "all 0.18s",
                whiteSpace: "nowrap",
              }}
            >
              <svg
                width="13"
                height="13"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
                style={{ opacity: 0.55 }}
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span className="tb-label">Історія</span>
            </button>

            {openDropdown === "hist" && (
              <div
                style={{
                  position: "absolute",
                  top: 38,
                  left: 0,
                  background: "#131929",
                  border: "1px solid rgba(180,148,80,0.14)",
                  borderRadius: 12,
                  padding: 6,
                  zIndex: 200,
                  boxShadow:
                    "0 16px 48px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.03)",
                  minWidth: 240,
                  animation: "ddIn 0.15s cubic-bezier(.25,.46,.45,.94) both",
                  maxHeight: 400,
                  overflowY: "auto",
                }}
                className="hdak-dd-scroll"
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 500,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "#566070",
                    padding: "5px 9px 9px",
                  }}
                >
                  {t.historyLabel}
                </div>
                <button
                  onClick={handleNewChat}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    marginBottom: 5,
                    background: "rgba(200,168,75,0.10)",
                    border: "1px solid rgba(180,148,80,0.14)",
                    borderRadius: 8,
                    color: "#c8a84b",
                    fontFamily: "'DM Sans', system-ui, sans-serif",
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    transition: "background 0.18s",
                  }}
                >
                  <svg
                    width="12"
                    height="12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  {t.newChat}
                </button>
                {conversations.length === 0 ? (
                  <div
                    style={{
                      padding: "8px 10px",
                      fontSize: 12,
                      color: "#566070",
                    }}
                  >
                    {t.noConversations}
                  </div>
                ) : (
                  conversations.map(conv => (
                    <div
                      key={conv.id}
                      className="hdak-hist-row"
                      onClick={() => handleSelectConversation(conv.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 10px",
                        borderRadius: 8,
                        cursor: "pointer",
                        transition: "background 0.15s",
                        borderLeft:
                          currentConversationId === conv.id
                            ? "2px solid #c8a84b"
                            : "2px solid transparent",
                        background:
                          currentConversationId === conv.id
                            ? "rgba(200,168,75,0.10)"
                            : "transparent",
                      }}
                    >
                      <span
                        style={{
                          flex: 1,
                          fontSize: 13,
                          color: "#ede3d0",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {conv.title}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: "#566070",
                          flexShrink: 0,
                        }}
                      >
                        {formatTime(conv.updatedAt)}
                      </span>
                      <button
                        onClick={e => handleDeleteConversation(e, conv.id)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#566070",
                          cursor: "pointer",
                          fontSize: 12,
                          padding: "2px 3px",
                          opacity: 0.7,
                          transition: "color 0.15s",
                        }}
                        onMouseEnter={e =>
                          (e.currentTarget.style.color = "#e05555")
                        }
                        onMouseLeave={e =>
                          (e.currentTarget.style.color = "#566070")
                        }
                        title={t.deleteConversation}
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Center logo */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              alignItems: "center",
              gap: 9,
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                background: "rgba(200,168,75,0.10)",
                border: "1px solid rgba(180,148,80,0.35)",
                borderRadius: 7,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
              }}
            >
              📚
            </div>
            <span
              className="hdak-serif"
              style={{
                fontSize: 15,
                color: "#ede3d0",
                letterSpacing: "0.01em",
              }}
            >
              Бібліотека ХДАК
            </span>
          </div>

          {/* Right buttons */}
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            {/* Resources */}
            <div style={{ position: "relative" }}>
              <button
                className={`hdak-tb-btn${openDropdown === "res" ? " active" : ""}`}
                onClick={() => toggleDropdown("res")}
                style={{
                  height: 30,
                  padding: "0 11px",
                  background: "transparent",
                  border: "1px solid rgba(180,148,80,0.14)",
                  borderRadius: 7,
                  color: "#566070",
                  fontFamily: "'DM Sans', system-ui, sans-serif",
                  fontSize: 12,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  transition: "all 0.18s",
                  whiteSpace: "nowrap",
                }}
              >
                <svg
                  width="13"
                  height="13"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  style={{ opacity: 0.55 }}
                >
                  <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
                </svg>
                <span className="tb-label">Ресурси</span>
              </button>

              {openDropdown === "res" && (
                <div
                  style={{
                    position: "absolute",
                    top: 38,
                    right: 0,
                    background: "#131929",
                    border: "1px solid rgba(180,148,80,0.14)",
                    borderRadius: 12,
                    padding: 6,
                    zIndex: 200,
                    boxShadow:
                      "0 16px 48px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.03)",
                    minWidth: 268,
                    maxHeight: 440,
                    overflowY: "auto",
                    animation: "ddIn 0.15s cubic-bezier(.25,.46,.45,.94) both",
                  }}
                  className="hdak-dd-scroll"
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 500,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "#566070",
                      padding: "5px 9px 9px",
                    }}
                  >
                    {t.officialResources}
                  </div>
                  {[1, 2, 3].map(group => (
                    <div key={group}>
                      {group > 1 && (
                        <div
                          style={{
                            height: 1,
                            background: "rgba(180,148,80,0.14)",
                            margin: "5px 0",
                          }}
                        />
                      )}
                      {RESOURCES.filter(r => r.group === group).map(res => (
                        <a
                          key={res.url}
                          href={res.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hdak-res-row"
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 10,
                            padding: "8px 10px",
                            borderRadius: 8,
                            textDecoration: "none",
                            transition: "background 0.15s",
                            cursor: "pointer",
                          }}
                        >
                          <span
                            style={{
                              fontSize: 16,
                              width: 22,
                              textAlign: "center",
                              flexShrink: 0,
                              paddingTop: 1,
                            }}
                          >
                            {res.ico}
                          </span>
                          <div>
                            <div
                              style={{
                                fontSize: 12,
                                color: "#ede3d0",
                                fontWeight: 500,
                                lineHeight: 1.3,
                              }}
                            >
                              {res.name}
                              {res.vpn && (
                                <span
                                  style={{
                                    fontSize: 10,
                                    color: "#c8a84b",
                                    opacity: 0.75,
                                    marginLeft: 4,
                                  }}
                                >
                                  🔒 VPN
                                </span>
                              )}
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                color: "#566070",
                                lineHeight: 1.3,
                                marginTop: 1,
                              }}
                            >
                              {res.sub}
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Language */}
            <div style={{ position: "relative" }}>
              <button
                className={`hdak-tb-btn${openDropdown === "lang" ? " active" : ""}`}
                onClick={() => toggleDropdown("lang")}
                style={{
                  height: 30,
                  padding: "0 11px",
                  background: "transparent",
                  border: "1px solid rgba(180,148,80,0.14)",
                  borderRadius: 7,
                  color: "#566070",
                  fontFamily: "'DM Sans', system-ui, sans-serif",
                  fontSize: 12,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  transition: "all 0.18s",
                  whiteSpace: "nowrap",
                }}
              >
                🌐 <span className="tb-label">{langLabels[language]}</span>
              </button>

              {openDropdown === "lang" && (
                <div
                  style={{
                    position: "absolute",
                    top: 38,
                    right: 0,
                    background: "#131929",
                    border: "1px solid rgba(180,148,80,0.14)",
                    borderRadius: 12,
                    padding: 6,
                    zIndex: 200,
                    boxShadow:
                      "0 16px 48px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.03)",
                    minWidth: 160,
                    animation: "ddIn 0.15s cubic-bezier(.25,.46,.45,.94) both",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 500,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "#566070",
                      padding: "5px 9px 9px",
                    }}
                  >
                    {t.interfaceLang}
                  </div>
                  {(["uk", "ru", "en"] as Language[]).map(lang => (
                    <div
                      key={lang}
                      className="hdak-lang-row"
                      onClick={() => {
                        setLanguage(lang);
                        setOpenDropdown(null);
                      }}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 8,
                        cursor: "pointer",
                        fontSize: 13,
                        color: language === lang ? "#c8a84b" : "#566070",
                        transition: "background 0.15s, color 0.15s",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      {lang === "uk"
                        ? "🇺🇦 Українська"
                        : lang === "ru"
                          ? "🇷🇺 Русский"
                          : "🇬🇧 English"}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── MAIN ── */}
        <main
          style={{
            flex: 1,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            maxWidth: 740,
            width: "100%",
            margin: "0 auto",
            padding: "0 24px",
            position: "relative",
            zIndex: 1,
          }}
        >
          {showEmpty ? (
            /* Empty state */
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                animation: "fadeUp 0.55s cubic-bezier(.25,.46,.45,.94) both",
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  background: "rgba(200,168,75,0.10)",
                  border: "1px solid rgba(180,148,80,0.35)",
                  borderRadius: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 30,
                  marginBottom: 22,
                  animation: "breathe 4s ease-in-out infinite",
                }}
              >
                📖
              </div>
              <h1
                className="hdak-serif"
                style={{
                  fontSize: 26,
                  fontWeight: 600,
                  color: "#ede3d0",
                  marginBottom: 10,
                }}
              >
                {t.overviewGreeting}
              </h1>
              <p
                style={{
                  fontSize: 13,
                  color: "#a8997f",
                  maxWidth: 320,
                  lineHeight: 1.65,
                  marginBottom: 30,
                }}
              >
                {t.overviewDesc}
              </p>

              {/* Decorative divider */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  maxWidth: 420,
                  marginBottom: 22,
                }}
              >
                <div
                  style={{
                    flex: 1,
                    height: 1,
                    background: "rgba(180,148,80,0.14)",
                  }}
                />
                <span style={{ fontSize: 12, color: "#c8a84b", opacity: 0.5 }}>
                  ✦
                </span>
                <div
                  style={{
                    flex: 1,
                    height: 1,
                    background: "rgba(180,148,80,0.14)",
                  }}
                />
              </div>

              {/* Chips */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  justifyContent: "center",
                  maxWidth: 480,
                }}
              >
                {chips.map((chip, i) => (
                  <button
                    key={i}
                    className="hdak-chip"
                    onClick={() => handleQuickStart(chip.text)}
                    style={{
                      padding: "8px 16px",
                      background: "#131929",
                      border: "1px solid rgba(180,148,80,0.14)",
                      borderRadius: 22,
                      fontSize: 12,
                      color: "#a8997f",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      fontFamily: "'DM Sans', system-ui, sans-serif",
                    }}
                  >
                    {chip.emoji} {chip.text}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Active chat */
            <div
              className="hdak-msg-scroll"
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "24px 0 10px",
                display: "flex",
                flexDirection: "column",
                gap: 14,
                scrollBehavior: "smooth",
              }}
            >
              {allMessages.map((msg, idx) => {
                const isUser = msg.role === "user";
                const isLastAssistant =
                  msg.role === "assistant" &&
                  idx === allMessages.length - 1 &&
                  !isStreaming;
                return (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      gap: 10,
                      flexDirection: isUser ? "row-reverse" : "row",
                      animation:
                        "msgIn 0.28s cubic-bezier(.25,.46,.45,.94) both",
                    }}
                  >
                    {/* Avatar */}
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 8,
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 14,
                        marginTop: 2,
                        border: "1px solid rgba(180,148,80,0.14)",
                        background: isUser
                          ? "#1c1505"
                          : "rgba(200,168,75,0.10)",
                      }}
                    >
                      {isUser ? "👤" : "📚"}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                        maxWidth: 540,
                      }}
                    >
                      {/* Bubble */}
                      <div
                        className="hdak-bubble"
                        style={{
                          padding: "11px 15px",
                          borderRadius: 13,
                          border: isUser
                            ? "1px solid rgba(200,168,75,0.18)"
                            : "1px solid rgba(180,148,80,0.14)",
                          fontSize: 14,
                          lineHeight: 1.7,
                          background: isUser ? "#1c1505" : "#131929",
                          borderTopRightRadius: isUser ? 3 : 13,
                          borderTopLeftRadius: isUser ? 13 : 3,
                          color: "#ede3d0",
                        }}
                      >
                        {isUser ? (
                          <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>
                            {getMessageText(msg)}
                          </p>
                        ) : (
                          <div style={{ fontSize: 14 }}>
                            <Markdown>{getMessageText(msg)}</Markdown>
                          </div>
                        )}
                      </div>

                      {/* Quick actions under last assistant message */}
                      {isLastAssistant && (
                        <div
                          style={{ display: "flex", flexWrap: "wrap", gap: 6 }}
                        >
                          <a
                            href="https://lib-hdak.in.ua/e-catalog.html"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <button
                              style={{
                                height: 26,
                                padding: "0 10px",
                                background: "transparent",
                                border: "1px solid rgba(180,148,80,0.14)",
                                borderRadius: 6,
                                color: "#c8a84b",
                                fontSize: 11,
                                cursor: "pointer",
                                fontFamily: "'DM Sans', system-ui, sans-serif",
                                transition: "background 0.15s",
                              }}
                            >
                              📖 {t.actionFindCatalog}
                            </button>
                          </a>
                          <a
                            href="mailto:library@hdak.edu.ua"
                            rel="noopener noreferrer"
                          >
                            <button
                              style={{
                                height: 26,
                                padding: "0 10px",
                                background: "transparent",
                                border: "1px solid rgba(180,148,80,0.14)",
                                borderRadius: 6,
                                color: "#c8a84b",
                                fontSize: 11,
                                cursor: "pointer",
                                fontFamily: "'DM Sans', system-ui, sans-serif",
                                transition: "background 0.15s",
                              }}
                            >
                              ✉️ {t.actionWriteLetter}
                            </button>
                          </a>
                          <button
                            onClick={() => {
                              const text = getMessageText(msg);
                              if (navigator.share) {
                                navigator
                                  .share({
                                    title: "HDAK Library",
                                    text,
                                    url: window.location.href,
                                  })
                                  .catch(() =>
                                    navigator.clipboard
                                      .writeText(text)
                                      .catch(() => {})
                                  );
                              } else {
                                navigator.clipboard
                                  .writeText(text)
                                  .catch(() => {});
                              }
                            }}
                            style={{
                              height: 26,
                              padding: "0 10px",
                              background: "transparent",
                              border: "1px solid rgba(180,148,80,0.14)",
                              borderRadius: 6,
                              color: "#c8a84b",
                              fontSize: 11,
                              cursor: "pointer",
                              fontFamily: "'DM Sans', system-ui, sans-serif",
                              transition: "background 0.15s",
                            }}
                          >
                            🔗 {t.actionShare}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Typing indicator */}
              {status === "submitted" && (
                <div style={{ display: "flex", gap: 10 }}>
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 14,
                      marginTop: 2,
                      border: "1px solid rgba(180,148,80,0.14)",
                      background: "rgba(200,168,75,0.10)",
                    }}
                  >
                    📚
                  </div>
                  <div
                    style={{
                      padding: "11px 15px",
                      borderRadius: 13,
                      borderTopLeftRadius: 3,
                      border: "1px solid rgba(180,148,80,0.14)",
                      background: "#131929",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: 5,
                        alignItems: "center",
                        padding: "5px 2px",
                      }}
                    >
                      {[0, 0.2, 0.4].map((delay, i) => (
                        <div
                          key={i}
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            background: "#c8a84b",
                            opacity: 0.4,
                            animation: `dotPulse 1.3s ease-in-out ${delay}s infinite`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div ref={scrollRef} />
            </div>
          )}

          {/* ── INPUT BAR ── */}
          <div style={{ padding: "12px 0 22px", flexShrink: 0 }}>
            {/* Error banner */}
            {(sendError || streamError) && (
              <div
                style={{
                  marginBottom: 10,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 12,
                  color: "#e05555",
                  background: "rgba(224,85,85,0.08)",
                  border: "1px solid rgba(224,85,85,0.2)",
                  borderRadius: 8,
                  padding: "8px 12px",
                }}
              >
                <span style={{ flex: 1 }}>
                  {streamError
                    ? streamError.message?.includes("413") ||
                      streamError.message?.includes("too large")
                      ? t.streamErrorTooLarge
                      : t.streamError
                    : sendError}
                </span>
                {streamError && (
                  <button
                    onClick={() => void regenerate()}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#e05555",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 11,
                      padding: "2px 6px",
                    }}
                  >
                    <RefreshCw size={12} />
                    {language === "uk"
                      ? "Повторити"
                      : language === "ru"
                        ? "Повторить"
                        : "Retry"}
                  </button>
                )}
              </div>
            )}

            <div
              className="hdak-input-row"
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: 8,
                background: "#131929",
                border: "1px solid rgba(180,148,80,0.14)",
                borderRadius: 14,
                padding: "10px 12px",
                transition: "border-color 0.2s, box-shadow 0.2s",
              }}
            >
              <textarea
                ref={textareaRef}
                className="hdak-textarea"
                rows={1}
                value={localInput}
                onChange={e => {
                  setLocalInput(e.target.value);
                  adjustTextarea();
                }}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    const now = Date.now();
                    if (now - lastSendTimeRef.current < SEND_DEBOUNCE_MS)
                      return;
                    lastSendTimeRef.current = now;
                    handleSendMessage();
                    if (textareaRef.current) {
                      textareaRef.current.style.height = "auto";
                    }
                  }
                }}
                placeholder={t.typeMessage}
                disabled={isStreaming}
              />
              <button
                className="hdak-send"
                onClick={() => {
                  handleSendMessage();
                  if (textareaRef.current)
                    textareaRef.current.style.height = "auto";
                }}
                disabled={isStreaming || !localInput.trim()}
                style={{
                  width: 34,
                  height: 34,
                  flexShrink: 0,
                  background:
                    isStreaming || !localInput.trim() ? "#1a2236" : "#c8a84b",
                  border: "none",
                  borderRadius: 9,
                  cursor:
                    isStreaming || !localInput.trim() ? "default" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color:
                    isStreaming || !localInput.trim() ? "#566070" : "#0b0f18",
                  transition:
                    "background 0.18s, transform 0.15s, box-shadow 0.18s",
                }}
              >
                <svg
                  width="15"
                  height="15"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  viewBox="0 0 24 24"
                >
                  <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" />
                </svg>
              </button>
            </div>
            <div
              style={{
                fontSize: 11,
                color: "#566070",
                textAlign: "center",
                marginTop: 7,
              }}
            >
              {t.hint}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
