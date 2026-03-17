// REDESIGNED
import { useState, useEffect, useRef, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import type { inferRouterOutputs } from "@trpc/server";

import { Markdown } from "@/components/Markdown";
import { trpc } from "@/lib/trpc";
import type { AppRouter } from "@/lib/server/routers";
import {
  getInstantAnswer,
  QUICK_PROMPTS,
} from "@/lib/server/services/instantAnswers";
import {
  getCatalogIntentAction,
  OFFICIAL_CATALOG_URL,
} from "@/lib/server/services/catalogIntent";
import { findLibraryKnowledgeTopic } from "@/lib/server/services/libraryKnowledge";
import { RefreshCw } from "lucide-react";

type RouterOutput = inferRouterOutputs<AppRouter>;
type DbMessage = RouterOutput["conversations"]["getMessages"][number];
type DisplayMessage = DbMessage | UIMessage;
type LocalConversation = {
  id: number;
  title: string;
  updatedAt: Date | string;
};

const CHAT_TITLE_MAX_LENGTH = 50;
const SEND_DEBOUNCE_MS = 350;
const GUEST_HISTORY_STORAGE_KEY = "hdak-guest-history-v1";
const GUEST_HISTORY_STORAGE_PREFIX = "hdak-guest-history-v1:";
const GUEST_ID_STORAGE_KEY = "hdak-guest-id";

type Language = "en" | "uk";

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
    retry: "Retry",
    actionFindCatalog: "Find in Catalog",
    actionWriteLetter: "Write to Librarian",
    actionShare: "Share",
    interfaceLang: "Interface language",
    officialResources: "Official library resources",
    historyLabel: "Conversations",
    hint: "Enter — send · Shift+Enter — new line",
    langCode: "ENG",
    quickAnswer: "Quick answer",
    badgeQuick: "Quick answer",
    badgeOfficialRule: "Official rule",
    badgeGenerated: "Generated from reference data",
    sourcesLabel: "Sources",
    viewSource: "View source",
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
    retry: "Повторити",
    actionFindCatalog: "Знайти в каталозі",
    actionWriteLetter: "Написати листа",
    actionShare: "Поділитися",
    interfaceLang: "Мова інтерфейсу",
    officialResources: "Офіційні ресурси бібліотеки",
    historyLabel: "Розмови",
    hint: "Enter — надіслати · Shift+Enter — новий рядок",
    langCode: "УКР",
    quickAnswer: "Швидка відповідь",
    badgeQuick: "Швидка відповідь",
    badgeOfficialRule: "Офіційне правило",
    badgeGenerated: "Згенеровано на основі довідкових даних",
    sourcesLabel: "Джерела",
    viewSource: "Переглянути джерело",
  },
};

function createGuestId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
}

function getGuestHistoryKey(guestId: string) {
  return `${GUEST_HISTORY_STORAGE_PREFIX}${guestId}`;
}

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

function createLocalUiMessage(
  role: "user" | "assistant",
  text: string
): UIMessage {
  const randomId =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return {
    id: randomId,
    role,
    parts: [{ type: "text", text }],
  };
}

export const RESOURCES = [
  {
    group: 1,
    ico: "🗂️",
    name: "Електронний каталог",
    sub: "https://lib-hdak.in.ua/e-catalog.html",
    url: "https://lib-hdak.in.ua/e-catalog.html",
    vpn: false,
  },
  {
    group: 1,
    ico: "🗺️",
    name: "Карта сайту",
    sub: "https://lib-hdak.in.ua/site-map.html",
    url: "https://lib-hdak.in.ua/site-map.html",
    vpn: false,
  },
  {
    group: 1,
    ico: "🔎",
    name: "Пошук наукової інформації",
    sub: "https://lib-hdak.in.ua/search-scientific-info.html",
    url: "https://lib-hdak.in.ua/search-scientific-info.html",
    vpn: false,
  },
  {
    ico: "🔗",
    name: "Корисні посилання",
    sub: "https://lib-hdak.in.ua/helpful-links.html",
    url: "https://lib-hdak.in.ua/helpful-links.html",
    vpn: false,
  },
  {
    group: 1,
    ico: "🏠",
    name: "Сайт бібліотеки",
    sub: "https://lib-hdak.in.ua/",
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
  const [conversations, setConversations] = useState<LocalConversation[]>([]);
  const [guestConversations, setGuestConversations] = useState<
    LocalConversation[]
  >([]);
  const [guestMessagesByConversation, setGuestMessagesByConversation] =
    useState<Record<number, UIMessage[]>>({});
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
  const guestConversationIdRef = useRef(Date.now() * 1000);
  const guestIdRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);
  const lastSendTimeRef = useRef(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const utils = trpc.useUtils();
  const { data: me } = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });
  const isAuthenticated = Boolean(me);

  const conversationIdRef = useRef<number | null>(null);
  const languageRef = useRef<Language>("uk");
  const isAuthenticatedRef = useRef(false);
  conversationIdRef.current = currentConversationId;
  languageRef.current = language;
  isAuthenticatedRef.current = isAuthenticated;

  useEffect(() => {
    const link = document.createElement("link");
    link.href =
      "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const existingGuestId = window.localStorage.getItem(GUEST_ID_STORAGE_KEY);
    const guestId = existingGuestId ?? createGuestId();
    if (!existingGuestId) {
      window.localStorage.setItem(GUEST_ID_STORAGE_KEY, guestId);
    }
    guestIdRef.current = guestId;

    const historyKey = getGuestHistoryKey(guestId);
    const saved =
      window.localStorage.getItem(historyKey) ??
      window.localStorage.getItem(GUEST_HISTORY_STORAGE_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as {
        conversations?: LocalConversation[];
        messagesByConversation?: Record<number, UIMessage[]>;
      };
      const loadedConversations = parsed.conversations ?? [];
      setGuestConversations(loadedConversations);
      setGuestMessagesByConversation(parsed.messagesByConversation ?? {});
      const maxConversationId = loadedConversations.reduce(
        (maxId, conversation) => Math.max(maxId, conversation.id),
        guestConversationIdRef.current
      );
      guestConversationIdRef.current = maxConversationId;
      window.localStorage.setItem(historyKey, saved);
    } catch {
      window.localStorage.removeItem(historyKey);
      window.localStorage.removeItem(GUEST_HISTORY_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !guestIdRef.current) return;
    window.localStorage.setItem(
      getGuestHistoryKey(guestIdRef.current),
      JSON.stringify({
        conversations: guestConversations,
        messagesByConversation: guestMessagesByConversation,
      })
    );
  }, [guestConversations, guestMessagesByConversation]);

  const chatTransport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: () => ({
          model: "openrouter/free",
          language: languageRef.current,
          conversationId: isAuthenticatedRef.current
            ? (conversationIdRef.current ?? undefined)
            : undefined,
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
      if (!isAuthenticated) return;
      const convId = conversationIdRef.current;
      if (convId !== null) {
        utils.conversations.getMessages.invalidate({ conversationId: convId });
      }
    },
  });

  const { data: conversationsData } = trpc.conversations.list.useQuery(
    undefined,
    {
      enabled: isAuthenticated,
      retry: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 5 * 60 * 1000,
    }
  );

  const { data: messagesData } = trpc.conversations.getMessages.useQuery(
    { conversationId: currentConversationId! },
    {
      enabled: isAuthenticated && currentConversationId !== null,
      retry: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
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
    if (isAuthenticated) {
      setConversations(
        (conversationsData ?? []).map(conversation => ({
          id: conversation.id,
          title: conversation.title,
          updatedAt: conversation.updatedAt,
        }))
      );
      return;
    }
    setConversations(guestConversations);
  }, [conversationsData, guestConversations, isAuthenticated]);

  const isStreaming = status === "submitted" || status === "streaming";

  const allMessages: DisplayMessage[] = useMemo(() => {
    if (!isAuthenticated) return streamedMessages;
    const dbMsgs: DisplayMessage[] = messagesData ?? [];
    if (!isStreaming && streamedMessages.length === 0) return dbMsgs;
    return [...dbMsgs, ...streamedMessages];
  }, [isAuthenticated, messagesData, streamedMessages, isStreaming]);

  useEffect(() => {
    if (!isAuthenticated && currentConversationId !== null) {
      setGuestMessagesByConversation(prev => ({
        ...prev,
        [currentConversationId]: streamedMessages,
      }));
      if (streamedMessages.length > 0) {
        setGuestConversations(prev =>
          prev.map(conversation =>
            conversation.id === currentConversationId
              ? { ...conversation, updatedAt: new Date().toISOString() }
              : conversation
          )
        );
      }
    }
  }, [isAuthenticated, currentConversationId, streamedMessages]);

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
    const instantAnswer = getInstantAnswer(textToSend.trim(), language);

    if (!isAuthenticated && instantAnswer) {
      const userMessage = createLocalUiMessage("user", textToSend.trim());
      const assistantMessage = createLocalUiMessage(
        "assistant",
        `**${t.quickAnswer}**\n\n${instantAnswer.answer}`
      );
      const now = new Date().toISOString();

      if (currentConversationId) {
        setStreamedMessages(prev => [...prev, userMessage, assistantMessage]);
        setGuestConversations(prev =>
          prev.map(conversation =>
            conversation.id === currentConversationId
              ? { ...conversation, updatedAt: now }
              : conversation
          )
        );
      } else {
        guestConversationIdRef.current += 1;
        const localConversationId = guestConversationIdRef.current;
        setCurrentConversationId(localConversationId);
        setGuestConversations(prev => [
          {
            id: localConversationId,
            title: textToSend.slice(0, CHAT_TITLE_MAX_LENGTH),
            updatedAt: now,
          },
          ...prev,
        ]);
        setGuestMessagesByConversation(prev => ({
          ...prev,
          [localConversationId]: [userMessage, assistantMessage],
        }));
        setStreamedMessages([userMessage, assistantMessage]);
      }

      setLocalInput("");
      return;
    }

    if (currentConversationId) {
      setLocalInput("");
      void sendMessage({ text: textToSend });
    } else if (isAuthenticated) {
      pendingPromptRef.current = textToSend;
      createConversationMutation.mutate({
        title: textToSend.slice(0, CHAT_TITLE_MAX_LENGTH),
        language,
      });
    } else {
      guestConversationIdRef.current += 1;
      const localConversationId = guestConversationIdRef.current;
      const now = new Date().toISOString();
      setCurrentConversationId(localConversationId);
      setGuestConversations(prev => [
        {
          id: localConversationId,
          title: textToSend.slice(0, CHAT_TITLE_MAX_LENGTH),
          updatedAt: now,
        },
        ...prev,
      ]);
      setGuestMessagesByConversation(prev => ({
        ...prev,
        [localConversationId]: [],
      }));
      setStreamedMessages([]);
      setLocalInput("");
      void sendMessage({ text: textToSend });
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
    if (isAuthenticated) {
      setStreamedMessages([]);
    } else {
      setStreamedMessages(guestMessagesByConversation[conversationId] ?? []);
    }
    setSendError(null);
    setOpenDropdown(null);
  };

  const handleDeleteConversation = (
    e: React.MouseEvent,
    conversationId: number
  ) => {
    e.stopPropagation();
    if (isAuthenticated) {
      deleteConversationMutation.mutate({ id: conversationId });
      return;
    }
    setGuestConversations(prev =>
      prev.filter(conversation => conversation.id !== conversationId)
    );
    setGuestMessagesByConversation(prev => {
      const next = { ...prev };
      delete next[conversationId];
      return next;
    });
    if (currentConversationId === conversationId) {
      setCurrentConversationId(null);
      setStreamedMessages([]);
    }
  };

  const toggleDropdown = (name: "hist" | "res" | "lang") => {
    setOpenDropdown(prev => (prev === name ? null : name));
  };

  const t = translations[language];

  const chips = useMemo(
    () =>
      QUICK_PROMPTS[language].slice(0, 4).map((text, index) => ({
        emoji: ["⚡", "📚", "📘", "📞"][index] ?? "💬",
        text,
      })),
    [language]
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
          background: #eef3fb;
          color: #1f2a44;
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
        .hdak-dd-scroll::-webkit-scrollbar-thumb { background: rgba(73,95,151,0.2); border-radius: 3px; }
        .hdak-msg-scroll::-webkit-scrollbar { width: 3px; }
        .hdak-msg-scroll::-webkit-scrollbar-thumb { background: rgba(73,95,151,0.2); border-radius: 3px; }
        .hdak-textarea { resize: none; background: transparent; border: none; outline: none; color: #1f2a44; font-family: 'DM Sans', system-ui, sans-serif; font-size: 14px; line-height: 1.62; min-height: 22px; max-height: 100px; width: 100%; }
        .hdak-textarea::placeholder { color: #6f81a8; opacity: 1; }
        .hdak-bubble a { color: #2a5aba; text-underline-offset: 3px; font-weight: 500; }
        .hdak-bubble strong { color: #1f2a44; font-weight: 600; }
        .hdak-bubble code { background: #edf2fc; padding: 1px 5px; border-radius: 4px; font-size: 12.5px; }
        .hdak-bubble ul { padding-left: 20px; margin-top: 6px; }
        .hdak-bubble li { margin-bottom: 5px; }
        .hdak-bubble p { margin-bottom: 9px; line-height: 1.72; }
        .hdak-chip:hover { border-color: #3767cc; color: #1f2a44; background: #eef4ff; transform: translateY(-1px); }
        .hdak-res-row:hover { background: #eef4ff; }
        .hdak-hist-row:hover { background: #eef4ff; }
        .hdak-lang-row:hover { background: #eef4ff; color: #1f2a44; }
        .hdak-tb-btn:hover, .hdak-tb-btn.active { border-color: rgba(73,95,151,0.38); color: #1f2a44; background: #eef4ff; }
        .hdak-send:hover:not(:disabled) { background: #2a5aba; transform: scale(1.04); box-shadow: 0 6px 14px rgba(42,90,186,.28); }
        .hdak-send:disabled { background: #dbe4f6; color: #6f81a8; cursor: default; transform: none; box-shadow: none; }
        .hdak-input-row:focus-within { border-color: rgba(42,90,186,.45); box-shadow: 0 0 0 4px rgba(42,90,186,.1); }
        .hdak-action-btn { height: 30px; padding: 0 12px; background: #f4f7ff; border: 1px solid rgba(73,95,151,0.25); border-radius: 8px; color: #2a5aba; font-size: 12px; cursor: pointer; font-family: 'DM Sans', system-ui, sans-serif; transition: all 0.15s; display: inline-flex; align-items: center; gap: 4px; }
        .hdak-action-btn:hover { background: #e9f0ff; border-color: rgba(42,90,186,.42); color: #204690; }
        .hdak-action-btn--catalog { background: #e3eeff; border-color: rgba(42,90,186,.5); color: #1f4a9a; font-weight: 600; }
        .hdak-action-btn--catalog:hover { background: #d7e6ff; border-color: rgba(32,70,144,.58); }
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
            borderBottom: "1px solid rgba(73,95,151,0.2)",
            background: "#ffffff",
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
                border: "1px solid rgba(73,95,151,0.2)",
                borderRadius: 7,
                color: "#6f81a8",
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
                  background: "#ffffff",
                  border: "1px solid rgba(73,95,151,0.2)",
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
                    color: "#6f81a8",
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
                    background: "#eef4ff",
                    border: "1px solid rgba(73,95,151,0.2)",
                    borderRadius: 8,
                    color: "#3767cc",
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
                      color: "#6f81a8",
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
                            ? "2px solid #3767cc"
                            : "2px solid transparent",
                        background:
                          currentConversationId === conv.id
                            ? "#eef4ff"
                            : "transparent",
                      }}
                    >
                      <span
                        style={{
                          flex: 1,
                          fontSize: 13,
                          color: "#1f2a44",
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
                          color: "#6f81a8",
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
                          color: "#6f81a8",
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
                          (e.currentTarget.style.color = "#6f81a8")
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
                background: "#eef4ff",
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
                color: "#1f2a44",
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
                  border: "1px solid rgba(73,95,151,0.2)",
                  borderRadius: 7,
                  color: "#6f81a8",
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
                    background: "#ffffff",
                    border: "1px solid rgba(73,95,151,0.2)",
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
                      color: "#6f81a8",
                      padding: "5px 9px 9px",
                    }}
                  >
                    {t.officialResources}
                  </div>
                  {RESOURCES.map(res => (
                    <a
                      key={`${res.name}-${res.url}`}
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
                            color: "#1f2a44",
                            fontWeight: 500,
                            lineHeight: 1.3,
                          }}
                        >
                          {res.name}
                          {res.vpn && (
                            <span
                              style={{
                                fontSize: 10,
                                color: "#3767cc",
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
                            color: "#6f81a8",
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
                  border: "1px solid rgba(73,95,151,0.2)",
                  borderRadius: 7,
                  color: "#6f81a8",
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
                    background: "#ffffff",
                    border: "1px solid rgba(73,95,151,0.2)",
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
                      color: "#6f81a8",
                      padding: "5px 9px 9px",
                    }}
                  >
                    {t.interfaceLang}
                  </div>
                  {(["uk", "en"] as Language[]).map(lang => (
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
                        color: language === lang ? "#3767cc" : "#6f81a8",
                        transition: "background 0.15s, color 0.15s",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      {lang === "uk" ? "🇺🇦 Українська" : "🇬🇧 English"}
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
                  background: "#eef4ff",
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
                  color: "#1f2a44",
                  marginBottom: 10,
                }}
              >
                {t.overviewGreeting}
              </h1>
              <p
                style={{
                  fontSize: 13,
                  color: "#5d7199",
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
                    background: "rgba(73,95,151,0.2)",
                  }}
                />
                <span style={{ fontSize: 12, color: "#3767cc", opacity: 0.5 }}>
                  ✦
                </span>
                <div
                  style={{
                    flex: 1,
                    height: 1,
                    background: "rgba(73,95,151,0.2)",
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
                      background: "#ffffff",
                      border: "1px solid rgba(73,95,151,0.2)",
                      borderRadius: 22,
                      fontSize: 12,
                      color: "#5d7199",
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
                const previousUserMessage = !isUser
                  ? [...allMessages]
                      .slice(0, idx)
                      .reverse()
                      .find(prevMessage => prevMessage.role === "user")
                  : null;
                const catalogAction =
                  isLastAssistant && previousUserMessage
                    ? getCatalogIntentAction(
                        getMessageText(previousUserMessage),
                        language
                      )
                    : null;
                const instantAnswerMeta =
                  !isUser && previousUserMessage
                    ? getInstantAnswer(
                        getMessageText(previousUserMessage),
                        language
                      )
                    : null;
                const knowledgeTopic =
                  !isUser && previousUserMessage
                    ? findLibraryKnowledgeTopic(
                        getMessageText(previousUserMessage)
                      )
                    : null;
                const sourceBadge = isUser
                  ? null
                  : instantAnswerMeta?.sourceBadge === "official-rule"
                    ? t.badgeOfficialRule
                    : instantAnswerMeta
                      ? t.badgeQuick
                      : knowledgeTopic
                        ? t.badgeGenerated
                        : null;
                const sourceLinks = isUser
                  ? []
                  : (instantAnswerMeta?.links ??
                    knowledgeTopic?.sourceUrls ??
                    []);
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
                        border: "1px solid rgba(73,95,151,0.2)",
                        background: isUser ? "#f4f8ff" : "#eef4ff",
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
                      {!isUser && sourceBadge && (
                        <span
                          style={{
                            alignSelf: "flex-start",
                            fontSize: 11,
                            color: "#2a5aba",
                            background: "#eef4ff",
                            border: "1px solid rgba(73,95,151,0.24)",
                            borderRadius: 999,
                            padding: "2px 8px",
                            lineHeight: 1.4,
                          }}
                        >
                          {sourceBadge}
                        </span>
                      )}
                      <div
                        className="hdak-bubble"
                        style={{
                          padding: "11px 15px",
                          borderRadius: 13,
                          border: isUser
                            ? "1px solid rgba(73,95,151,0.24)"
                            : "1px solid rgba(73,95,151,0.2)",
                          fontSize: 14,
                          lineHeight: 1.7,
                          background: isUser ? "#f4f8ff" : "#ffffff",
                          borderTopRightRadius: isUser ? 3 : 13,
                          borderTopLeftRadius: isUser ? 13 : 3,
                          color: "#1f2a44",
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
                      {!isUser && sourceLinks.length > 0 && (
                        <div
                          style={{
                            fontSize: 11,
                            color: "#5d7199",
                            paddingLeft: 2,
                            display: "flex",
                            flexDirection: "column",
                            gap: 3,
                          }}
                        >
                          <span style={{ fontWeight: 500 }}>
                            {t.sourcesLabel}:
                          </span>
                          {sourceLinks.map(link => (
                            <a
                              key={link}
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                color: "#2a5aba",
                                textDecoration: "none",
                              }}
                            >
                              {t.viewSource}
                            </a>
                          ))}
                        </div>
                      )}

                      {/* Quick actions under last assistant message */}
                      {isLastAssistant && (
                        <div
                          style={{ display: "flex", flexWrap: "wrap", gap: 6 }}
                        >
                          <a
                            href={catalogAction?.url ?? OFFICIAL_CATALOG_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <button
                              className={`hdak-action-btn${catalogAction ? " hdak-action-btn--catalog" : ""}`}
                            >
                              📖{" "}
                              {catalogAction?.buttonLabel ??
                                t.actionFindCatalog}
                            </button>
                          </a>
                          <a
                            href="mailto:library@hdak.edu.ua"
                            rel="noopener noreferrer"
                          >
                            <button className="hdak-action-btn">
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
                            className="hdak-action-btn"
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
                      border: "1px solid rgba(73,95,151,0.2)",
                      background: "#eef4ff",
                    }}
                  >
                    📚
                  </div>
                  <div
                    style={{
                      padding: "11px 15px",
                      borderRadius: 13,
                      borderTopLeftRadius: 3,
                      border: "1px solid rgba(73,95,151,0.2)",
                      background: "#ffffff",
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
                            background: "#3767cc",
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
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                marginBottom: 10,
              }}
            >
              {chips.map(chip => (
                <button
                  key={`inline-chip-${chip.text}`}
                  className="hdak-chip"
                  onClick={() => handleQuickStart(chip.text)}
                  style={{
                    padding: "7px 12px",
                    background: "#f8fbff",
                    border: "1px solid rgba(73,95,151,0.2)",
                    borderRadius: 18,
                    fontSize: 12,
                    color: "#5d7199",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    fontFamily: "'DM Sans', system-ui, sans-serif",
                  }}
                >
                  {chip.emoji} {chip.text}
                </button>
              ))}
            </div>
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
                    {t.retry}
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
                background: "#ffffff",
                border: "1px solid rgba(73,95,151,0.2)",
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
                    isStreaming || !localInput.trim() ? "#dbe4f6" : "#3767cc",
                  border: "none",
                  borderRadius: 9,
                  cursor:
                    isStreaming || !localInput.trim() ? "default" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color:
                    isStreaming || !localInput.trim() ? "#6f81a8" : "#ffffff",
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
                color: "#6f81a8",
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
