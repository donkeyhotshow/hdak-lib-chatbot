import { useState, useEffect, useRef, useMemo, type ReactNode } from "react";
import { useChat, type UIMessage } from "@ai-sdk/react";
import type { inferRouterOutputs } from "@trpc/server";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Markdown } from "@/components/Markdown";
import { DocumentCard, type ResourceType } from "@/components/DocumentCard";
import { trpc } from "@/lib/trpc";
import type { AppRouter } from "../../../server/routers";
import { getLoginUrl } from "@/const";
import { Bot, BookOpen, Database, Search, Loader2, Send, Plus, Globe, LogOut, ExternalLink, Trash2, AlertCircle } from "lucide-react";

type RouterOutput = inferRouterOutputs<AppRouter>;
type Conversation = RouterOutput["conversations"]["list"][number];

/** Prefix for temporary IDs assigned to optimistic (not-yet-persisted) messages. */
const OPTIMISTIC_PREFIX = "optimistic_";

/** Maximum character length used when deriving a conversation title from a prompt. */
const CHAT_TITLE_MAX_LENGTH = 50;

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
    // Overview panel
    overviewGreeting: "Hello! I'm the HDAK Library AI Assistant.",
    overviewDesc: "Ask me about library resources, how to find a book or author, or how to navigate the library website.",
    feature1Title: "Site Navigation",
    feature1Desc: "Find any page on the library website — catalog, usage rules, contacts, exhibitions, or publications.",
    feature2Title: "Resource Search",
    feature2Desc: "Discover available databases and collections: Scopus, Web of Science, the institutional repository, and more.",
    feature3Title: "Author & Book Lookup",
    feature3Desc: "Ask whether the library has a specific author or book — I'll give you step-by-step catalog instructions.",
    examplesTitle: "Try asking:",
    ex1: "How do I register as a library reader?",
    ex2: "Does the library have access to Scopus?",
    ex3: "Do you have books by Taras Shevchenko?",
    ex4: "What are the library's opening hours?",
    ex5: "Where can I find the institutional repository?",
    libraryWebsite: "Visit the official library website",
    deleteConversation: "Delete conversation",
    // Resource search
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
    // Overview panel
    overviewGreeting: "Вітаю! Я AI-асистент бібліотеки ХДАК.",
    overviewDesc: "Запитайте мене про ресурси бібліотеки, як знайти книгу чи автора, або як орієнтуватися на сайті.",
    feature1Title: "Навігація сайтом",
    feature1Desc: "Знайду будь-яку сторінку сайту бібліотеки — каталог, правила, контакти, виставки, публікації.",
    feature2Title: "Пошук ресурсів",
    feature2Desc: "Розкажу про доступні бази даних та колекції: Scopus, Web of Science, репозитарій та інші.",
    feature3Title: "Пошук автора і книги",
    feature3Desc: "Перевірю, чи є в бібліотеці потрібний автор або книга, і дам покрокову інструкцію для каталогу.",
    examplesTitle: "Спробуйте запитати:",
    ex1: "Як записатися до бібліотеки?",
    ex2: "Чи є у вас доступ до Scopus?",
    ex3: "Чи є книги Тараса Шевченка?",
    ex4: "Який графік роботи бібліотеки?",
    ex5: "Де знайти інституційний репозитарій?",
    libraryWebsite: "Офіційний сайт бібліотеки",
    deleteConversation: "Видалити розмову",
    // Resource search
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
    // Overview panel
    overviewGreeting: "Здравствуйте! Я AI-ассистент библиотеки ХДАК.",
    overviewDesc: "Спросите меня о ресурсах библиотеки, как найти книгу или автора, или как ориентироваться на сайте.",
    feature1Title: "Навигация по сайту",
    feature1Desc: "Найду любую страницу сайта библиотеки — каталог, правила, контакты, выставки, публикации.",
    feature2Title: "Поиск ресурсов",
    feature2Desc: "Расскажу о доступных базах данных и коллекциях: Scopus, Web of Science, репозиторий и другие.",
    feature3Title: "Поиск автора и книги",
    feature3Desc: "Проверю, есть ли в библиотеке нужный автор или книга, и дам пошаговую инструкцию по каталогу.",
    examplesTitle: "Попробуйте спросить:",
    ex1: "Как записаться в библиотеку?",
    ex2: "Есть ли у вас доступ к Scopus?",
    ex3: "Есть ли книги Тараса Шевченко?",
    ex4: "Какой режим работы библиотеки?",
    ex5: "Где найти институциональный репозиторий?",
    libraryWebsite: "Официальный сайт библиотеки",
    deleteConversation: "Удалить разговор",
    // Resource search
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
  },
};

/** Reusable feature card for the overview panel. */
function FeatureCard({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <Card className="p-4 flex flex-col gap-2 border-indigo-100 hover:border-indigo-300 transition-colors">
      <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center">
        {icon}
      </div>
      <p className="font-semibold text-gray-900 text-sm">{title}</p>
      <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
    </Card>
  );
}

/** Extract a displayable string from a message content field (handles useChat parts array). */
function getMessageText(msg: UIMessage | any): string {
  // Handle both UIMessage and database message formats
  if (typeof msg === 'string') return msg;
  if (typeof msg?.content === 'string') return msg.content;
  if (Array.isArray(msg?.content)) {
    return msg.content
      .filter((part: any): part is { type: "text"; text: string } => part?.type === "text")
      .map((part: any) => part.text)
      .join("");
  }
  return "";
}

export default function Home() {
  const { user, isAuthenticated, logout } = useAuth();
  const [language, setLanguage] = useState<Language>("uk");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const userHasDeselected = useRef(false);
  const pendingPromptRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);
  const utils = trpc.useUtils();

  // Local state for input management (useChat doesn't provide this)
  const [localInput, setLocalInput] = useState("");
  const [isLocalLoading, setIsLocalLoading] = useState(false);
  const [optimisticMessages, setOptimisticMessages] = useState<{ id: string; role: "user"; content: string; createdAt: Date }[]>([]);

  const {
    messages: streamMessages,
    setMessages: setStreamMessages,
  } = useChat({
    onFinish: () => {
      if (currentConversationId) {
        utils.conversations.getMessages.invalidate({ conversationId: currentConversationId });
      }
    },
  });

  // Fetch site resources for the resource browser
  const { data: siteResources = [] } = trpc.resources.getSiteResources.useQuery();

  // Resource browser search / filter state
  const [resourceSearch, setResourceSearch] = useState("");
  const [resourceTypeFilter, setResourceTypeFilter] = useState<ResourceType | "all">("all");

  const filteredResources = useMemo(
    () =>
      (siteResources ?? []).filter((r) => {
        const typeMatch = resourceTypeFilter === "all" || r.type === resourceTypeFilter;
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

  // Fetch conversations
  const { data: conversationsData } = trpc.conversations.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // Fetch messages for current conversation
  const { data: messagesData } = trpc.conversations.getMessages.useQuery(
    { conversationId: currentConversationId! },
    { enabled: isAuthenticated && currentConversationId !== null }
  );

  // Create conversation mutation
  const createConversationMutation = trpc.conversations.create.useMutation({
    onSuccess: (data) => {
      setCurrentConversationId(data.id);
      setStreamMessages([]);
      utils.conversations.list.invalidate();
      // If there's a pending prompt, send it directly using the new conversation id
      const pendingPrompt = pendingPromptRef.current;
      pendingPromptRef.current = null;
      if (pendingPrompt) {
        sendMessageMutation.mutate({
          conversationId: data.id,
          content: pendingPrompt,
        });
      }
    },
  });

  // Delete conversation mutation
  const deleteConversationMutation = trpc.conversations.delete.useMutation({
    onSuccess: () => {
      userHasDeselected.current = true;
      setCurrentConversationId(null);
      setStreamMessages([]);
      utils.conversations.list.invalidate();
    },
  });

  // Send message mutation
  const sendMessageMutation = trpc.conversations.sendMessage.useMutation({
    onSuccess: () => {
      setOptimisticMessages((prev) => prev.filter((m) => !m.id.startsWith(OPTIMISTIC_PREFIX)));
      setIsLocalLoading(false);
      setSendError(null);
      utils.conversations.getMessages.invalidate({ conversationId: currentConversationId! });
    },
    onError: (_error, variables) => {
      setIsLocalLoading(false);
      setLocalInput(variables.content);
      setOptimisticMessages((prev) => prev.filter((m) => !m.id.startsWith(OPTIMISTIC_PREFIX)));
      setSendError(t.sendFailed);
    },
  });

  // Update conversations list when data changes
  useEffect(() => {
    if (conversationsData) {
      setConversations(conversationsData);
    }
  }, [conversationsData]);

  // Combine stream messages and database messages
  const allMessages = [
    ...(messagesData || []),
    ...optimisticMessages,
    ...streamMessages,
  ];

  // Auto-scroll to bottom only when the number of messages increases
  useEffect(() => {
    const count = allMessages.length;
    if (count > prevMessageCountRef.current) {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMessageCountRef.current = count;
  }, [allMessages]);

  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || localInput;
    if (!textToSend.trim()) return;

    setSendError(null);
    setIsLocalLoading(true);

    // Show optimistic message immediately so the user sees their text right away
    const optimisticId = `${OPTIMISTIC_PREFIX}${crypto.randomUUID()}`;
    setOptimisticMessages((prev) => [
      ...prev,
      { id: optimisticId, role: "user" as const, content: textToSend, createdAt: new Date() },
    ]);
    setLocalInput("");

    if (currentConversationId) {
      // Send via tRPC for persistence
      sendMessageMutation.mutate({
        conversationId: currentConversationId,
        content: textToSend,
      });
    } else {
      // Create new conversation first, then send from onSuccess
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
    setStreamMessages([]);
    setOptimisticMessages([]);
    setLocalInput("");
  };

  const handleSelectConversation = (conversationId: number) => {
    userHasDeselected.current = false;
    setCurrentConversationId(conversationId);
    setStreamMessages([]);
    setOptimisticMessages([]);
  };

  const handleDeleteConversation = (conversationId: number) => {
    deleteConversationMutation.mutate({ id: conversationId });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8">
          <div className="text-center mb-6">
            <Bot className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
            <p className="text-sm text-gray-600 mt-2">{t.subtitle}</p>
          </div>
          <Button
            className="w-full bg-indigo-600 hover:bg-indigo-700"
            onClick={() => { window.location.href = getLoginUrl(); }}
          >
            {t.login}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <Button onClick={handleNewChat} className="w-full bg-indigo-600 hover:bg-indigo-700 gap-2">
            <Plus className="w-4 h-4" />
            {t.newChat}
          </Button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">
              {t.noConversations}
            </div>
          ) : (
            <div className="p-2">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv.id)}
                  className={`p-3 rounded-lg cursor-pointer mb-2 transition-colors group ${
                    currentConversationId === conv.id
                      ? "bg-indigo-100 text-indigo-900"
                      : "hover:bg-gray-100 text-gray-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate flex-1">{conv.title}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteConversation(conv.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4 text-red-500 hover:text-red-700" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 space-y-3">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-gray-600" />
            <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">{t.english}</SelectItem>
                <SelectItem value="uk">{t.ukrainian}</SelectItem>
                <SelectItem value="ru">{t.russian}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={logout}
            variant="outline"
            className="w-full gap-2"
          >
            <LogOut className="w-4 h-4" />
            {t.logout}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <main className="flex-1 overflow-hidden flex">
          {!currentConversationId && !userHasDeselected.current ? (
            // Overview Panel
            <div className="flex-1 overflow-y-auto p-8">
              <div className="max-w-3xl mx-auto">
                <div className="text-center mb-12">
                  <Bot className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    {t.overviewGreeting}
                  </h2>
                  <p className="text-gray-600">{t.overviewDesc}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
                  <FeatureCard
                    icon={<BookOpen className="w-5 h-5 text-indigo-600" />}
                    title={t.feature1Title}
                    description={t.feature1Desc}
                  />
                  <FeatureCard
                    icon={<Database className="w-5 h-5 text-indigo-600" />}
                    title={t.feature2Title}
                    description={t.feature2Desc}
                  />
                  <FeatureCard
                    icon={<Search className="w-5 h-5 text-indigo-600" />}
                    title={t.feature3Title}
                    description={t.feature3Desc}
                  />
                </div>

                <Card className="p-6 bg-indigo-50 border-indigo-200 mb-8">
                  <h3 className="font-semibold text-gray-900 mb-3">{t.examplesTitle}</h3>
                  <div className="space-y-2">
                    {exampleQuestions.map((example, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleQuickStart(example)}
                        className="block w-full text-left p-2 rounded hover:bg-indigo-100 transition-colors text-sm text-indigo-900"
                      >
                        • {example}
                      </button>
                    ))}
                  </div>
                </Card>

                <div className="text-center">
                  <a
                    href="https://lib-hdak.in.ua/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    {t.libraryWebsite}
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>

                {/* Resource browser */}
                {siteResources.length > 0 && (
                  <div className="mt-10">
                    <h3 className="font-semibold text-gray-900 mb-4">{t.resourcesTitle}</h3>
                    <div className="flex gap-2 mb-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          value={resourceSearch}
                          onChange={(e) => setResourceSearch(e.target.value)}
                          placeholder={t.searchPlaceholder}
                          className="pl-9"
                        />
                      </div>
                      <Select
                        value={resourceTypeFilter}
                        onValueChange={(v) => setResourceTypeFilter(v as ResourceType | "all")}
                      >
                        <SelectTrigger className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t.filterAll}</SelectItem>
                          <SelectItem value="catalog">{t.filterCatalog}</SelectItem>
                          <SelectItem value="database">{t.filterDatabase}</SelectItem>
                          <SelectItem value="electronic_library">{t.filterElectronic}</SelectItem>
                          <SelectItem value="repository">{t.filterRepository}</SelectItem>
                          <SelectItem value="other">{t.filterOther}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {filteredResources.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">{t.noResults}</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {filteredResources.map((r, idx) => (
                          <DocumentCard
                            key={r.url ?? idx}
                            name={r.name}
                            description={r.description}
                            type={r.type as ResourceType}
                            url={r.url}
                            accessConditions={r.accessConditions}
                            language={language}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Chat Messages */}
              <ScrollArea className="flex-1 w-full">
                <div className="max-w-3xl mx-auto p-4 space-y-4">
                  {allMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-xl px-4 py-2 rounded-lg ${
                          msg.role === "user"
                            ? "bg-indigo-600 text-white rounded-br-none"
                            : "bg-gray-200 text-gray-900 rounded-bl-none"
                        }`}
                      >
                        {msg.role === "user" ? (
                          <p className="text-sm whitespace-pre-wrap">{getMessageText(msg)}</p>
                        ) : (
                          <div className="text-sm prose prose-sm max-w-none prose-a:text-indigo-700 prose-a:underline">
                            <Markdown>{getMessageText(msg)}</Markdown>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={scrollRef} />
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="border-t border-gray-200 bg-white p-4">
                {sendError && (
                  <div className="max-w-3xl mx-auto mb-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{sendError}</span>
                  </div>
                )}
                <div className="max-w-3xl mx-auto flex gap-3">
                  <Input
                    value={localInput}
                    onChange={(e) => setLocalInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder={t.typeMessage}
                    disabled={isLocalLoading}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => handleSendMessage()}
                    disabled={isLocalLoading || !localInput.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    {isLocalLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
