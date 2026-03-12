// REDESIGNED
import { useState, useEffect, useRef, useMemo, type ReactNode } from "react";
import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import type { inferRouterOutputs } from "@trpc/server";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Markdown } from "@/components/Markdown";
import { DocumentCard, type ResourceType } from "@/components/DocumentCard";
import { trpc } from "@/lib/trpc";
import type { AppRouter } from "../../../server/routers";
import { getLoginUrl } from "@/const";
import {
  Bot,
  BookOpen,
  Database,
  Search,
  Loader2,
  Send,
  Plus,
  Globe,
  LogOut,
  ExternalLink,
  Trash2,
  AlertCircle,
  RefreshCw,
  BookMarked,
  Mail,
  Share2,
  Menu,
} from "lucide-react";

type RouterOutput = inferRouterOutputs<AppRouter>;
type Conversation = RouterOutput["conversations"]["list"][number];
type DbMessage = RouterOutput["conversations"]["getMessages"][number];
/** Union of persisted DB messages and live streaming UIMessages. */
type DisplayMessage = DbMessage | UIMessage;

/** Maximum character length used when deriving a conversation title from a prompt. */
const CHAT_TITLE_MAX_LENGTH = 50;

/**
 * Minimum milliseconds between successive Enter-key sends to prevent accidental
 * double-sends from rapid repeated key presses.
 */
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
    noConversations: "No conversations yet. Start a new chat!",
    startChat: "Start Chat",
    conversations: "Conversations",
    selectLanguage: "Select Language",
    english: "English",
    ukrainian: "Українська",
    russian: "Русский",
    overviewGreeting: "Hello! I'm the HDAK Library AI Assistant.",
    overviewDesc:
      "Ask me about library resources, how to find a book or author, or how to navigate the library website.",
    feature1Title: "Site Navigation",
    feature1Desc:
      "Find any page on the library website — catalog, usage rules, contacts, exhibitions, or publications.",
    feature2Title: "Resource Search",
    feature2Desc:
      "Discover available databases and collections: Scopus, Web of Science, the institutional repository, and more.",
    feature3Title: "Author & Book Lookup",
    feature3Desc:
      "Ask whether the library has a specific author or book — I'll give you step-by-step catalog instructions.",
    examplesTitle: "Try asking:",
    ex1: "How do I register as a library reader?",
    ex2: "Does the library have access to Scopus?",
    ex3: "Do you have books by Taras Shevchenko?",
    ex4: "What are the library's opening hours?",
    ex5: "Where can I find the institutional repository?",
    libraryWebsite: "Visit the official library website",
    deleteConversation: "Delete conversation",
    resourcesTitle: "Library Resources",
    searchPlaceholder: "Search resources…",
    filterAll: "All types",
    filterCatalog: "Catalog",
    filterDatabase: "Database",
    filterElectronic: "E-Library",
    filterRepository: "Repository",
    filterOther: "Other",
    noResults: "No resources match your filters.",
    sendFailed: "Failed to send. Please try again.",
    streamError: "Streaming failed. Please try again.",
    streamErrorTooLarge: "Message is too long (max 10,000 characters).",
    actionFindCatalog: "Find in Catalog",
    actionWriteLetter: "Write to Librarian",
    actionShare: "Share",
    corporateAccess: "Corporate Access",
    retry: "Retry",
  },
  uk: {
    title: "Помічник бібліотеки ХДАК",
    subtitle: "Ваш AI-помічник бібліотеки ХДАК",
    newChat: "Новий чат",
    language: "Мова",
    logout: "Вихід",
    login: "Вхід",
    sendMessage: "Надіслати повідомлення",
    typeMessage: "Введіть своє запитання...",
    loading: "Завантаження...",
    error: "Помилка",
    noConversations: "Немає розмов. Почніть новий чат!",
    startChat: "Почати чат",
    conversations: "Розмови",
    selectLanguage: "Виберіть мову",
    english: "English",
    ukrainian: "Українська",
    russian: "Русский",
    overviewGreeting: "Вітаю! Я AI-асистент бібліотеки ХДАК.",
    overviewDesc:
      "Запитайте мене про ресурси бібліотеки, як знайти книгу чи автора, або як орієнтуватися на сайті.",
    feature1Title: "Навігація сайтом",
    feature1Desc:
      "Знайду будь-яку сторінку сайту бібліотеки — каталог, правила, контакти, виставки, публікації.",
    feature2Title: "Пошук ресурсів",
    feature2Desc:
      "Розкажу про доступні бази даних та колекції: Scopus, Web of Science, репозитарій та інші.",
    feature3Title: "Пошук автора і книги",
    feature3Desc:
      "Перевірю, чи є в бібліотеці потрібний автор або книга, і дам покрокову інструкцію для каталогу.",
    examplesTitle: "Спробуйте запитати:",
    ex1: "Як записатися до бібліотеки?",
    ex2: "Чи є у вас доступ до Scopus?",
    ex3: "Чи є книги Тараса Шевченка?",
    ex4: "Який графік роботи бібліотеки?",
    ex5: "Де знайти інституційний репозитарій?",
    libraryWebsite: "Офіційний сайт бібліотеки",
    deleteConversation: "Видалити розмову",
    resourcesTitle: "Ресурси бібліотеки",
    searchPlaceholder: "Пошук ресурсів…",
    filterAll: "Всі типи",
    filterCatalog: "Каталог",
    filterDatabase: "База даних",
    filterElectronic: "Е-бібліотека",
    filterRepository: "Репозитарій",
    filterOther: "Інше",
    noResults: "Ресурсів за вашими фільтрами не знайдено.",
    sendFailed: "Помилка надсилання. Спробуйте ще раз.",
    streamError: "Помилка стрімінгу. Спробуйте ще раз.",
    streamErrorTooLarge:
      "Повідомлення занадто довге (максимум 10 000 символів).",
    actionFindCatalog: "Знайти в каталозі",
    actionWriteLetter: "Написати листа",
    actionShare: "Поділитися",
    corporateAccess: "Корпоративний доступ",
    retry: "Повторити",
  },
  ru: {
    title: "Помощник библиотеки ХДАК",
    subtitle: "Ваш AI-помощник библиотеки ХДАК",
    newChat: "Новый чат",
    language: "Язык",
    logout: "Выход",
    login: "Вход",
    sendMessage: "Отправить сообщение",
    typeMessage: "Введите свой вопрос...",
    loading: "Загрузка...",
    error: "Ошибка",
    noConversations: "Нет разговоров. Начните новый чат!",
    startChat: "Начать чат",
    conversations: "Разговоры",
    selectLanguage: "Выберите язык",
    english: "English",
    ukrainian: "Українська",
    russian: "Русский",
    overviewGreeting: "Здравствуйте! Я AI-ассистент библиотеки ХДАК.",
    overviewDesc:
      "Спросите меня о ресурсах библиотеки, как найти книгу или автора, или как ориентироваться на сайте.",
    feature1Title: "Навигация по сайту",
    feature1Desc:
      "Найду любую страницу сайта библиотеки — каталог, правила, контакты, выставки, публикации.",
    feature2Title: "Поиск ресурсов",
    feature2Desc:
      "Расскажу о доступных базах данных и коллекциях: Scopus, Web of Science, репозиторий и другие.",
    feature3Title: "Поиск автора и книги",
    feature3Desc:
      "Проверю, есть ли в библиотеке нужный автор или книга, и дам пошаговую инструкцию по каталогу.",
    examplesTitle: "Попробуйте спросить:",
    ex1: "Как записаться в библиотеку?",
    ex2: "Есть ли у вас доступ к Scopus?",
    ex3: "Есть ли книги Тараса Шевченко?",
    ex4: "Какой режим работы библиотеки?",
    ex5: "Где найти институциональный репозиторий?",
    libraryWebsite: "Официальный сайт библиотеки",
    deleteConversation: "Удалить разговор",
    resourcesTitle: "Ресурсы библиотеки",
    searchPlaceholder: "Поиск ресурсов…",
    filterAll: "Все типы",
    filterCatalog: "Каталог",
    filterDatabase: "База данных",
    filterElectronic: "Э-библиотека",
    filterRepository: "Репозиторий",
    filterOther: "Прочее",
    noResults: "Ресурсов по вашим фильтрам не найдено.",
    sendFailed: "Ошибка отправки. Попробуйте ещё раз.",
    streamError: "Ошибка стриминга. Попробуйте ещё раз.",
    streamErrorTooLarge:
      "Сообщение слишком длинное (максимум 10 000 символов).",
    actionFindCatalog: "Найти в каталоге",
    actionWriteLetter: "Написать письмо",
    actionShare: "Поделиться",
    corporateAccess: "Корпоративный доступ",
    retry: "Повторить",
  },
};

const LIBRARY_RESOURCES = [
  { icon: "📚", name: "Електронний каталог", url: "https://library-service.com.ua:8443/khkhdak/DocumentSearchForm", vpn: false },
  { icon: "🏛️", name: "Репозитарій ХДАК", url: "https://repository.ac.kharkov.ua/home", vpn: false },
  { icon: "🌐", name: "Культура України", url: "http://elib.nplu.org/", vpn: false },
  { icon: "🔬", name: "Scopus", url: "https://www.scopus.com/", vpn: true },
  { icon: "🔭", name: "Web of Science", url: "https://www.webofscience.com/", vpn: true },
  { icon: "📰", name: "ScienceDirect", url: "https://www.sciencedirect.com/", vpn: true },
  { icon: "🔗", name: "Springer Link", url: "https://link.springer.com/", vpn: true },
  { icon: "🌍", name: "Research 4 Life", url: "https://login.research4life.org/", vpn: true },
  { icon: "📖", name: "DOAJ", url: "https://lib-hdak.in.ua/catalog-doaj.html", vpn: false },
  { icon: "📜", name: "УкрІНТЕІ", url: "http://nrat.ukrintei.ua/", vpn: false },
  { icon: "🏠", name: "Сайт бібліотеки", url: "https://lib-hdak.in.ua/", vpn: false },
];

const KEYFRAMES_CSS = `
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes pulse-dot {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}
`;

/** Extract a displayable string from a DB message or a streaming UIMessage. */
function getMessageText(msg: DisplayMessage): string {
  // DB message format: content is a plain string
  if ("content" in msg && typeof msg.content === "string") return msg.content;
  // UIMessage format (ai SDK v6): text is in the parts array
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

export default function Home() {
  const { user, isAuthenticated, logout } = useAuth();
  const [language, setLanguage] = useState<Language>("uk");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<
    number | null
  >(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [localInput, setLocalInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const userHasDeselected = useRef(false);
  const pendingPromptRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);
  const lastSendTimeRef = useRef(0);
  const utils = trpc.useUtils();

  // Refs that give the transport function access to the latest React state without
  // capturing stale closures (the transport is created only once via useMemo).
  const conversationIdRef = useRef<number | null>(null);
  const languageRef = useRef<Language>("uk");
  conversationIdRef.current = currentConversationId;
  languageRef.current = language;

  // Inject Google Fonts
  useEffect(() => {
    const link = document.createElement("link");
    link.href =
      "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@400;500;600&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  /**
   * Transport for useChat: sends only the latest user message to /api/chat.
   * The server loads persisted history from DB (when conversationId is provided)
   * so the AI always has full context without the client duplicating history.
   */
  const chatTransport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        // body is a function so it is evaluated at request time, picking up
        // the latest language and conversationId from their refs.
        body: () => ({
          language: languageRef.current,
          conversationId: conversationIdRef.current,
        }),
        prepareSendMessagesRequest: ({ messages, body }) => {
          // Extract the text from the last user UIMessage (parts array format).
          const lastUser = [...messages].reverse().find(m => m.role === "user");
          const lastUserText = lastUser ? getMessageText(lastUser) : "";
          return {
            body: {
              ...body,
              // Only send the new user message; the server appends DB history.
              messages: lastUserText
                ? [{ role: "user", content: lastUserText }]
                : [],
            },
          };
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refs are intentionally stable
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

  // Fetch site resources for the resource browser (cached 5 min)
  const { data: siteResources = [] } = trpc.resources.getSiteResources.useQuery(
    undefined,
    {
      staleTime: 5 * 60 * 1000,
    }
  );

  // Resource browser search / filter state
  const [resourceSearch, setResourceSearch] = useState("");
  const [resourceTypeFilter, setResourceTypeFilter] = useState<
    ResourceType | "all"
  >("all");

  const filteredResources = useMemo(
    () =>
      (siteResources ?? []).filter(r => {
        const typeMatch =
          resourceTypeFilter === "all" || r.type === resourceTypeFilter;
        const q = resourceSearch.trim().toLowerCase();
        const textMatch =
          !q ||
          r.name.toLowerCase().includes(q) ||
          (r.description ?? "").toLowerCase().includes(q);
        return typeMatch && textMatch;
      }),
    [siteResources, resourceSearch, resourceTypeFilter]
  );

  const t = translations[language];

  const exampleQuestions = useMemo(
    () => [t.ex1, t.ex2, t.ex3, t.ex4, t.ex5],
    [t]
  );

  // Fetch conversations (cached 5 min; invalidated on create/delete)
  const { data: conversationsData } = trpc.conversations.list.useQuery(
    undefined,
    {
      enabled: isAuthenticated,
      staleTime: 5 * 60 * 1000,
    }
  );

  // Fetch messages for current conversation
  const { data: messagesData } = trpc.conversations.getMessages.useQuery(
    { conversationId: currentConversationId! },
    {
      enabled: isAuthenticated && currentConversationId !== null,
      staleTime: 30_000,
    }
  );

  // Create conversation mutation
  const createConversationMutation = trpc.conversations.create.useMutation({
    onSuccess: data => {
      setCurrentConversationId(data.id);
      // Update the ref immediately so the transport body function picks up the new id
      // before the next sendMessage call (React state update is asynchronous).
      conversationIdRef.current = data.id;
      setStreamedMessages([]);
      setLocalInput(""); // Clear input only after conversation is confirmed
      utils.conversations.list.invalidate();
      const pendingPrompt = pendingPromptRef.current;
      pendingPromptRef.current = null;
      if (pendingPrompt) {
        void sendMessage({ text: pendingPrompt });
      }
    },
    onError: () => {
      // On creation failure: restore pending prompt to input so user can retry
      const restored = pendingPromptRef.current ?? "";
      pendingPromptRef.current = null;
      setLocalInput(restored);
      setSendError(t.sendFailed);
    },
  });

  // Delete conversation mutation
  const deleteConversationMutation = trpc.conversations.delete.useMutation({
    onSuccess: () => {
      userHasDeselected.current = true;
      setCurrentConversationId(null);
      setStreamedMessages([]);
      utils.conversations.list.invalidate();
    },
  });

  // Update conversations list when data changes
  useEffect(() => {
    if (conversationsData) {
      setConversations(conversationsData);
    }
  }, [conversationsData]);

  // Whether streaming/waiting for server response
  const isStreaming = status === "submitted" || status === "streaming";

  // Combined message list for display.
  // • While streaming: show persisted DB messages + live stream messages
  // • When idle:       show persisted DB messages only (avoids duplicates after refresh)
  const allMessages: DisplayMessage[] = useMemo(() => {
    const dbMsgs: DisplayMessage[] = messagesData ?? [];
    if (!isStreaming && streamedMessages.length === 0) return dbMsgs;
    return [...dbMsgs, ...streamedMessages];
  }, [messagesData, streamedMessages, isStreaming]);

  // Once the DB query refreshes after streaming completes, clear the local stream
  // messages to avoid showing duplicates alongside the freshly persisted records.
  useEffect(() => {
    if (status === "ready" && streamedMessages.length > 0 && messagesData) {
      const lastStream = streamedMessages[streamedMessages.length - 1];
      const lastStreamText = getMessageText(lastStream);
      const lastDb = messagesData[messagesData.length - 1];
      if (lastDb?.content === lastStreamText) {
        setStreamedMessages([]);
      }
    }
  }, [status, messagesData, streamedMessages, setStreamedMessages]);

  // Auto-scroll to bottom only when the number of messages increases
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
      setLocalInput(""); // Clear input immediately when conversation exists
      void sendMessage({ text: textToSend });
    } else {
      // Store the prompt and create a new conversation first.
      // localInput is cleared in createConversationMutation.onSuccess.
      pendingPromptRef.current = textToSend;
      createConversationMutation.mutate({
        title: textToSend.slice(0, CHAT_TITLE_MAX_LENGTH),
        language,
      });
    }
  };

  /** Handle a quick-start prompt click from the overview panel. */
  const handleQuickStart = (prompt: string) => handleSendMessage(prompt);

  const handleNewChat = () => {
    userHasDeselected.current = true;
    setCurrentConversationId(null);
    setStreamedMessages([]);
    setLocalInput("");
    setSendError(null);
  };

  const handleSelectConversation = (conversationId: number) => {
    userHasDeselected.current = false;
    setCurrentConversationId(conversationId);
    setStreamedMessages([]);
    setSendError(null);
  };

  const handleDeleteConversation = (conversationId: number) => {
    deleteConversationMutation.mutate({ id: conversationId });
  };

  if (!isAuthenticated) {
    return (
      <div
        style={{ background: "#0D1B2A", fontFamily: "'DM Sans', sans-serif" }}
        className="min-h-screen flex items-center justify-center p-4"
      >
        <style>{KEYFRAMES_CSS}</style>
        <div
          style={{
            background: "#142236",
            border: "1px solid #1E3A5F",
            animation: "fadeInUp 0.5s ease forwards",
          }}
          className="w-full max-w-md p-8 rounded-2xl text-center"
        >
          <svg
            width="72"
            height="54"
            viewBox="0 0 80 60"
            fill="none"
            className="mx-auto mb-6"
            aria-hidden="true"
          >
            <path
              d="M40 10 C40 10 20 8 5 15 L5 50 C20 43 40 45 40 45 C40 45 60 43 75 50 L75 15 C60 8 40 10 40 10Z"
              fill="#C8A84B"
              opacity="0.15"
              stroke="#C8A84B"
              strokeWidth="1.5"
            />
            <path d="M40 10 L40 45" stroke="#C8A84B" strokeWidth="1.5" />
            <path d="M15 18 L35 16" stroke="#C8A84B" strokeWidth="1" opacity="0.6" />
            <path d="M15 24 L35 22" stroke="#C8A84B" strokeWidth="1" opacity="0.6" />
            <path d="M15 30 L35 28" stroke="#C8A84B" strokeWidth="1" opacity="0.6" />
            <path d="M45 16 L65 18" stroke="#C8A84B" strokeWidth="1" opacity="0.6" />
            <path d="M45 22 L65 24" stroke="#C8A84B" strokeWidth="1" opacity="0.6" />
            <path d="M45 28 L65 30" stroke="#C8A84B" strokeWidth="1" opacity="0.6" />
          </svg>
          <h1
            style={{ color: "#F5E6C8", fontFamily: "'Playfair Display', serif" }}
            className="text-2xl font-bold mb-2"
          >
            {t.title}
          </h1>
          <p style={{ color: "#8BA3C1" }} className="text-sm mb-8">
            {t.subtitle}
          </p>
          <button
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
            style={{
              background: "linear-gradient(135deg, #C8A84B, #A08030)",
              color: "#0D1B2A",
            }}
            className="w-full py-3 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            {t.login}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{ background: "#0D1B2A", fontFamily: "'DM Sans', sans-serif" }}
      className="flex h-screen overflow-hidden"
    >
      <style>{KEYFRAMES_CSS}</style>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* LEFT SIDEBAR */}
      <aside
        style={{
          background: "#0D1B2A",
          borderRight: "1px solid #1E3A5F",
          width: "240px",
        }}
        className={`flex-col z-30 ${sidebarOpen ? "flex fixed inset-y-0 left-0" : "hidden md:flex"}`}
      >
        {/* Logo area */}
        <div style={{ borderBottom: "1px solid #1E3A5F" }} className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <svg
              width="28"
              height="22"
              viewBox="0 0 80 60"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M40 8 C40 8 20 6 5 13 L5 48 C20 41 40 43 40 43 C40 43 60 41 75 48 L75 13 C60 6 40 8 40 8Z"
                fill="#C8A84B"
                opacity="0.2"
                stroke="#C8A84B"
                strokeWidth="2"
              />
              <path d="M40 8 L40 43" stroke="#C8A84B" strokeWidth="2" />
            </svg>
            <div>
              <div
                style={{
                  color: "#C8A84B",
                  fontFamily: "'Playfair Display', serif",
                }}
                className="font-bold text-sm"
              >
                ХДАК
              </div>
              <div style={{ color: "#8BA3C1" }} className="text-xs">
                Бібліотека
              </div>
            </div>
          </div>
          {/* New Chat button - outlined gold */}
          <button
            onClick={handleNewChat}
            style={{ border: "1px solid #C8A84B", color: "#C8A84B" }}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg hover:bg-[#C8A84B]/10 transition-colors text-sm font-medium"
            aria-label={t.newChat}
          >
            <Plus className="w-4 h-4" />
            {t.newChat}
          </button>
        </div>

        {/* Conversations list */}
        <div className="flex-1 overflow-y-auto p-2">
          {conversations.length === 0 ? (
            <p
              style={{ color: "#8BA3C1" }}
              className="text-xs text-center p-4"
            >
              {t.noConversations}
            </p>
          ) : (
            conversations.map((conv, idx) => (
              <div
                key={conv.id}
                onClick={() => handleSelectConversation(conv.id)}
                style={{
                  animationDelay: `${idx * 0.05}s`,
                  animation: "fadeInUp 0.3s ease forwards",
                  opacity: 0,
                  background:
                    currentConversationId === conv.id
                      ? "#1E3A5F"
                      : "transparent",
                  color:
                    currentConversationId === conv.id ? "#F5E6C8" : "#8BA3C1",
                }}
                className="group flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-[#1E3A5F]/60 transition-colors mb-1"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs truncate">{conv.title}</p>
                  <p style={{ color: "#4A6480" }} className="text-xs mt-0.5">
                    {new Date(conv.updatedAt).toLocaleDateString(
                      language === "uk"
                        ? "uk-UA"
                        : language === "ru"
                          ? "ru-RU"
                          : "en-US",
                      { month: "short", day: "numeric" }
                    )}
                  </p>
                </div>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    handleDeleteConversation(conv.id);
                  }}
                  style={{ color: "#8BA3C1" }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 hover:text-red-400"
                  aria-label={t.deleteConversation}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Bottom: language switcher + logout */}
        <div
          style={{ borderTop: "1px solid #1E3A5F" }}
          className="p-3 space-y-3"
        >
          {/* Language pill tabs */}
          <div
            style={{ background: "#142236" }}
            className="flex rounded-full p-0.5"
          >
            {(["uk", "ru", "en"] as Language[]).map(lang => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                style={
                  language === lang
                    ? { background: "#C8A84B", color: "#0D1B2A" }
                    : { color: "#8BA3C1" }
                }
                className="flex-1 text-xs py-1 rounded-full transition-all font-medium"
                aria-label={
                  lang === "uk"
                    ? t.ukrainian
                    : lang === "ru"
                      ? t.russian
                      : t.english
                }
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>
          {/* User name + logout */}
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <p style={{ color: "#F5E6C8" }} className="text-xs truncate">
                {user?.name || ""}
              </p>
            </div>
            <button
              onClick={logout}
              style={{ color: "#8BA3C1" }}
              className="hover:text-[#F5E6C8] transition-colors"
              aria-label={t.logout}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* CENTER PANEL */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <div
          style={{
            borderBottom: "1px solid #1E3A5F",
            background: "#0D1B2A",
          }}
          className="md:hidden flex items-center gap-3 px-4 py-3"
        >
          <button
            onClick={() => setSidebarOpen(true)}
            style={{ color: "#C8A84B" }}
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span
            style={{
              color: "#C8A84B",
              fontFamily: "'Playfair Display', serif",
            }}
            className="font-bold"
          >
            ХДАК Бібліотека
          </span>
        </div>

        {/* Message area / empty state */}
        {!currentConversationId && !userHasDeselected.current ? (
          // EMPTY STATE
          <div
            className="flex-1 overflow-y-auto flex flex-col items-center justify-start pt-12 px-4 pb-4"
            style={{ animation: "fadeIn 0.5s ease forwards" }}
          >
            <div className="w-full max-w-[760px]">
              {/* Book illustration */}
              <div className="text-center mb-8">
                <svg
                  width="80"
                  height="60"
                  viewBox="0 0 80 60"
                  fill="none"
                  className="mx-auto mb-6"
                  aria-hidden="true"
                >
                  <path
                    d="M40 10 C40 10 20 8 5 15 L5 50 C20 43 40 45 40 45 C40 45 60 43 75 50 L75 15 C60 8 40 10 40 10Z"
                    fill="#C8A84B"
                    opacity="0.15"
                    stroke="#C8A84B"
                    strokeWidth="1.5"
                  />
                  <path d="M40 10 L40 45" stroke="#C8A84B" strokeWidth="1.5" />
                  <path
                    d="M15 18 L35 16"
                    stroke="#C8A84B"
                    strokeWidth="1"
                    opacity="0.6"
                  />
                  <path
                    d="M15 24 L35 22"
                    stroke="#C8A84B"
                    strokeWidth="1"
                    opacity="0.6"
                  />
                  <path
                    d="M15 30 L35 28"
                    stroke="#C8A84B"
                    strokeWidth="1"
                    opacity="0.6"
                  />
                  <path
                    d="M45 16 L65 18"
                    stroke="#C8A84B"
                    strokeWidth="1"
                    opacity="0.6"
                  />
                  <path
                    d="M45 22 L65 24"
                    stroke="#C8A84B"
                    strokeWidth="1"
                    opacity="0.6"
                  />
                  <path
                    d="M45 28 L65 30"
                    stroke="#C8A84B"
                    strokeWidth="1"
                    opacity="0.6"
                  />
                </svg>
                <h1
                  style={{
                    color: "#F5E6C8",
                    fontFamily: "'Playfair Display', serif",
                  }}
                  className="text-3xl font-bold mb-3"
                >
                  {t.overviewGreeting}
                </h1>
                <p
                  style={{ color: "#8BA3C1" }}
                  className="text-base max-w-lg mx-auto leading-relaxed"
                >
                  {t.overviewDesc}
                </p>
              </div>

              {/* Decorative divider */}
              <div className="flex items-center gap-3 mb-8">
                <div
                  style={{ background: "#1E3A5F" }}
                  className="flex-1 h-px"
                />
                <svg
                  width="24"
                  height="18"
                  viewBox="0 0 24 18"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M12 2 C12 2 6 1 1 4 L1 15 C6 12 12 13 12 13 C12 13 18 12 23 15 L23 4 C18 1 12 2 12 2Z"
                    fill="none"
                    stroke="#C8A84B"
                    strokeWidth="1.2"
                    opacity="0.7"
                  />
                  <path
                    d="M12 2 L12 13"
                    stroke="#C8A84B"
                    strokeWidth="1.2"
                    opacity="0.7"
                  />
                </svg>
                <div
                  style={{ background: "#1E3A5F" }}
                  className="flex-1 h-px"
                />
              </div>

              {/* 4 example chips in 2x2 grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                {[t.ex1, t.ex2, t.ex3, t.ex4].map((example, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickStart(example)}
                    style={{
                      background: "#142236",
                      border: "1px solid #1E3A5F",
                      color: "#F5E6C8",
                      animationDelay: `${0.1 + idx * 0.07}s`,
                      animation: "fadeInUp 0.4s ease forwards",
                      opacity: 0,
                    }}
                    className="text-left p-4 rounded-xl hover:border-[#C8A84B]/50 hover:bg-[#1E3A5F] transition-all text-sm leading-relaxed"
                    aria-label={example}
                  >
                    <span style={{ color: "#C8A84B" }} className="mr-2">
                      ›
                    </span>
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          // ACTIVE CONVERSATION
          <>
            <div className="flex-1 overflow-y-auto px-4 py-6">
              <div className="max-w-[760px] mx-auto space-y-4">
                {allMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    style={{
                      animation: "fadeInUp 0.3s ease forwards",
                      opacity: 0,
                      animationDelay: `${Math.min(idx * 0.05, 0.3)}s`,
                    }}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {msg.role === "assistant" && (
                      <div
                        style={{
                          background: "#C8A84B",
                          color: "#0D1B2A",
                        }}
                        className="w-7 h-7 rounded-full flex items-center justify-center mr-2 flex-shrink-0 mt-1 text-xs font-bold"
                      >
                        A
                      </div>
                    )}
                    <div className="flex flex-col gap-2 max-w-xl">
                      <div
                        style={
                          msg.role === "user"
                            ? {
                                background:
                                  "linear-gradient(135deg, #C8A84B, #A08030)",
                                color: "#0D1B2A",
                              }
                            : {
                                background: "#142236",
                                border: "1px solid #1E3A5F",
                                color: "#F5E6C8",
                              }
                        }
                        className="px-4 py-3 rounded-2xl text-sm leading-relaxed"
                      >
                        {msg.role === "user" ? (
                          <p className="whitespace-pre-wrap font-medium">
                            {getMessageText(msg)}
                          </p>
                        ) : (
                          <div
                            className="prose prose-sm max-w-none"
                            style={
                              {
                                "--tw-prose-body": "#F5E6C8",
                                "--tw-prose-headings": "#F5E6C8",
                                "--tw-prose-links": "#C8A84B",
                                "--tw-prose-bold": "#F5E6C8",
                                "--tw-prose-code": "#C8A84B",
                              } as React.CSSProperties
                            }
                          >
                            <Markdown>{getMessageText(msg)}</Markdown>
                          </div>
                        )}
                      </div>
                      {/* Quick action buttons after last assistant message */}
                      {msg.role === "assistant" &&
                        idx === allMessages.length - 1 &&
                        !isStreaming && (
                          <div className="flex flex-wrap gap-2">
                            <a
                              href="https://lib-hdak.in.ua/e-catalog.html"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <button
                                style={{
                                  border: "1px solid #1E3A5F",
                                  color: "#8BA3C1",
                                }}
                                className="flex items-center gap-1 text-xs px-3 py-1 rounded-full hover:border-[#C8A84B]/50 hover:text-[#C8A84B] transition-colors"
                                aria-label={t.actionFindCatalog}
                              >
                                <BookMarked className="w-3 h-3" />
                                {t.actionFindCatalog}
                              </button>
                            </a>
                            <a
                              href="mailto:library@hdak.edu.ua"
                              rel="noopener noreferrer"
                            >
                              <button
                                style={{
                                  border: "1px solid #1E3A5F",
                                  color: "#8BA3C1",
                                }}
                                className="flex items-center gap-1 text-xs px-3 py-1 rounded-full hover:border-[#C8A84B]/50 hover:text-[#C8A84B] transition-colors"
                                aria-label={t.actionWriteLetter}
                              >
                                <Mail className="w-3 h-3" />
                                {t.actionWriteLetter}
                              </button>
                            </a>
                            <button
                              style={{
                                border: "1px solid #1E3A5F",
                                color: "#8BA3C1",
                              }}
                              className="flex items-center gap-1 text-xs px-3 py-1 rounded-full hover:border-[#C8A84B]/50 hover:text-[#C8A84B] transition-colors"
                              aria-label={t.actionShare}
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
                            >
                              <Share2 className="w-3 h-3" />
                              {t.actionShare}
                            </button>
                          </div>
                        )}
                    </div>
                    {msg.role === "user" && (
                      <div
                        style={{
                          background: "#1E3A5F",
                          color: "#F5E6C8",
                        }}
                        className="w-7 h-7 rounded-full flex items-center justify-center ml-2 flex-shrink-0 mt-1 text-xs font-bold"
                      >
                        {user?.name?.[0]?.toUpperCase() || "U"}
                      </div>
                    )}
                  </div>
                ))}
                {/* Typing indicator */}
                {status === "submitted" && (
                  <div className="flex justify-start">
                    <div
                      style={{
                        background: "#142236",
                        border: "1px solid #1E3A5F",
                      }}
                      className="px-4 py-3 rounded-2xl"
                    >
                      <span className="flex gap-1.5 items-center h-4">
                        {[0, 1, 2].map(i => (
                          <span
                            key={i}
                            style={{
                              background: "#C8A84B",
                              animation: `pulse-dot 1.4s ease-in-out ${i * 0.16}s infinite`,
                            }}
                            className="w-1.5 h-1.5 rounded-full"
                          />
                        ))}
                      </span>
                    </div>
                  </div>
                )}
                <div ref={scrollRef} />
              </div>
            </div>
          </>
        )}

        {/* INPUT BAR - sticky at bottom of center */}
        <div
          style={{
            borderTop: "1px solid #1E3A5F",
            background: "#0D1B2A",
          }}
          className="px-4 py-3"
        >
          {/* Error banner */}
          {(sendError || streamError) && (
            <div
              style={{
                background: "#2D1515",
                border: "1px solid #7F1D1D",
                color: "#FCA5A5",
              }}
              className="max-w-[760px] mx-auto mb-3 flex items-center gap-2 text-sm rounded-lg px-3 py-2"
              role="alert"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">
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
                  style={{ color: "#FCA5A5" }}
                  className="flex items-center gap-1 text-xs hover:text-red-300 transition-colors"
                  aria-label="Retry"
                >
                  <RefreshCw className="w-3 h-3" />
                  {language === "uk"
                    ? "Повторити"
                    : language === "ru"
                      ? "Повторить"
                      : "Retry"}
                </button>
              )}
            </div>
          )}
          <div className="max-w-[760px] mx-auto flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                value={localInput}
                onChange={e => {
                  setLocalInput(e.target.value);
                  // Auto-resize
                  e.target.style.height = "auto";
                  e.target.style.height =
                    Math.min(e.target.scrollHeight, 120) + "px";
                }}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    const now = Date.now();
                    if (now - lastSendTimeRef.current < SEND_DEBOUNCE_MS)
                      return;
                    lastSendTimeRef.current = now;
                    handleSendMessage();
                  }
                }}
                placeholder={t.typeMessage}
                disabled={isStreaming}
                rows={1}
                maxLength={10000}
                style={{
                  background: "#142236",
                  border: "1px solid #1E3A5F",
                  color: "#F5E6C8",
                  resize: "none",
                  minHeight: "44px",
                  maxHeight: "120px",
                }}
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:border-[#C8A84B]/50 transition-colors placeholder:text-[#4A6480] disabled:opacity-50"
                aria-label={t.typeMessage}
              />
              {/* Character counter when > 800 chars */}
              {localInput.length > 800 && (
                <span
                  style={{
                    color: localInput.length > 950 ? "#EF4444" : "#8BA3C1",
                  }}
                  className="absolute bottom-2 right-2 text-xs"
                >
                  {localInput.length}/10000
                </span>
              )}
            </div>
            <button
              onClick={() => handleSendMessage()}
              disabled={isStreaming || !localInput.trim()}
              style={
                !isStreaming && localInput.trim()
                  ? {
                      background:
                        "linear-gradient(135deg, #C8A84B, #A08030)",
                      color: "#0D1B2A",
                    }
                  : {
                      background: "#142236",
                      border: "1px solid #1E3A5F",
                      color: "#4A6480",
                    }
              }
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all disabled:cursor-not-allowed hover:opacity-90"
              aria-label={t.sendMessage}
            >
              {isStreaming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m22 2-7 20-4-9-9-4Z" />
                  <path d="M22 2 11 13" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL - 280px, hidden on mobile */}
      <aside
        style={{
          width: "280px",
          borderLeft: "1px solid #1E3A5F",
          background: "#0D1B2A",
        }}
        className="hidden lg:flex flex-col overflow-y-auto"
      >
        <div
          style={{ borderBottom: "1px solid #1E3A5F" }}
          className="px-4 py-4"
        >
          <h2
            style={{
              color: "#C8A84B",
              fontFamily: "'Playfair Display', serif",
            }}
            className="font-semibold text-sm"
          >
            {t.resourcesTitle}
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {LIBRARY_RESOURCES.map((res, idx) => (
            <a
              key={idx}
              href={res.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: "#142236",
                border: "1px solid #1E3A5F",
                display: "block",
              }}
              className="p-3 rounded-lg hover:border-[#C8A84B]/40 transition-all group"
              aria-label={res.name}
            >
              <div className="flex items-start gap-2">
                <span className="text-base flex-shrink-0">{res.icon}</span>
                <div className="flex-1 min-w-0">
                  <p
                    style={{ color: "#F5E6C8" }}
                    className="text-xs font-medium leading-snug group-hover:text-[#C8A84B] transition-colors"
                  >
                    {res.name}
                  </p>
                  {res.vpn && (
                    <span
                      style={{
                        color: "#8BA3C1",
                        border: "1px solid #1E3A5F",
                      }}
                      className="inline-flex items-center gap-0.5 text-xs mt-1 px-1.5 py-0.5 rounded"
                    >
                      🔒 {t.corporateAccess}
                    </span>
                  )}
                </div>
              </div>
            </a>
          ))}
        </div>
      </aside>
    </div>
  );
}
