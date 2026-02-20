import { useState, useEffect, useRef, type ReactNode } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Markdown } from "@/components/Markdown";
import { DocumentCard, type ResourceType } from "@/components/DocumentCard";
import { trpc } from "@/lib/trpc";
import { Bot, BookOpen, Database, Search, Loader2, Send, Plus, Globe, LogOut, ExternalLink, Trash2, AlertCircle } from "lucide-react";

/** Maximum character length used when deriving a conversation title from a prompt. */
const CHAT_TITLE_MAX_LENGTH = 50;
/** Truncated length (leaves room for the ellipsis character). */
const CHAT_TITLE_TRUNCATED_LENGTH = 47;

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

export default function Home() {
  const { user, isAuthenticated, logout } = useAuth();
  const [language, setLanguage] = useState<Language>("uk");
  const [conversations, setConversations] = useState<any[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  // Resource search / filter state
  const [resourceSearch, setResourceSearch] = useState("");
  const [resourceTypeFilter, setResourceTypeFilter] = useState<ResourceType | "all">("all");

  // Fetch site resources (from hdakResources list via tRPC)
  const { data: siteResources = [] } = trpc.resources.getSiteResources.useQuery();

  const filteredResources = siteResources.filter((r: any) => {
    const typeMatch = resourceTypeFilter === "all" || r.type === resourceTypeFilter;
    const q = resourceSearch.trim().toLowerCase();
    const textMatch =
      !q ||
      r.name.toLowerCase().includes(q) ||
      (r.description ?? "").toLowerCase().includes(q);
    return typeMatch && textMatch;
  });

  const t = translations[language];

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
      setMessages([]);
      utils.conversations.list.invalidate();
      // If there's a pending prompt from a quick-start click, send it now
      if (pendingPrompt) {
        const prompt = pendingPrompt;
        setPendingPrompt(null);
        setIsLoading(true);
        setSendError(null);
        setMessages([{
          id: Date.now(),
          conversationId: data.id,
          role: "user",
          content: prompt,
          createdAt: new Date(),
        }]);
        sendMessageMutation.mutate({ conversationId: data.id, content: prompt });
      }
    },
  });

  // Delete conversation mutation
  const deleteConversationMutation = trpc.conversations.delete.useMutation({
    onSuccess: (_data, variables) => {
      utils.conversations.list.invalidate();
      if (currentConversationId === variables.id) {
        setCurrentConversationId(null);
        setMessages([]);
      }
    },
  });

  // Send message mutation
  const sendMessageMutation = trpc.conversations.sendMessage.useMutation({
    onSuccess: (data) => {
      setMessages((prev) => [...prev, data]);
      setInputMessage("");
      setIsLoading(false);
      setSendError(null);
    },
    onError: () => {
      setIsLoading(false);
      setSendError(
        language === "uk"
          ? "Помилка надсилання повідомлення. Спробуйте ще раз."
          : language === "ru"
          ? "Ошибка отправки сообщения. Попробуйте ещё раз."
          : "Failed to send message. Please try again."
      );
    },
  });

  // Update conversations when data changes
  useEffect(() => {
    if (conversationsData) {
      setConversations(conversationsData);
      if (!currentConversationId && conversationsData.length > 0) {
        setCurrentConversationId(conversationsData[0].id);
      }
    }
  }, [conversationsData, currentConversationId]);

  // Update messages when data changes
  useEffect(() => {
    if (messagesData) {
      setMessages(messagesData);
    }
  }, [messagesData]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleNewChat = () => {
    createConversationMutation.mutate({
      title: `Chat - ${new Date().toLocaleString(language === "uk" ? "uk-UA" : language === "ru" ? "ru-RU" : "en-US")}`,
      language,
    });
  };

  /** Start a new chat and immediately send the given prompt. */
  const handleQuickStart = (prompt: string) => {
    setPendingPrompt(prompt);
    createConversationMutation.mutate({
      title: prompt.length > CHAT_TITLE_MAX_LENGTH ? prompt.slice(0, CHAT_TITLE_TRUNCATED_LENGTH) + "…" : prompt,
      language,
    });
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !currentConversationId) return;

    setSendError(null);
    setIsLoading(true);
    // Add user message optimistically
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        conversationId: currentConversationId,
        role: "user",
        content: inputMessage,
        createdAt: new Date(),
      },
    ]);

    sendMessageMutation.mutate({
      conversationId: currentConversationId,
      content: inputMessage,
    });
  };

  const handleSelectConversation = (id: number) => {
    setCurrentConversationId(id);
    setMessages([]);
    setSendError(null);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <Globe className="w-16 h-16 mx-auto mb-4 text-indigo-600" />
          <h1 className="text-3xl font-bold mb-2 text-gray-900">{t.title}</h1>
          <p className="text-gray-600 mb-6">{t.subtitle}</p>
          <a href={`${import.meta.env.VITE_OAUTH_PORTAL_URL}?redirect_uri=${encodeURIComponent(window.location.href)}`}>
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700">{t.login}</Button>
          </a>
        </Card>
      </div>
    );
  }

  const exampleQuestions = [t.ex1, t.ex2, t.ex3, t.ex4, t.ex5];
  const currentConversation = conversations.find(c => c.id === currentConversationId) ?? null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className="w-8 h-8 text-indigo-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
              <p className="text-sm text-gray-600">{t.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Select value={language} onValueChange={(val) => setLanguage(val as Language)}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder={t.selectLanguage} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">{t.english}</SelectItem>
                <SelectItem value="uk">{t.ukrainian}</SelectItem>
                <SelectItem value="ru">{t.russian}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="w-4 h-4 mr-2" />
              {t.logout}
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Conversations */}
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <Button
              onClick={handleNewChat}
              disabled={createConversationMutation.isPending}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t.newChat}
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-2">
              {conversations.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">{t.noConversations}</p>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`group flex items-start rounded-lg text-sm transition-colors ${
                      currentConversationId === conv.id
                        ? "bg-indigo-100 text-indigo-900"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <button
                      onClick={() => handleSelectConversation(conv.id)}
                      className={`flex-1 text-left px-3 py-2 ${
                        currentConversationId === conv.id ? "font-medium" : ""
                      }`}
                    >
                      <div className="truncate">{conv.title}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(conv.createdAt).toLocaleDateString()}
                      </div>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConversationMutation.mutate({ id: conv.id });
                      }}
                      disabled={deleteConversationMutation.isPending}
                      title={t.deleteConversation}
                      className="opacity-0 group-hover:opacity-100 p-2 mt-1 mr-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-30"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </aside>

        {/* Main Chat Area */}
        <main className="flex-1 flex flex-col">
          {currentConversationId === null ? (
            /* ── Overview Panel ─────────────────────────────────────────── */
            <ScrollArea className="flex-1">
              <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">

                {/* Bot greeting */}
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                    <Bot className="w-7 h-7 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-xl font-semibold text-gray-900">{t.overviewGreeting}</p>
                    <p className="mt-1 text-gray-600">{t.overviewDesc}</p>
                  </div>
                </div>

                {/* Feature cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

                {/* Example questions */}
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-3">{t.examplesTitle}</p>
                  <div className="flex flex-col gap-2">
                    {exampleQuestions.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => handleQuickStart(q)}
                        disabled={createConversationMutation.isPending}
                        className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-900 transition-colors disabled:opacity-50"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Resource search section */}
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-3">{t.resourcesTitle}</p>
                  {/* Filter bar */}
                  <div className="flex flex-col sm:flex-row gap-2 mb-4">
                    <Input
                      value={resourceSearch}
                      onChange={(e) => setResourceSearch(e.target.value)}
                      placeholder={t.searchPlaceholder}
                      className="flex-1"
                    />
                    <Select
                      value={resourceTypeFilter}
                      onValueChange={(val) => setResourceTypeFilter(val as ResourceType | "all")}
                    >
                      <SelectTrigger className="w-full sm:w-44">
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
                  {/* Resource cards grid */}
                  {filteredResources.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">{t.noResults}</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {filteredResources.map((resource: any, idx: number) => (
                        <DocumentCard
                          key={resource.url ?? idx}
                          name={resource.name}
                          description={resource.description}
                          type={resource.type as ResourceType}
                          url={resource.url}
                          accessConditions={resource.accessConditions}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Official website link */}
                <a
                  href="https://lib-hdak.in.ua/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 hover:underline"
                >
                  <ExternalLink className="w-4 h-4" />
                  {t.libraryWebsite}
                </a>

              </div>
            </ScrollArea>
          ) : (
            <>
              {/* Conversation title header */}
              {currentConversation && (
                <div className="border-b border-gray-200 bg-white px-6 py-3">
                  <p className="text-sm font-medium text-gray-800 truncate">{currentConversation.title}</p>
                </div>
              )}

              {/* Messages */}
              <ScrollArea className="flex-1 p-6">
                <div className="max-w-3xl mx-auto space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-2xl px-4 py-2 rounded-lg ${
                          msg.role === "user"
                            ? "bg-indigo-600 text-white rounded-br-none"
                            : "bg-gray-200 text-gray-900 rounded-bl-none"
                        }`}
                      >
                        {msg.role === "user" ? (
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        ) : (
                          <div className="text-sm prose prose-sm max-w-none prose-a:text-indigo-700 prose-a:underline">
                            <Markdown>{msg.content}</Markdown>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-200 text-gray-900 px-4 py-2 rounded-lg rounded-bl-none">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                    </div>
                  )}
                  {sendError && (
                    <div className="flex justify-center">
                      <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {sendError}
                      </div>
                    </div>
                  )}
                  <div ref={scrollRef} />
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="border-t border-gray-200 bg-white p-4">
                <div className="max-w-3xl mx-auto flex gap-3">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder={t.typeMessage}
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={isLoading || !inputMessage.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    {isLoading ? (
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
