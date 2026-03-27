import { useEffect, useRef, useCallback, useState } from "react";
import { useParams } from "wouter";
import { useConversation, useChatStream } from "@/hooks/use-chat";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { Loader2, AlertCircle, WifiOff, BookMarked, Copy, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getResponse } from "@/lib/responses";

// ── Loading Skeleton ──────────────────────────────────────────────────────────
function ChatSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Header skeleton */}
        <div className="space-y-2 text-center mb-8">
          <Skeleton className="h-8 w-64 mx-auto" />
          <Skeleton className="h-4 w-80 mx-auto" />
        </div>
        
        {/* Message skeletons */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4 animate-pulse">
            <Skeleton className="w-9 h-9 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex gap-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              {i === 2 && <Skeleton className="h-4 w-1/2" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── ДСТУ 8302:2015 formatter ─────────────────────────────────────────────────
interface SavedBook {
  id: string;
  title: string;
  author?: string;
  year?: string;
  city?: string;
  publisher?: string;
  pages?: string;
  url?: string;
}

function formatDstu(book: SavedBook): string {
  const parts: string[] = [];
  if (book.author) parts.push(`${book.author}.`);
  parts.push(book.title);
  if (book.author) parts.push(`/ ${book.author}.`);
  const location = [book.city, book.publisher].filter(Boolean).join(" : ");
  if (location || book.year) {
    parts.push(`— ${[location, book.year].filter(Boolean).join(", ")}.`);
  }
  if (book.pages) parts.push(`— ${book.pages} с.`);
  if (book.url) parts.push(`URL: ${book.url}`);
  return parts.join(" ");
}

const SAVED_KEY = "hdak_saved";

function loadSavedBooks(): SavedBook[] {
  try {
    return JSON.parse(localStorage.getItem(SAVED_KEY) || "[]");
  } catch {
    return [];
  }
}

function persistBooks(books: SavedBook[]) {
  localStorage.setItem(SAVED_KEY, JSON.stringify(books));
}

// ── Offline hook ─────────────────────────────────────────────────────────────
function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

export default function Chat() {
  const params = useParams();
  const id = params.id ? parseInt(params.id) : null;

  const { data: conversation, isLoading, error, refetch } = useConversation(id);
  const {
    sendMessage,
    isStreaming,
    streamedContent,
    streamError,
    lastResponseMs,
    clearError,
    stopStream,
  } = useChatStream(id);

  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<string>("");
  const [prevMessagesLength, setPrevMessagesLength] = useState(0);

  const isOnline = useOnlineStatus();
  const [savedBooks, setSavedBooks] = useState<SavedBook[]>(loadSavedBooks);
  const [showSaved, setShowSaved] = useState(false);
  const [copiedDstu, setCopiedDstu] = useState(false);

  // ── Scroll ────────────────────────────────────────────────────────────────
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    if (messagesRef.current) {
      messagesRef.current.scrollTo({
        top: messagesRef.current.scrollHeight,
        behavior,
      });
    }
  }, []);

  // Initial scroll and scroll on new messages
  useEffect(() => {
    const messages = conversation?.messages ?? [];
    if (messages.length > prevMessagesLength && prevMessagesLength > 0) {
      // New message added, smooth scroll
      scrollToBottom("smooth");
    } else if (messages.length === 0) {
      // Empty state, scroll to top
      scrollToBottom("instant");
    }
    setPrevMessagesLength(messages.length);
  }, [conversation?.messages.length, scrollToBottom, prevMessagesLength]);

  // Scroll when streaming updates
  useEffect(() => {
    if (isStreaming) {
      scrollToBottom("smooth");
    }
  }, [streamedContent, isStreaming, scrollToBottom]);

  // ── Send + retry ──────────────────────────────────────────────────────────
  const handleSend = useCallback((text: string) => {
    // Перевіряємо, чи є швидка відповідь (для логування/аналітики)
    const quickResponse = getResponse(text);
    if (quickResponse) {
      console.log("[QuickResponse] Знайдено швидку відповідь:", quickResponse.title);
    }
    
    lastMessageRef.current = text;
    clearError();
    sendMessage(text);
    // Scroll to bottom after sending
    setTimeout(() => scrollToBottom("smooth"), 100);
  }, [sendMessage, clearError, scrollToBottom]);

  const retryLastMessage = useCallback(() => {
    if (lastMessageRef.current) {
      clearError();
      sendMessage(lastMessageRef.current);
    }
  }, [sendMessage, clearError]);

  // ── Saved books ───────────────────────────────────────────────────────────
  const removeBook = useCallback((bookId: string) => {
    setSavedBooks(prev => {
      const next = prev.filter(b => b.id !== bookId);
      persistBooks(next);
      return next;
    });
  }, []);

  const copyDstu = useCallback(async () => {
    if (savedBooks.length === 0) return;
    const text = savedBooks.map((b, i) => `${i + 1}. ${formatDstu(b)}`).join("\n");
    await navigator.clipboard.writeText(text);
    setCopiedDstu(true);
    setTimeout(() => setCopiedDstu(false), 2000);
  }, [savedBooks]);

  // ── Loading state with skeleton ──────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-background">
        <ChatSkeleton />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background/95 to-transparent pt-10 pb-2">
          <div style={{ width: "100%", padding: "12px 24px" }}>
            <Skeleton className="h-12 w-full max-w-xl mx-auto rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !conversation) {
    return (
      <div 
        className="h-full flex flex-col items-center justify-center gap-4 text-center p-8"
        role="alert"
        aria-live="polite"
      >
        <div 
          className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center"
          style={{ animation: "fadeIn 0.3s ease-out" }}
        >
          <AlertCircle className="w-8 h-8 text-destructive" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-xl font-serif font-bold text-foreground">
            Не вдалося завантажити розмову
          </h2>
          <p className="text-muted-foreground mt-2 text-sm">
            Розмову могло бути видалено або вона не існує.
          </p>
        </div>
        <Button 
          onClick={() => refetch()} 
          variant="outline"
          aria-label="Спробувати ще раз"
          style={{ transition: "all 0.2s ease" }}
        >
          Спробувати ще раз
        </Button>
      </div>
    );
  }

  const messages = conversation.messages;
  const lastAssistantIdx = messages.map(m => m.role).lastIndexOf("assistant");

  return (
    <div className="flex flex-col h-full bg-background relative">

      {/* ── Offline banner ──────────────────────────────────────────────── */}
      {!isOnline && (
        <div
          data-testid="banner-offline"
          role="alert"
          aria-live="polite"
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "6px 16px",
            background: "hsl(37 60% 92%)",
            borderBottom: "0.5px solid hsl(37 40% 78%)",
          }}
        >
          <WifiOff style={{ width: 14, height: 14, color: "hsl(var(--b3))" }} aria-hidden="true" />
          <span style={{ fontSize: 12, color: "hsl(var(--b2))", fontWeight: 500 }}>
            Немає з'єднання з інтернетом. Перевірте мережу.
          </span>
        </div>
      )}

      {/* ── Saved books panel ────────────────────────────────────────────── */}
      {showSaved && (
        <div 
          className="flex-shrink-0 border-b border-border bg-muted/40 max-h-60 overflow-y-auto"
          role="region"
          aria-label="Збережені книги"
        >
          <div className="flex items-center justify-between px-4 py-2">
            <span className="text-xs font-semibold text-foreground uppercase tracking-wide flex items-center gap-1.5">
              <BookMarked className="w-3.5 h-3.5" aria-hidden="true" />
              Збережені книги ({savedBooks.length})
            </span>
            <div className="flex items-center gap-2">
              {savedBooks.length > 0 && (
                <button
                  onClick={copyDstu}
                  data-testid="button-copy-dstu"
                  className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full
                    border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
                  aria-label="Копіювати список літератури у форматі ДСТУ"
                >
                  {copiedDstu
                    ? <><Check className="w-3 h-3" aria-hidden="true" /> Скопійовано</>
                    : <><Copy className="w-3 h-3" aria-hidden="true" /> Список літератури ДСТУ</>
                  }
                </button>
              )}
              <button
                onClick={() => setShowSaved(false)}
                data-testid="button-close-saved"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Закрити панель збережених книг"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          {savedBooks.length === 0 ? (
            <p className="text-xs text-muted-foreground px-4 pb-3">
              Поки що нічого не збережено. Запитайте асистента про книги!
            </p>
          ) : (
            <ul className="px-4 pb-3 space-y-1.5">
              {savedBooks.map((book) => (
                <li key={book.id} className="flex items-start gap-2 text-xs text-foreground">
                  <span className="flex-1 leading-relaxed">{formatDstu(book)}</span>
                  <button
                    onClick={() => removeBook(book.id)}
                    data-testid={`button-remove-book-${book.id}`}
                    className="text-muted-foreground hover:text-destructive transition-colors mt-0.5 flex-shrink-0"
                    aria-label={`Видалити книгу: ${book.title}`}
                  >
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── Messages ─────────────────────────────────────────────────────── */}
      <div 
        ref={messagesRef}
        className="flex-1 overflow-y-auto scroll-smooth"
        tabIndex={0}
        role="log"
        aria-label="Повідомлення чату"
        aria-live="polite"
        style={{ scrollBehavior: "smooth" }}
      >
        <div className="min-h-full pb-36">

          {/* Saved books toggle button */}
          {!showSaved && (
            <div className="flex justify-end px-4 pt-3">
              <button
                onClick={() => setShowSaved(true)}
                data-testid="button-show-saved"
                className="flex items-center gap-1.5 text-xs text-muted-foreground
                  hover:text-foreground transition-colors"
                aria-label="Показати збережені книги"
              >
                <BookMarked className="w-3.5 h-3.5" aria-hidden="true" />
                Збережені книги{savedBooks.length > 0 && ` (${savedBooks.length})`}
              </button>
            </div>
          )}

          {/* Empty state */}
          {messages.length === 0 && !isStreaming && (
            <div 
              className="max-w-3xl mx-auto px-4 py-10 text-center space-y-3"
              role="status"
              aria-live="polite"
              style={{ animation: "fadeIn 0.4s ease-out" }}
            >
              <h2 className="text-2xl font-serif font-bold text-primary">
                {conversation.title || "Нова розмова"}
              </h2>
              <p className="text-muted-foreground text-sm">
                Привіт! Я — бібліотечний асистент ХДАК. Чим можу допомогти?
              </p>
              <div className="flex flex-wrap justify-center gap-2 pt-3">
                {[
                  "Як знайти книгу в каталозі?",
                  "Коли працює бібліотека?",
                  "Що таке репозитарій ХДАК?",
                ].map((prompt, idx) => (
                  <button
                    key={prompt}
                    onClick={() => handleSend(prompt)}
                    disabled={isStreaming}
                    data-testid={`chip-starter-${prompt.slice(0, 15)}`}
                    className="
                      px-3 py-1.5 text-xs rounded-full
                      border border-border bg-white hover:bg-muted/50
                      text-foreground transition-colors duration-150 font-medium
                      focus:outline-none focus:ring-2 focus:ring-primary/20
                    "
                    aria-label={`Запитати: ${prompt}`}
                    tabIndex={0}
                    style={{
                      animation: `fadeSlideIn 0.3s ease-out ${idx * 0.1}s both`,
                    }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages list */}
          {messages.map((msg, idx) => (
            <ChatMessage
              key={msg.id}
              role={msg.role as "user" | "assistant"}
              content={msg.content}
              createdAt={msg.createdAt}
              responseMs={idx === lastAssistantIdx && !isStreaming ? lastResponseMs : null}
              onChipClick={!isStreaming ? handleSend : undefined}
              animationIndex={idx}
            />
          ))}

          {/* Streaming placeholder */}
          {isStreaming && (
            <ChatMessage
              role="assistant"
              content={streamedContent}
              isStreaming={true}
              animationIndex={messages.length}
            />
          )}

          <div ref={scrollRef} className="h-4" />
        </div>
      </div>

      {/* ── Error retry bar ──────────────────────────────────────────────── */}
      {streamError && (
        <div
          data-testid="bar-stream-error"
          role="alert"
          aria-live="assertive"
          className="flex-shrink-0 flex items-center justify-between gap-3
            px-4 py-2.5 bg-destructive/8 border-t border-destructive/20"
          style={{ animation: "slideUp 0.3s ease-out" }}
        >
          <span className="text-sm text-destructive font-medium flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-destructive inline-block flex-shrink-0" aria-hidden="true" />
            {streamError}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={retryLastMessage}
              data-testid="button-retry-stream"
              className="flex items-center gap-1 h-7 px-3 text-xs font-medium rounded-full
                bg-destructive text-white hover:bg-destructive/90 transition-colors
                focus:outline-none focus:ring-2 focus:ring-destructive/30"
              aria-label="Повторити відправку повідомлення"
            >
              ↺ Повторити
            </button>
            <button
              onClick={clearError}
              data-testid="button-dismiss-error"
              aria-label="Закрити повідомлення про помилку"
              className="h-7 px-2 text-xs rounded-full border border-destructive/30
                text-destructive hover:bg-destructive/10 transition-colors
                focus:outline-none focus:ring-2 focus:ring-destructive/30"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* ── Input zone ───────────────────────────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background/95 to-transparent pt-10 pb-2">
        <ChatInput
          onSend={handleSend}
          onStop={stopStream}
          isStreaming={isStreaming}
          disabled={!isOnline}
        />
      </div>

      {/* ── Global animations ───────────────────────────────────────────── */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { 
            opacity: 0; 
            transform: translateY(8px);
          }
          to { 
            opacity: 1; 
            transform: translateY(0);
          }
        }
        @keyframes fadeSlideIn {
          from { 
            opacity: 0; 
            transform: translateY(8px);
          }
          to { 
            opacity: 1; 
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
