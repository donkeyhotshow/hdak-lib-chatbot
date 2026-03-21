import { useEffect, useRef, useCallback, useState } from "react";
import { useParams } from "wouter";
import { useConversation, useChatStream } from "@/hooks/use-chat";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { Loader2, AlertCircle, WifiOff, BookMarked, Copy, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  const lastMessageRef = useRef<string>("");

  const isOnline = useOnlineStatus();
  const [savedBooks, setSavedBooks] = useState<SavedBook[]>(loadSavedBooks);
  const [showSaved, setShowSaved] = useState(false);
  const [copiedDstu, setCopiedDstu] = useState(false);

  // ── Scroll ────────────────────────────────────────────────────────────────
  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages.length, streamedContent, scrollToBottom]);

  // ── Send + retry ──────────────────────────────────────────────────────────
  const handleSend = useCallback((text: string) => {
    lastMessageRef.current = text;
    clearError();
    sendMessage(text);
  }, [sendMessage, clearError]);

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

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (error || !conversation) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 text-center p-8">
        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>
        <div>
          <h2 className="text-xl font-serif font-bold text-foreground">
            Не вдалося завантажити розмову
          </h2>
          <p className="text-muted-foreground mt-2 text-sm">
            Розмову могло бути видалено або вона не існує.
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline">Спробувати ще раз</Button>
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
          className="flex-shrink-0 flex items-center justify-center gap-2 px-4 py-2
            bg-yellow-50 dark:bg-yellow-900/30 border-b border-yellow-200 dark:border-yellow-700"
        >
          <WifiOff className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
          <span className="text-xs font-medium text-yellow-700 dark:text-yellow-300">
            Немає з'єднання з інтернетом. Перевірте мережу.
          </span>
        </div>
      )}

      {/* ── Saved books panel ────────────────────────────────────────────── */}
      {showSaved && (
        <div className="flex-shrink-0 border-b border-border bg-muted/40 max-h-60 overflow-y-auto">
          <div className="flex items-center justify-between px-4 py-2">
            <span className="text-xs font-semibold text-foreground uppercase tracking-wide flex items-center gap-1.5">
              <BookMarked className="w-3.5 h-3.5" />
              Збережені книги ({savedBooks.length})
            </span>
            <div className="flex items-center gap-2">
              {savedBooks.length > 0 && (
                <button
                  onClick={copyDstu}
                  data-testid="button-copy-dstu"
                  className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full
                    border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
                >
                  {copiedDstu
                    ? <><Check className="w-3 h-3" /> Скопійовано</>
                    : <><Copy className="w-3 h-3" /> Список літератури ДСТУ</>
                  }
                </button>
              )}
              <button
                onClick={() => setShowSaved(false)}
                data-testid="button-close-saved"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Закрити"
              >
                <X className="w-4 h-4" />
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
                    aria-label="Видалити"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── Messages ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scroll-smooth">
        <div className="min-h-full pb-36">

          {/* Saved books toggle button */}
          {!showSaved && (
            <div className="flex justify-end px-4 pt-3">
              <button
                onClick={() => setShowSaved(true)}
                data-testid="button-show-saved"
                className="flex items-center gap-1.5 text-xs text-muted-foreground
                  hover:text-foreground transition-colors"
              >
                <BookMarked className="w-3.5 h-3.5" />
                Збережені книги{savedBooks.length > 0 && ` (${savedBooks.length})`}
              </button>
            </div>
          )}

          {/* Empty state */}
          {messages.length === 0 && !isStreaming && (
            <div className="max-w-3xl mx-auto px-4 py-10 text-center space-y-3">
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
                ].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSend(prompt)}
                    disabled={isStreaming}
                    data-testid={`chip-starter-${prompt.slice(0, 15)}`}
                    className="
                      px-3 py-1.5 text-xs rounded-full
                      border border-border bg-white hover:bg-muted/50
                      text-foreground transition-colors duration-150 font-medium
                    "
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
            />
          ))}

          {/* Streaming placeholder */}
          {isStreaming && (
            <ChatMessage
              role="assistant"
              content={streamedContent}
              isStreaming={true}
            />
          )}

          <div ref={scrollRef} className="h-4" />
        </div>
      </div>

      {/* ── Error retry bar ──────────────────────────────────────────────── */}
      {streamError && (
        <div
          data-testid="bar-stream-error"
          className="flex-shrink-0 flex items-center justify-between gap-3
            px-4 py-2.5 bg-destructive/8 border-t border-destructive/20"
        >
          <span className="text-sm text-destructive font-medium flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-destructive inline-block flex-shrink-0" />
            {streamError}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={retryLastMessage}
              data-testid="button-retry-stream"
              className="flex items-center gap-1 h-7 px-3 text-xs font-medium rounded-full
                bg-destructive text-white hover:bg-destructive/90 transition-colors"
            >
              ↺ Повторити
            </button>
            <button
              onClick={clearError}
              data-testid="button-dismiss-error"
              aria-label="Закрити"
              className="h-7 px-2 text-xs rounded-full border border-destructive/30
                text-destructive hover:bg-destructive/10 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
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
    </div>
  );
}
