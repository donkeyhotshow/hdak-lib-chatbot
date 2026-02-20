import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Markdown } from "@/components/Markdown";
import { trpc } from "@/lib/trpc";
import { Loader2, Send, Plus, Globe, LogOut } from "lucide-react";

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
  },
};

export default function Home() {
  const { user, isAuthenticated, logout } = useAuth();
  const [language, setLanguage] = useState<Language>("en");
  const [conversations, setConversations] = useState<any[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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
      if (conversationsData) {
        setConversations([...conversationsData, data]);
      }
    },
  });

  // Send message mutation
  const sendMessageMutation = trpc.conversations.sendMessage.useMutation({
    onSuccess: (data) => {
      setMessages((prev) => [...prev, data]);
      setInputMessage("");
      setIsLoading(false);
    },
    onError: () => {
      setIsLoading(false);
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

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !currentConversationId) return;

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
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      currentConversationId === conv.id
                        ? "bg-indigo-100 text-indigo-900 font-medium"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <div className="truncate">{conv.title}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(conv.createdAt).toLocaleDateString()}
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </aside>

        {/* Main Chat Area */}
        <main className="flex-1 flex flex-col">
          {currentConversationId === null ? (
            <div className="flex-1 flex items-center justify-center">
              <Card className="text-center p-8">
                <Globe className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600 mb-4">{t.noConversations}</p>
                <Button onClick={handleNewChat} className="bg-indigo-600 hover:bg-indigo-700">
                  {t.startChat}
                </Button>
              </Card>
            </div>
          ) : (
            <>
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
