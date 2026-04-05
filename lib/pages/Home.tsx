// REDESIGNED
import { useState, useEffect, useRef, useMemo, useCallback, memo } from "react";
import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import type { inferRouterOutputs } from "@trpc/server";

import { Markdown } from "@/components/Markdown";
import { CatalogActionButton } from "@/components/CatalogActionButton";
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
import {
  findLibraryKnowledgeTopic,
  findLibraryKnowledgeTopicInTopics,
  type LibraryKnowledgeTopic,
} from "@/lib/server/services/libraryKnowledge";
import {
  appendFeedbackPayload,
  appendTelemetryEvent,
  CHAT_TELEMETRY_STORAGE_KEY,
  createFeedbackPayload,
  FEEDBACK_STORAGE_KEY,
  type ChatFeedbackPayload,
  type ChatTelemetryEvent,
  type ChatFeedbackValue,
} from "@/lib/pages/homeFeedback";
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
const TYPING_BASE_DELAY_MS = 10;
const TYPING_DELAY_VARIANCE_MS = 5;
const TYPING_PUNCTUATION_PAUSE_MS = 30;
const TYPING_MIN_DELAY_MS = 3;
const TYPING_FAST_THRESHOLD_CHARS = 700;
const TYPING_MEDIUM_THRESHOLD_CHARS = 350;
const TYPING_PUNCTUATION_REGEX = /[.!?;:,]/;
const VIRTUALIZED_MESSAGES_THRESHOLD = 50;
const VIRTUALIZED_WINDOW_SIZE = 70;
const AUTO_SCROLL_BOTTOM_THRESHOLD_PX = 48;
const LIBRARY_EMAIL = "library@hdak.edu.ua";
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
    onboardingTitle: "Start in 3 steps",
    onboardingStep1: "1) Choose a ready prompt below",
    onboardingStep2: "2) Refine your query (author/topic/keyword)",
    onboardingStep3: "3) Open official links in the response",
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
    actionFindCatalog: "Search catalog",
    actionOrderBook: "Order book",
    actionContact: "Contact",
    actionWriteLetter: "Write to Librarian",
    actionShare: "Share",
    actionCopySource: "Copy source/contact",
    interfaceLang: "Interface language",
    officialResources: "Official library resources",
    historyLabel: "Conversations",
    hint: "Enter — send · Shift+Enter — new line · ↑ (empty) — edit last · Alt+↓ — send",
    langCode: "ENG",
    quickAnswer: "Quick answer",
    badgeQuick: "Quick answer",
    badgeCatalog: "Catalog",
    badgeOfficialRule: "Official rule",
    badgeGenerated: "Generated from reference data",
    sourcesLabel: "Sources",
    viewSource: "View source",
    feedbackUp: "👍 Helpful",
    feedbackDown: "👎 Didn’t help",
    feedbackSaved: "Thanks for feedback",
    followUpLabel: "Similar questions",
    emptyStateTagline: "Ask anything about the library",
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
    onboardingTitle: "Почніть у 3 кроки",
    onboardingStep1: "1) Оберіть готовий запит нижче",
    onboardingStep2: "2) Уточніть тему (автор/предмет/ключові слова)",
    onboardingStep3: "3) Відкрийте офіційні посилання у відповіді",
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
    actionFindCatalog: "Шукати в каталозі",
    actionOrderBook: "Замовити книгу",
    actionContact: "Звʼязатися",
    actionWriteLetter: "Написати листа",
    actionShare: "Поділитися",
    actionCopySource: "Копіювати джерело/контакти",
    interfaceLang: "Мова інтерфейсу",
    officialResources: "Офіційні ресурси бібліотеки",
    historyLabel: "Розмови",
    hint: "Enter — надіслати · Shift+Enter — новий рядок · ↑ (порожньо) — редагувати останнє · Alt+↓ — надіслати",
    langCode: "УКР",
    quickAnswer: "Швидка відповідь",
    badgeQuick: "Швидка відповідь",
    badgeCatalog: "Каталог",
    badgeOfficialRule: "Офіційне правило",
    badgeGenerated: "Згенеровано на основі довідкових даних",
    sourcesLabel: "Джерела",
    viewSource: "Переглянути джерело",
    feedbackUp: "👍 Корисно",
    feedbackDown: "👎 Не допомогло",
    feedbackSaved: "Дякуємо за відгук",
    followUpLabel: "Схожі запитання",
    emptyStateTagline: "Запитайте що завгодно про бібліотеку",
  },
};

function getGuestHistoryKey(guestId: string) {
  return `${GUEST_HISTORY_STORAGE_PREFIX}${guestId}`;
}

function generateFallbackLocalId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
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

function stripQuickReplyHeading(
  text: string,
  previousUserText?: string
): string {
  if (!text) return text;
  let result = text
    .replace(/^#{1,3}\s*Швидка відповідь[^\n]*\n*/i, "")
    .replace(/^\*(\*?)Швидка відповідь\*\1[^\n]*\n*/i, "")
    .replace(/^Швидка відповідь[^\n]*\n*/i, "")
    .trimStart();

  const lowerText = result.toLowerCase().trim();
  const lowerPrev = previousUserText?.toLowerCase().trim();
  if (lowerPrev && lowerText.startsWith(lowerPrev)) {
    let sliced = result.slice(lowerPrev.length).trim();
    if (
      sliced.startsWith(":") ||
      sliced.startsWith("-") ||
      sliced.startsWith("—")
    ) {
      sliced = sliced.slice(1).trim();
    }
    result = sliced;
  }
  return result;
}

function extractOfficialSourceLinksFromText(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/https?:\/\/lib-hdak\.in\.ua\/[^\s)]+/g) ?? [];
  return [...new Set(matches)];
}

function extractContactsFromText(text: string): string[] {
  if (!text) return [];
  const emails = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
  const phones = text.match(/\+?\d[\d()\-\s]{7,}\d/g) ?? [];
  return [...new Set([...emails, ...phones])];
}

function createLocalUiMessage(
  role: "user" | "assistant",
  text: string
): UIMessage {
  return {
    id: generateFallbackLocalId(),
    role,
    parts: [{ type: "text", text }],
  };
}

type CatalogBook = {
  title: string;
  author: string;
  year: string;
  url: string;
};

type CatalogResult = {
  ok: boolean;
  results: CatalogBook[];
  search_url: string;
  fallback?: { label: string; url: string }[];
};

function getCatalogResultFromParts(msg: DisplayMessage): CatalogResult | null {
  if (!("parts" in msg) || !Array.isArray(msg.parts)) return null;
  for (const part of msg.parts) {
    if (
      part !== null &&
      typeof part === "object" &&
      (part as { type?: string }).type === "tool-invocation"
    ) {
      const ti = (
        part as {
          toolInvocation?: {
            toolName?: string;
            state?: string;
            result?: unknown;
          };
        }
      ).toolInvocation;
      if (ti?.toolName === "searchCatalog" && ti.state === "result") {
        return ti.result as CatalogResult;
      }
    }
  }
  return null;
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

function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

type ContextAction = {
  icon: string;
  label: string;
  q: string | null;
  action?: string;
};

function getContextActions(topicId?: string | null): ContextAction[] {
  if (topicId === "signup-library" || topicId === "reader-card") {
    return [
      { icon: "🔍", label: "Каталог", q: "Де знайти каталог?" },
      { icon: "📞", label: "Зв'язатися", q: "Контакти бібліотеки" },
      { icon: "🗺️", label: "Адреса", q: "Адреса бібліотеки" },
    ];
  }
  if (topicId === "catalog" || topicId === "find-book") {
    return [
      { icon: "📖", label: "Правила", q: "Правила користування" },
      { icon: "⬇️", label: "Скачати", q: "Де скачати матеріали?" },
      { icon: "🔍", label: "Знайти книгу", q: "Як знайти книгу в каталозі?" },
    ];
  }
  if (topicId === "contacts" || topicId === "hdak-address") {
    return [
      { icon: "📍", label: "На карті", q: "Де на карті бібліотека?" },
      { icon: "✉️", label: "Написати", q: "Написати листа до бібліотеки" },
      { icon: "📋", label: "Копіювати", q: null, action: "copy" },
    ];
  }
  if (topicId === "library-rules" || topicId === "reading-room-rules") {
    return [
      { icon: "📝", label: "Записатися", q: "Як записатися до бібліотеки?" },
      { icon: "📱", label: "Е-читальня", q: "Правила е-читальної зали" },
      { icon: "❓", label: "Ще питання", q: null, action: "clear" },
    ];
  }
  return [
    { icon: "🔄", label: "Нове питання", q: null, action: "clear" },
    { icon: "📞", label: "Контакти", q: "Контакти бібліотеки" },
    { icon: "🔗", label: "Поділитися", q: null, action: "share" },
  ];
}

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

function getSuggestions(content: string): string[] {
  if (/графік|розклад|години|working hours|schedule/i.test(content))
    return ["Як записатися до бібліотеки?", "Контакти бібліотеки"];
  if (/книг|автор|каталог|видання|збірник|підручник|поезі/i.test(content))
    return ["Знайти ще книги", "Нові надходження"];
  if (/наук|стат|дисертац|scopus|research|репозитар/i.test(content))
    return ["Як отримати доступ до Scopus?", "Репозитарій ХДАК"];
  if (/запис|квиток|реєстрац|signup/i.test(content))
    return ["Графік роботи", "Контакти"];
  if (/контакт|телефон|email|адрес/i.test(content))
    return ["Графік роботи", "Як записатися?"];
  return ["Знайти книгу", "Графік роботи", "Контакти"];
}

type SourceBadgeType =
  | "quick"
  | "catalog"
  | "official-rule"
  | "generated"
  | "llm-fallback"
  | "unknown";

type MessageItemProps = {
  msg: DisplayMessage;
  idx: number;
  visibleMessageStartIndex: number;
  allMessages: DisplayMessage[];
  isStreaming: boolean;
  typingMessageId: string | null;
  typedMessageText: string;
  completedTypingIds: Record<string, true>;
  feedbackByResponseId: Record<string, ChatFeedbackValue>;
  language: Language;
  runtimeKnowledgeTopics: LibraryKnowledgeTopic[] | undefined;
  t: Record<string, string>;
  saveFeedback: (
    responseId: string,
    sourceBadge: SourceBadgeType,
    userQuery: string,
    value: ChatFeedbackValue
  ) => void;
  handleQuickStart: (prompt: string) => void;
  handleNewChat: () => void;
};

const MessageItem = memo(function MessageItem({
  msg,
  idx,
  visibleMessageStartIndex,
  allMessages,
  isStreaming,
  typingMessageId,
  typedMessageText,
  completedTypingIds,
  feedbackByResponseId,
  language,
  runtimeKnowledgeTopics,
  t,
  saveFeedback,
  handleQuickStart,
  handleNewChat,
}: MessageItemProps) {
  const messageIndex = visibleMessageStartIndex + idx;
  const isUser = msg.role === "user";
  const isLastAssistant =
    msg.role === "assistant" &&
    messageIndex === allMessages.length - 1 &&
    !isStreaming;
  const previousUserMessage = !isUser
    ? [...allMessages]
        .slice(0, messageIndex)
        .reverse()
        .find(prevMessage => prevMessage.role === "user")
    : null;
  const catalogAction =
    isLastAssistant && previousUserMessage
      ? getCatalogIntentAction(getMessageText(previousUserMessage), language)
      : null;
  const instantAnswerMeta =
    !isUser && previousUserMessage
      ? getInstantAnswer(getMessageText(previousUserMessage), language, {
          knowledgeTopics: runtimeKnowledgeTopics,
        })
      : null;
  const knowledgeTopic =
    !isUser && previousUserMessage
      ? runtimeKnowledgeTopics
        ? findLibraryKnowledgeTopicInTopics(
            getMessageText(previousUserMessage),
            runtimeKnowledgeTopics
          )
        : findLibraryKnowledgeTopic(getMessageText(previousUserMessage))
      : null;
  const extractedOfficialLinks = isUser
    ? []
    : extractOfficialSourceLinksFromText(getMessageText(msg));
  const sourceBadge = isUser
    ? null
    : instantAnswerMeta?.sourceBadge === "official-rule"
      ? t.badgeOfficialRule
      : instantAnswerMeta?.sourceBadge === "catalog"
        ? t.badgeCatalog
        : instantAnswerMeta
          ? t.badgeQuick
          : knowledgeTopic
            ? t.badgeGenerated
            : extractedOfficialLinks.length > 0
              ? t.badgeGenerated
              : null;
  const sourceBadgeType: SourceBadgeType = isUser
    ? "unknown"
    : instantAnswerMeta?.sourceBadge === "official-rule"
      ? "official-rule"
      : instantAnswerMeta?.sourceBadge === "catalog"
        ? "catalog"
        : instantAnswerMeta?.sourceBadge === "quick"
          ? "quick"
          : knowledgeTopic
            ? "generated"
            : extractedOfficialLinks.length > 0
              ? "generated"
              : "llm-fallback";
  const sourceLinks = isUser
    ? []
    : (instantAnswerMeta?.links ??
      knowledgeTopic?.sourceUrls ??
      extractedOfficialLinks);
  const responseId =
    "id" in msg && typeof msg.id !== "undefined"
      ? String(msg.id)
      : `${messageIndex}-${sourceBadgeType}`;
  const isCurrentlyTyping = typingMessageId === responseId;
  const followUpPrompts: string[] = (() => {
    if (isUser || !isLastAssistant) return [];
    const userText = getMessageText(previousUserMessage ?? msg).toLowerCase();
    if (instantAnswerMeta?.suggestedFollowUps?.length) {
      return instantAnswerMeta.suggestedFollowUps
        .filter(p => p.toLowerCase() !== userText)
        .slice(0, 2);
    }
    // Fallback: context-aware chips for all LLM responses
    return getSuggestions(getMessageText(msg))
      .filter(p => p.toLowerCase() !== userText)
      .slice(0, 2);
  })();
  const catalogMatches = !isUser
    ? (instantAnswerMeta?.catalogMatches ?? [])
    : [];
  const smartResultChips = !isUser ? (instantAnswerMeta?.smartChips ?? []) : [];
  const contextActions = isLastAssistant
    ? getContextActions(knowledgeTopic?.id)
    : [];
  const catalogResult = !isUser ? getCatalogResultFromParts(msg) : null;

  return (
    <div
      className="hdak-msg-outer"
      style={{
        display: "flex",
        gap: 10,
        flexDirection: isUser ? "row-reverse" : "row",
        animation: "msgIn 0.3s ease both",
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          marginTop: 2,
          background: isUser ? "#c4934a" : "#f3ece1",
          border: isUser ? "none" : "1px solid rgba(121,90,57,0.28)",
          color: isUser ? "#ffffff" : "inherit",
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
        {/* Source category badge above bubble */}
        {!isUser && sourceBadge && (
          <span
            className="hdak-source-badge"
            style={{
              alignSelf: "flex-start",
              fontSize: 11,
              color: "#a85f2e",
              background: "#f3ece1",
              border: "1px solid rgba(121,90,57,0.34)",
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
          style={
            isUser
              ? {
                  padding: "11px 15px",
                  borderRadius: "16px 4px 16px 16px",
                  border: "1px solid rgba(92,58,30,0.4)",
                  fontSize: 14,
                  lineHeight: 1.7,
                  background: "#5c3a1e",
                  color: "#ffffff",
                  maxWidth: "78%",
                }
              : {
                  padding: "11px 15px",
                  borderRadius: "4px 16px 16px 16px",
                  border: "1px solid #d9cfc0",
                  borderLeft: "3px solid #8b5e3c",
                  fontSize: 14,
                  lineHeight: 1.6,
                  background: "#f5efe6",
                  color: "#2a2018",
                  boxShadow: "0 2px 8px rgba(90,50,20,0.08)",
                  position: "relative",
                  overflow: "hidden",
                }
          }
        >
          {isUser ? (
            <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>
              {getMessageText(msg)}
            </p>
          ) : (
            <div style={{ fontSize: 14 }}>
              {typingMessageId === responseId &&
              !completedTypingIds[responseId] ? (
                typedMessageText.length > 0 ? (
                  <div className="typing-message">
                    <Markdown>
                      {stripQuickReplyHeading(
                        typedMessageText,
                        previousUserMessage
                          ? getMessageText(previousUserMessage)
                          : undefined
                      )}
                    </Markdown>
                  </div>
                ) : (
                  <div className="typing-skeleton" />
                )
              ) : (
                <Markdown>
                  {stripQuickReplyHeading(
                    getMessageText(msg),
                    previousUserMessage
                      ? getMessageText(previousUserMessage)
                      : undefined
                  )}
                </Markdown>
              )}
              {/* Inline source link at bottom of bubble */}
              {sourceLinks.length > 0 && (
                <div
                  aria-label={t.sourcesLabel}
                  style={{
                    textAlign: "right",
                    marginTop: 6,
                  }}
                >
                  <a
                    href={sourceLinks[0]}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t.viewSource}
                    className="hdak-inline-source"
                    style={{
                      fontSize: 11,
                      color: "#a85f2e",
                      textDecoration: "none",
                    }}
                  >
                    ↗ {getDomain(sourceLinks[0])}
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
        {/* Catalog search result cards */}
        {catalogResult && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              fontSize: 13,
            }}
          >
            {catalogResult.results.map(b => (
              <a
                key={b.url}
                href={b.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "block",
                  padding: "8px 12px",
                  background: "#f5efe6",
                  border: "1px solid #d9cfc0",
                  borderLeft: "3px solid #8b5e3c",
                  borderRadius: 8,
                  textDecoration: "none",
                  color: "#2a2018",
                }}
              >
                <div style={{ fontWeight: 600, color: "#5c3a1e" }}>
                  {b.title}
                </div>
                {b.author && <div style={{ color: "#795a39" }}>{b.author}</div>}
                {b.year && (
                  <div style={{ color: "#a88060", fontSize: 11 }}>{b.year}</div>
                )}
              </a>
            ))}
            {!catalogResult.ok &&
              (catalogResult.fallback ?? []).map(a => (
                <a
                  key={a.url}
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hdak-action-btn"
                  style={{ display: "inline-flex", alignItems: "center" }}
                >
                  {a.label} ↗
                </a>
              ))}
            <a
              href={catalogResult.search_url}
              target="_blank"
              rel="noopener noreferrer"
              className="hdak-action-btn"
              style={{ alignSelf: "flex-start" }}
            >
              Всі результати ↗
            </a>
          </div>
        )}
        {!isStreaming && isLastAssistant && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              animation: "actionsIn 0.35s ease both",
            }}
          >
            {catalogMatches.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                  alignItems: "center",
                  fontSize: 11,
                  color: "#795a39",
                }}
              >
                {catalogMatches.slice(0, 3).map(book => (
                  <span
                    key={`${book.author}-${book.title}`}
                    className="hdak-source-badge"
                    style={{
                      fontSize: 11,
                      background:
                        book.status === "доступна"
                          ? "#e7f4ea"
                          : book.status === "замовлена"
                            ? "#fff8df"
                            : "#f3ece1",
                      borderColor: "rgba(121,90,57,0.28)",
                    }}
                  >
                    {book.status === "доступна"
                      ? "🟢"
                      : book.status === "замовлена"
                        ? "🟡"
                        : "🔴"}{" "}
                    {book.status}
                  </span>
                ))}
              </div>
            )}
            <div className="hdak-feedback-row">
              <button
                className="hdak-feedback-btn"
                title={t.feedbackUp}
                aria-label={t.feedbackUp}
                onClick={() =>
                  saveFeedback(
                    responseId,
                    sourceBadgeType,
                    getMessageText(previousUserMessage ?? msg),
                    "up"
                  )
                }
                style={{
                  fontSize: 13,
                  opacity: feedbackByResponseId[responseId] === "up" ? 1 : 0.4,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "2px 4px",
                  lineHeight: 1,
                  transition: "opacity 0.15s",
                }}
              >
                <span aria-hidden="true">👍</span>
              </button>
              <button
                className="hdak-feedback-btn"
                title={t.feedbackDown}
                aria-label={t.feedbackDown}
                onClick={() =>
                  saveFeedback(
                    responseId,
                    sourceBadgeType,
                    getMessageText(previousUserMessage ?? msg),
                    "down"
                  )
                }
                style={{
                  fontSize: 13,
                  opacity:
                    feedbackByResponseId[responseId] === "down" ? 1 : 0.4,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "2px 4px",
                  lineHeight: 1,
                  transition: "opacity 0.15s",
                }}
              >
                <span aria-hidden="true">👎</span>
              </button>
              {feedbackByResponseId[responseId] && (
                <span style={{ fontSize: 11, color: "#795a39" }}>
                  {t.feedbackSaved}
                </span>
              )}
            </div>
            {followUpPrompts.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "nowrap",
                  gap: 6,
                  alignItems: "center",
                  overflowX: "auto",
                }}
              >
                {followUpPrompts.slice(0, 2).map((prompt, pIdx) => (
                  <button
                    key={prompt}
                    className="hdak-followup-chip"
                    style={{
                      animationDelay: `${pIdx * 0.05}s`,
                    }}
                    onClick={() => handleQuickStart(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
            {smartResultChips.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                  alignItems: "center",
                }}
              >
                {smartResultChips.map(chip => (
                  <span
                    key={chip}
                    className="hdak-action-btn"
                    style={{
                      height: 24,
                      padding: "0 8px",
                      fontSize: 11,
                      display: "inline-flex",
                      alignItems: "center",
                      background: "#f3ece1",
                    }}
                  >
                    {chip}
                  </span>
                ))}
              </div>
            )}
            {/* Quick actions under last assistant message */}
            <div
              style={{
                display: "flex",
                flexWrap: "nowrap",
                gap: 6,
                alignItems: "center",
              }}
            >
              <CatalogActionButton
                href={catalogAction?.url ?? OFFICIAL_CATALOG_URL}
                label={catalogAction?.buttonLabel ?? t.actionFindCatalog}
                emphasized={Boolean(catalogAction)}
              />
              {catalogMatches.length > 0 && (
                <a
                  href={OFFICIAL_CATALOG_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <button className="hdak-action-btn">
                    📖 {t.actionOrderBook}
                  </button>
                </a>
              )}
              <button
                onClick={() => {
                  const contacts = extractContactsFromText(getMessageText(msg));
                  const sourceToCopy = contacts.length
                    ? contacts.join("\n")
                    : (sourceLinks[0] ?? OFFICIAL_CATALOG_URL);
                  navigator.clipboard.writeText(sourceToCopy).catch(() => {});
                }}
                className="hdak-action-btn hdak-action-btn--secondary"
              >
                📋 {t.actionCopySource}
              </button>
            </div>
            {contextActions.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                  marginTop: 4,
                }}
              >
                {contextActions.map((ca, ci) => (
                  <button
                    key={ci}
                    className="hdak-ctx-btn"
                    onClick={() => {
                      if (ca.action === "clear") {
                        handleNewChat();
                      } else if (ca.action === "share") {
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
                          navigator.clipboard.writeText(text).catch(() => {});
                        }
                      } else if (ca.action === "copy") {
                        navigator.clipboard
                          .writeText(sourceLinks[0] ?? OFFICIAL_CATALOG_URL)
                          .catch(() => {});
                      } else if (ca.q) {
                        handleQuickStart(ca.q);
                      }
                    }}
                  >
                    {ca.icon} {ca.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

export default function Home() {
  // FIX 5 — Render-count guard (dev-only); catches re-render loops early.
  // Logs once when the threshold is first crossed, then every 50 renders
  // after that, to avoid flooding the console while still being visible.
  const renderCount = useRef(0);
  if (process.env.NODE_ENV === "development") {
    renderCount.current += 1;
    const rc = renderCount.current;
    if (rc === 51 || (rc > 50 && rc % 50 === 1)) {
      console.error(
        `[Home] Excessive renders detected: ${rc}. ` +
          "Check useEffect deps and streaming batching."
      );
    }
  }

  const [language, setLanguage] = useState<Language>("uk");
  const [inputFocused, setInputFocused] = useState(false);
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
  const [feedbackByResponseId, setFeedbackByResponseId] = useState<
    Record<string, ChatFeedbackValue>
  >({});
  const userHasDeselected = useRef(false);
  const pendingPromptRef = useRef<string | null>(null);
  const guestConversationIdRef = useRef(Date.now() * 1000);
  const guestIdRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);
  const prevTypingMessageCountRef = useRef(0);
  const shouldAutoScrollRef = useRef(true);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSendTimeRef = useRef(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);
  const [typedMessageText, setTypedMessageText] = useState("");
  const [visibleMessageStartIndex, setVisibleMessageStartIndex] = useState(0);
  const [completedTypingIds, setCompletedTypingIds] = useState<
    Record<string, true>
  >({});
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
    const guestId = existingGuestId ?? generateFallbackLocalId();
    if (!existingGuestId)
      window.localStorage.setItem(GUEST_ID_STORAGE_KEY, guestId);
    guestIdRef.current = guestId;

    const historyKey = getGuestHistoryKey(guestId);
    const savedCurrent = window.localStorage.getItem(historyKey);
    const savedLegacy = window.localStorage.getItem(GUEST_HISTORY_STORAGE_KEY);
    const saved = savedCurrent ?? savedLegacy;
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as {
        ts?: number;
        conversations?: LocalConversation[];
        messagesByConversation?: Record<number, UIMessage[]>;
      };
      if (parsed.ts && Date.now() - parsed.ts > 24 * 60 * 60 * 1000) {
        window.localStorage.removeItem(historyKey);
        window.localStorage.removeItem(GUEST_HISTORY_STORAGE_KEY);
        return;
      }
      const loadedConversations = parsed.conversations ?? [];
      setGuestConversations(loadedConversations);
      setGuestMessagesByConversation(parsed.messagesByConversation ?? {});
      const maxConversationId = loadedConversations.reduce(
        (maxId, conversation) => Math.max(maxId, conversation.id),
        guestConversationIdRef.current
      );
      guestConversationIdRef.current = maxConversationId;
      window.localStorage.setItem(historyKey, saved);
      if (!savedCurrent && savedLegacy) {
        window.localStorage.removeItem(GUEST_HISTORY_STORAGE_KEY);
      }
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
        ts: Date.now(),
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
  const { data: runtimeKnowledgeTopicsData } =
    trpc.knowledge.getRuntime.useQuery(undefined, {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    });
  const runtimeKnowledgeTopics: LibraryKnowledgeTopic[] | undefined =
    runtimeKnowledgeTopicsData && runtimeKnowledgeTopicsData.length > 0
      ? runtimeKnowledgeTopicsData
      : undefined;

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
  const submitFeedbackMutation = trpc.analytics.submitFeedback.useMutation();

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

  // FIX 1B — Keep a ref to the latest allMessages so effects that only care about
  // the count can depend on allMessages.length (a primitive) instead of the whole
  // array reference, which changes on every streaming chunk.
  const allMessagesRef = useRef(allMessages);
  allMessagesRef.current = allMessages;

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    scrollRef.current?.scrollIntoView({ behavior });
  }, []);

  const handleMessagesScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const distanceToBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    shouldAutoScrollRef.current =
      distanceToBottom <= AUTO_SCROLL_BOTTOM_THRESHOLD_PX;
  }, []);

  useEffect(() => {
    const count = allMessages.length;
    if (count > prevMessageCountRef.current && shouldAutoScrollRef.current) {
      scrollToBottom(prevMessageCountRef.current === 0 ? "auto" : "smooth");
    }
    prevMessageCountRef.current = count;
    // FIX 1B: use allMessages.length (primitive) instead of allMessages (array ref)
    // to avoid re-firing on every streaming chunk
  }, [allMessages.length, scrollToBottom]);

  useEffect(() => {
    if (allMessages.length <= VIRTUALIZED_MESSAGES_THRESHOLD) {
      if (visibleMessageStartIndex !== 0) setVisibleMessageStartIndex(0);
      return;
    }
    const recommendedStart = Math.max(
      0,
      allMessages.length - VIRTUALIZED_WINDOW_SIZE
    );
    setVisibleMessageStartIndex(prev =>
      prev > recommendedStart ? recommendedStart : prev
    );
  }, [allMessages.length, visibleMessageStartIndex]);

  const visibleMessages = useMemo(() => {
    if (allMessages.length <= VIRTUALIZED_MESSAGES_THRESHOLD)
      return allMessages;
    return allMessages.slice(visibleMessageStartIndex);
  }, [allMessages, visibleMessageStartIndex]);

  useEffect(
    () => () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    },
    []
  );

  useEffect(() => {
    // FIX 1B: read from allMessagesRef so we can depend on allMessages.length
    // (a stable primitive) rather than allMessages (new array ref every chunk).
    const msgs = allMessagesRef.current;
    const count = msgs.length;
    const isNewMessage = count > prevTypingMessageCountRef.current;
    prevTypingMessageCountRef.current = count;

    if (!isNewMessage || isStreaming || count === 0) return;

    const lastMessage = msgs[count - 1];
    if (lastMessage.role !== "assistant") return;

    const previousUserMessage = [...msgs]
      .slice(0, count - 1)
      .reverse()
      .find(message => message.role === "user");

    if (!previousUserMessage) return;

    const instantAnswerMeta = getInstantAnswer(
      getMessageText(previousUserMessage),
      language,
      {
        knowledgeTopics: runtimeKnowledgeTopics,
      }
    );

    const knowledgeTopic = runtimeKnowledgeTopics
      ? findLibraryKnowledgeTopicInTopics(
          getMessageText(previousUserMessage),
          runtimeKnowledgeTopics
        )
      : findLibraryKnowledgeTopic(getMessageText(previousUserMessage));

    const extractedOfficialLinks = extractOfficialSourceLinksFromText(
      getMessageText(lastMessage)
    );

    const sourceBadgeType =
      instantAnswerMeta?.sourceBadge === "official-rule"
        ? "official-rule"
        : instantAnswerMeta?.sourceBadge === "catalog"
          ? "catalog"
          : instantAnswerMeta?.sourceBadge === "quick"
            ? "quick"
            : knowledgeTopic || extractedOfficialLinks.length > 0
              ? "generated"
              : "llm-fallback";

    if (sourceBadgeType === "llm-fallback") return;

    const responseId =
      "id" in lastMessage && typeof lastMessage.id !== "undefined"
        ? String(lastMessage.id)
        : `${count - 1}-${sourceBadgeType}`;

    if (completedTypingIds[responseId]) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    const fullText = stripQuickReplyHeading(
      getMessageText(lastMessage),
      previousUserMessage ? getMessageText(previousUserMessage) : undefined
    );
    setTypingMessageId(responseId);
    setTypedMessageText("");

    if (!fullText) {
      setCompletedTypingIds(prev => ({ ...prev, [responseId]: true }));
      setTypingMessageId(null);
      return;
    }

    let currentIndex = 0;
    const adaptiveBaseDelay =
      fullText.length > TYPING_FAST_THRESHOLD_CHARS
        ? TYPING_MIN_DELAY_MS
        : fullText.length > TYPING_MEDIUM_THRESHOLD_CHARS
          ? Math.max(TYPING_MIN_DELAY_MS, Math.floor(TYPING_BASE_DELAY_MS / 2))
          : TYPING_BASE_DELAY_MS;
    const typeNext = () => {
      currentIndex += 1;
      setTypedMessageText(fullText.slice(0, currentIndex));

      if (currentIndex >= fullText.length) {
        setCompletedTypingIds(prev => ({ ...prev, [responseId]: true }));
        setTypingMessageId(null);
        typingTimeoutRef.current = null;
        return;
      }

      const previousChar = fullText[currentIndex - 1];
      const punctuationPause = TYPING_PUNCTUATION_REGEX.test(previousChar)
        ? TYPING_PUNCTUATION_PAUSE_MS
        : 0;
      const delay =
        adaptiveBaseDelay +
        Math.floor(Math.random() * (TYPING_DELAY_VARIANCE_MS + 1)) +
        punctuationPause;

      typingTimeoutRef.current = setTimeout(typeNext, delay);
    };

    typingTimeoutRef.current = setTimeout(typeNext, adaptiveBaseDelay);
    // FIX 1B: allMessages.length (primitive) instead of allMessages (array ref).
    // allMessagesRef.current always has the latest snapshot so the effect body
    // still reads the correct messages without the array being in deps.
  }, [
    allMessages.length,
    completedTypingIds,
    isStreaming,
    language,
    runtimeKnowledgeTopics,
  ]);

  const handleSendMessage = (messageText?: string) => {
    const textToSend = messageText ?? localInput;
    if (!textToSend.trim() || isStreaming) return;
    setSendError(null);
    const instantAnswer = getInstantAnswer(textToSend.trim(), language, {
      knowledgeTopics: runtimeKnowledgeTopics,
    });

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

  const handleQuickStart = useCallback(
    (prompt: string) => {
      setOpenDropdown(null);
      handleSendMessage(prompt);
    },
    [handleSendMessage]
  );

  const handleNewChat = useCallback(() => {
    userHasDeselected.current = true;
    setCurrentConversationId(null);
    setStreamedMessages([]);
    setLocalInput("");
    setSendError(null);
    setOpenDropdown(null);
  }, []);

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

  const getConversationPreview = useCallback(
    (conversationId: number) => {
      if (isAuthenticated) return "";
      const messages = guestMessagesByConversation[conversationId] ?? [];
      const firstUserQuestion = messages.find(
        message => message.role === "user"
      );
      if (!firstUserQuestion) return "";
      return getMessageText(firstUserQuestion).replace(/\s+/g, " ").trim();
    },
    [guestMessagesByConversation, isAuthenticated]
  );

  const editLastUserMessage = useCallback(() => {
    const lastUserMessage = [...allMessages]
      .reverse()
      .find(message => message.role === "user");
    if (!lastUserMessage) return;
    const text = getMessageText(lastUserMessage);
    setLocalInput(text);
    requestAnimationFrame(() => {
      if (!textareaRef.current) return;
      textareaRef.current.focus();
      adjustTextarea();
      const end = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(end, end);
    });
  }, [allMessages]);

  const t = translations[language];

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(FEEDBACK_STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Array<{
        responseId?: string;
        feedbackValue?: ChatFeedbackValue;
      }>;
      const next = parsed.reduce<Record<string, ChatFeedbackValue>>(
        (acc, item) => {
          if (
            item.responseId &&
            (item.feedbackValue === "up" || item.feedbackValue === "down")
          ) {
            acc[item.responseId] = item.feedbackValue;
          }
          return acc;
        },
        {}
      );
      setFeedbackByResponseId(next);
    } catch {
      window.localStorage.removeItem(FEEDBACK_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onUnexpectedError = () => {
      setSendError(t.streamError);
    };
    window.addEventListener("error", onUnexpectedError);
    window.addEventListener("unhandledrejection", onUnexpectedError);
    return () => {
      window.removeEventListener("error", onUnexpectedError);
      window.removeEventListener("unhandledrejection", onUnexpectedError);
    };
  }, [t.streamError]);

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js").catch(() => {
          // SW registration is best-effort; failures are non-critical
        });
      });
    }
  }, []);

  const saveFeedback = useCallback(
    (
      responseId: string,
      sourceBadge: SourceBadgeType,
      userQuery: string,
      value: ChatFeedbackValue
    ) => {
      setFeedbackByResponseId(prev => ({ ...prev, [responseId]: value }));
      if (typeof window === "undefined") return;
      const conversationId = conversationIdRef.current ?? undefined;
      const payload = createFeedbackPayload({
        responseId,
        sourceBadge,
        userQuery,
        feedbackValue: value,
        conversationId,
        guestId: guestIdRef.current ?? undefined,
      });
      let existing: ChatFeedbackPayload[] = [];
      try {
        const existingRaw = window.localStorage.getItem(FEEDBACK_STORAGE_KEY);
        existing = existingRaw
          ? (JSON.parse(existingRaw) as ChatFeedbackPayload[])
          : [];
      } catch {
        existing = [];
      }
      const next = appendFeedbackPayload(existing, payload);
      window.localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(next));

      let telemetryExisting: ChatTelemetryEvent[] = [];
      try {
        const telemetryRaw = window.localStorage.getItem(
          CHAT_TELEMETRY_STORAGE_KEY
        );
        telemetryExisting = telemetryRaw
          ? (JSON.parse(telemetryRaw) as ChatTelemetryEvent[])
          : [];
      } catch {
        telemetryExisting = [];
      }
      const telemetryNext = appendTelemetryEvent(telemetryExisting, {
        name: "feedback_submitted",
        timestamp: new Date().toISOString(),
        mode: isAuthenticatedRef.current ? "auth" : "guest",
        sourceBadge,
        responseLatency: "instant",
      });
      window.localStorage.setItem(
        CHAT_TELEMETRY_STORAGE_KEY,
        JSON.stringify(telemetryNext)
      );

      submitFeedbackMutation.mutate({
        responseId,
        sourceBadge,
        userQuery,
        feedbackValue: value,
        conversationId,
        guestId: guestIdRef.current ?? undefined,
      });
    },
    [submitFeedbackMutation.mutate]
  );

  const chips = useMemo(() => {
    const chipEmojis = ["⚡", "📚", "📘"];
    return QUICK_PROMPTS[language].slice(0, 3).map((text, index) => ({
      emoji: chipEmojis[index % chipEmojis.length],
      text,
    }));
  }, [language]);

  const showEmpty =
    !currentConversationId &&
    !userHasDeselected.current &&
    allMessages.length === 0;

  // FIX 3/4: stable ref via useCallback + rAF to avoid layout thrashing
  const adjustTextarea = useCallback(() => {
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 100) + "px";
    });
  }, []);

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
          from { opacity:0; transform:translateY(12px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes ctxIn {
          from { opacity:0; transform:translateY(8px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes dotPulse {
          0%,100% { transform:scale(.75); opacity:.3; }
          50%      { transform:scale(1.2); opacity:.9; }
        }
        @keyframes shimmerSlide {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        @keyframes chipIn {
          from { opacity:0; transform:translateY(6px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes ddIn {
          from { opacity:0; transform:translateY(-8px) scale(0.98); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(14px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes blinkCursor {
          50% { border-color: transparent; }
        }
        @keyframes skeletonPulse {
          0%, 100% { opacity: 0.45; }
          50% { opacity: 0.9; }
        }
        @keyframes actionsIn {
          from { opacity:0; transform:translateY(8px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .hdak-body {
          font-family: 'DM Sans', system-ui, sans-serif;
          background: #e8e0d5;
          color: #5f4b3a;
          height: 100vh;
          height: 100dvh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          font-size: 14px;
          line-height: 1.5;
          position: relative;
          padding-top: 56px;
          box-sizing: border-box;
        }
        .hdak-body::before {
          content: '';
          position: fixed; inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='f'%3E%3CfeTurbulence baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23f)' opacity='0.035'/%3E%3C/svg%3E");
          pointer-events: none; z-index: 0;
        }
        .hdak-serif { font-family: 'Playfair Display', Georgia, serif; }
        .hdak-dd-scroll::-webkit-scrollbar { width: 4px; }
        .hdak-dd-scroll::-webkit-scrollbar-thumb { background: #d4c4a8; border-radius: 4px; }
        .hdak-dd-scroll::-webkit-scrollbar-thumb:hover { background: #8b5e3c; }
        .hdak-msg-scroll::-webkit-scrollbar { width: 4px; }
        .hdak-msg-scroll::-webkit-scrollbar-thumb { background: #d4c4a8; border-radius: 4px; }
        .hdak-msg-scroll::-webkit-scrollbar-thumb:hover { background: #8b5e3c; }
        .hdak-msg-scroll::-webkit-scrollbar-track { background: transparent; }
        .hdak-msg-scroll { padding-bottom: 10px; }
        .hdak-textarea { resize: none; background: transparent; border: none; outline: none; color: #5f4b3a; font-family: 'DM Sans', system-ui, sans-serif; font-size: 16px; line-height: 1.62; min-height: 22px; max-height: 100px; width: 100%; }
        .hdak-kb-hint, .hdak-input-hint { display: flex; justify-content: center; }
        @media (max-width: 639px) { .hdak-kb-hint, .hdak-input-hint { display: none; } }
        @media (pointer: coarse) { .hdak-kb-hint, .hdak-input-hint { display: none; } }
        .hdak-textarea::placeholder { color: #5f4b3a; opacity: 0.82; }
        .hdak-bubble a { color: #8b5e3c; text-underline-offset: 3px; font-weight: 500; }
        .hdak-bubble a:hover { color: #5c3a1e; }
        .hdak-bubble strong { color: #5c3a1e; font-weight: 600; }
        .hdak-bubble code { background: #f1e8dc; padding: 1px 5px; border-radius: 4px; font-size: 12.5px; }
        .hdak-bubble ul { padding-left: 20px; margin-top: 6px; }
        .hdak-bubble li { margin-bottom: 5px; }
        .hdak-bubble p { margin-bottom: 9px; line-height: 1.72; }
        .hdak-chip:hover { border-color: #5c3a1e; color: #ffffff; background: #5c3a1e; transform: translateY(-1px); }
        .hdak-res-row:hover { background: #f3ece1; }
        .hdak-hist-row:hover { background: #f3ece1; }
        .hdak-lang-row:hover { background: #f3ece1; color: #5f4b3a; }
        .hdak-tb-btn:hover, .hdak-tb-btn.active { border-color: rgba(121,90,57,0.46); color: #5f4b3a; background: #f3ece1; }
        .hdak-send:hover:not(:disabled) { background: #8b5e3c; transform: scale(1.05); box-shadow: 0 6px 14px rgba(92,58,30,0.28); }
        .hdak-send:disabled { background: #d4c4a8; color: #5f4b3a; cursor: default; transform: none; box-shadow: none; }
        .hdak-input-row:focus-within { border-color: #8b5e3c; box-shadow: 0 0 0 3px rgba(139,94,60,0.12); }
        .hdak-inline-source:hover { text-decoration: underline; }
        .hdak-action-btn { min-height: 44px; height: auto; padding: 0 12px; background: #f9f5ee; border: 1px solid rgba(121,90,57,0.34); border-radius: 8px; color: #a85f2e; font-size: 12px; cursor: pointer; font-family: 'DM Sans', system-ui, sans-serif; transition: all 0.15s; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 1px 3px rgba(121,90,57,0.1); touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
        .hdak-action-btn:hover { background: #5c3a1e; border-color: #5c3a1e; color: #ffffff; }
        .hdak-action-btn:focus-visible { outline: none; box-shadow: 0 0 0 3px rgba(92,58,30,0.25); }
        .hdak-action-btn--catalog { background: #a85f2e; border-color: rgba(121,90,57,0.5); color: #ffffff; font-weight: 600; }
        .hdak-action-btn--catalog:hover { background: #bfae8d; border-color: rgba(121,90,57,0.52); color: #5f4b3a; }
        .hdak-action-btn--secondary { background: transparent; border-color: rgba(121,90,57,0.28); color: #795a39; box-shadow: none; font-size: 11px; }
        .hdak-action-btn--secondary:hover { background: transparent; border-color: #795a39; color: #5c3a1e; text-decoration: underline; }
        .hdak-followup-chip { min-height: 44px; height: auto; padding: 10px 12px; background: transparent; border: 1px solid rgba(121,90,57,0.34); border-radius: 20px; color: #795a39; font-size: 12px; cursor: pointer; font-family: 'DM Sans', system-ui, sans-serif; transition: all 0.15s; display: inline-flex; align-items: center; white-space: nowrap; max-width: fit-content; animation: chipIn 0.2s ease both; touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
        .hdak-followup-chip:hover { border-color: #795a39; color: #5c3a1e; background: rgba(121,90,57,0.06); }
        .hdak-ctx-btn { min-height: 44px; height: auto; padding: 0 14px; background: #ffffff; border: 1px solid #e0d5c5; border-radius: 20px; color: #5f4b3a; font-size: 13px; cursor: pointer; font-family: 'DM Sans', system-ui, sans-serif; transition: all 0.15s; display: inline-flex; align-items: center; gap: 5px; animation: ctxIn 0.3s ease both; touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
        .hdak-ctx-btn:hover { background: #5c3a1e; border-color: #5c3a1e; color: #ffffff; }
        .hdak-ctx-btn:focus-visible { outline: none; box-shadow: 0 0 0 3px rgba(92,58,30,0.25); }
        .hdak-source-badge { transition: transform 0.16s ease, box-shadow 0.16s ease; box-shadow: 0 1px 3px rgba(121,90,57,0.1); }
        .hdak-source-badge:hover { transform: translateY(-1px); }
        .hdak-feedback-row { display: flex; align-items: center; gap: 4px; opacity: 0; transition: opacity 0.2s; }
        .hdak-msg-outer:hover .hdak-feedback-row { opacity: 1; }
        .hdak-feedback-btn { font-size: 13px; background: none; border: none; cursor: pointer; min-height: 44px; min-width: 44px; padding: 10px; line-height: 1; display: inline-flex; align-items: center; justify-content: center; transition: opacity 0.15s, transform 0.14s ease; touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
        .hdak-feedback-btn:hover { transform: translateY(-1px); }
        .typing-message {
          border-right: 2px solid #795a39;
          animation: blinkCursor 0.75s step-end infinite;
          padding-right: 2px;
        }
        .typing-skeleton {
          width: 120px;
          height: 14px;
          border-radius: 999px;
          background: #d9b48c;
          animation: skeletonPulse 0.9s ease-in-out infinite;
        }
        .hdak-unified-loading {
          width: 140px;
          height: 10px;
          border-radius: 999px;
          background: linear-gradient(90deg, #d9b48c 25%, #f3ece1 50%, #d9b48c 75%);
          background-size: 200% 100%;
          animation: skeletonPulse 0.9s ease-in-out infinite;
        }
        .hdak-shimmer-bar {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          border-radius: 2px 2px 0 0;
          background: linear-gradient(90deg, transparent 0%, #a85f2e 50%, transparent 100%);
          background-size: 200% 100%;
          animation: shimmerSlide 1.2s linear infinite;
        }
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
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 200,
            height: 56,
            display: "flex",
            alignItems: "center",
            padding: "0 20px",
            gap: 10,
            borderBottom: "2px solid #5c3a1e",
            background: "rgba(232,224,213,0.97)",
            backdropFilter: "blur(8px)",
          }}
        >
          {/* History button */}
          <div style={{ position: "relative" }}>
            <button
              className={`hdak-tb-btn${openDropdown === "hist" ? " active" : ""}`}
              onClick={() => toggleDropdown("hist")}
              aria-label="Переглянути історію чатів"
              aria-expanded={openDropdown === "hist"}
              style={{
                height: 30,
                padding: "0 11px",
                background: "transparent",
                border: "1px solid rgba(121,90,57,0.28)",
                borderRadius: 7,
                color: "#795a39",
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
                  background: "#f9f5ee",
                  border: "1px solid rgba(121,90,57,0.28)",
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
                    color: "#795a39",
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
                    background: "#f3ece1",
                    border: "1px solid rgba(121,90,57,0.28)",
                    borderRadius: 8,
                    color: "#a85f2e",
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
                      color: "#795a39",
                    }}
                  >
                    {t.noConversations}
                  </div>
                ) : (
                  conversations.map(conv => {
                    const conversationPreview = getConversationPreview(conv.id);
                    return (
                      <div
                        key={conv.id}
                        className="hdak-hist-row"
                        onClick={() => handleSelectConversation(conv.id)}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 8,
                          padding: "8px 10px",
                          borderRadius: 8,
                          cursor: "pointer",
                          transition: "background 0.15s",
                          borderLeft:
                            currentConversationId === conv.id
                              ? "2px solid #a85f2e"
                              : "2px solid transparent",
                          background:
                            currentConversationId === conv.id
                              ? "#f3ece1"
                              : "transparent",
                        }}
                      >
                        <span
                          style={{
                            flex: 1,
                            minWidth: 0,
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 13,
                              color: "#5f4b3a",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {conv.title}
                          </span>
                          {conversationPreview && (
                            <span
                              style={{
                                fontSize: 11,
                                color: "#795a39",
                                opacity: 0.85,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {conversationPreview}
                            </span>
                          )}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            color: "#795a39",
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
                            color: "#795a39",
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
                            (e.currentTarget.style.color = "#795a39")
                          }
                          title={t.deleteConversation}
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })
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
                background: "#f3ece1",
                border: "1px solid rgba(191,174,141,0.55)",
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
                fontSize: 17,
                color: "#5c3a1e",
                letterSpacing: "0.01em",
                fontWeight: 600,
              }}
            >
              Бібліотека ХДАК
            </span>
          </div>

          {/* Right buttons */}
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              gap: 8,
              alignItems: "center",
            }}
          >
            {/* Resources */}
            <div style={{ position: "relative" }}>
              <button
                className={`hdak-tb-btn${openDropdown === "res" ? " active" : ""}`}
                onClick={() => toggleDropdown("res")}
                aria-label="Відкрити ресурси бібліотеки"
                aria-expanded={openDropdown === "res"}
                style={{
                  height: 30,
                  padding: "0 11px",
                  background: "transparent",
                  border: "1px solid rgba(121,90,57,0.28)",
                  borderRadius: 7,
                  color: "#795a39",
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
                    background: "#f9f5ee",
                    border: "1px solid rgba(121,90,57,0.28)",
                    borderRadius: 12,
                    padding: 0,
                    zIndex: 200,
                    boxShadow:
                      "0 16px 48px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.03)",
                    minWidth: 268,
                    maxHeight: 440,
                    overflowY: "auto",
                    animation: "ddIn 0.15s cubic-bezier(.25,.46,.45,.94) both",
                    overflow: "hidden",
                  }}
                  className="hdak-dd-scroll"
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "#ffffff",
                      background: "#5c3a1e",
                      padding: "10px 16px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    {t.officialResources}
                    <button
                      onClick={() => setOpenDropdown(null)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#ffffff",
                        fontSize: 18,
                        cursor: "pointer",
                        lineHeight: 1,
                        padding: "0 2px",
                        opacity: 0.8,
                      }}
                      aria-label="Закрити"
                    >
                      ×
                    </button>
                  </div>
                  <div
                    style={{ padding: 6, overflowY: "auto", maxHeight: 380 }}
                    className="hdak-dd-scroll"
                  >
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
                              color: "#5f4b3a",
                              fontWeight: 500,
                              lineHeight: 1.3,
                            }}
                          >
                            {res.name}
                            {res.vpn && (
                              <span
                                style={{
                                  fontSize: 10,
                                  color: "#a85f2e",
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
                              color: "#795a39",
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
                </div>
              )}
            </div>

            {/* Language */}
            <div style={{ position: "relative" }}>
              <button
                className={`hdak-tb-btn${openDropdown === "lang" ? " active" : ""}`}
                onClick={() => toggleDropdown("lang")}
                aria-label="Змінити мову інтерфейсу"
                aria-expanded={openDropdown === "lang"}
                style={{
                  height: 30,
                  padding: "0 11px",
                  background: "transparent",
                  border: "1px solid rgba(121,90,57,0.28)",
                  borderRadius: 7,
                  color: "#795a39",
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
                <span aria-hidden="true">🌐</span>{" "}
                <span className="tb-label">{langLabels[language]}</span>
                <span
                  style={{
                    fontSize: 10,
                    transition: "transform 0.2s",
                    transform:
                      openDropdown === "lang"
                        ? "rotate(180deg)"
                        : "rotate(0deg)",
                  }}
                >
                  ▾
                </span>
              </button>
              {openDropdown === "lang" && (
                <div
                  style={{
                    position: "absolute",
                    top: 38,
                    right: 0,
                    background: "#f9f5ee",
                    border: "1px solid rgba(121,90,57,0.28)",
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
                      color: "#795a39",
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
                        color: language === lang ? "#a85f2e" : "#795a39",
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

          {/* Status indicator dot */}
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#4caf50",
              flexShrink: 0,
              boxShadow: "0 0 0 2px rgba(76,175,80,0.25)",
            }}
            title="Онлайн"
          />
        </header>

        {/* ── MAIN ── */}
        <main
          className="hdak-main-container"
          style={{
            flex: 1,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            width: "100%",
            margin: "0 auto",
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
                  width: 40,
                  height: 40,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 18,
                }}
              >
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#795a39"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
              </div>
              <h1
                className="hdak-serif"
                style={{
                  fontSize: 26,
                  fontWeight: 600,
                  color: "#5f4b3a",
                  marginBottom: 6,
                }}
              >
                {t.overviewGreeting}
              </h1>
              <p
                style={{
                  fontSize: 13,
                  color: "#64461d",
                  fontStyle: "italic",
                  marginBottom: 6,
                }}
              >
                {t.emptyStateTagline}
              </p>
              <p
                style={{
                  fontSize: 13,
                  color: "#795a39",
                  maxWidth: 320,
                  lineHeight: 1.65,
                  marginBottom: 30,
                }}
              >
                {t.overviewDesc}
              </p>

              <div
                style={{
                  width: "100%",
                  maxWidth: 520,
                  background: "#f9f5ee",
                  border: "1px solid #d9b48c",
                  borderRadius: 14,
                  padding: "12px 14px",
                  marginBottom: 18,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: "#a85f2e",
                    fontWeight: 600,
                    marginBottom: 7,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  {t.onboardingTitle}
                </div>
                <div
                  style={{ fontSize: 12, color: "#795a39", lineHeight: 1.55 }}
                >
                  <div>{t.onboardingStep1}</div>
                  <div>{t.onboardingStep2}</div>
                  <div>{t.onboardingStep3}</div>
                </div>
              </div>

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
                    background: "rgba(121,90,57,0.28)",
                  }}
                />
                <span style={{ fontSize: 12, color: "#a85f2e", opacity: 0.5 }}>
                  ✦
                </span>
                <div
                  style={{
                    flex: 1,
                    height: 1,
                    background: "rgba(121,90,57,0.28)",
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
                {chips.map(chip => (
                  <button
                    key={chip.text}
                    className="hdak-chip"
                    onClick={() => handleQuickStart(chip.text)}
                    style={{
                      minHeight: 44,
                      padding: "10px 14px",
                      background: "#f9f5ee",
                      border: "1px solid rgba(121,90,57,0.28)",
                      borderRadius: 18,
                      fontSize: 11,
                      color: "#795a39",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      fontFamily: "'DM Sans', system-ui, sans-serif",
                      touchAction: "manipulation",
                      WebkitTapHighlightColor: "transparent",
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
              ref={messagesContainerRef}
              onScroll={handleMessagesScroll}
              role="log"
              aria-live="polite"
              aria-label="Історія чату"
              aria-busy={isStreaming}
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "24px 0 18px",
                display: "flex",
                flexDirection: "column",
                gap: 14,
                scrollBehavior: "smooth",
              }}
            >
              {visibleMessageStartIndex > 0 && (
                <button
                  className="hdak-action-btn"
                  style={{ alignSelf: "center", height: 26, fontSize: 11 }}
                  onClick={() =>
                    setVisibleMessageStartIndex(prev =>
                      Math.max(0, prev - VIRTUALIZED_WINDOW_SIZE)
                    )
                  }
                >
                  ↑ Show earlier messages ({visibleMessageStartIndex})
                </button>
              )}
              {visibleMessages.map((msg, idx) => {
                const messageIndex = visibleMessageStartIndex + idx;
                return (
                  <MessageItem
                    key={
                      "id" in msg && typeof msg.id !== "undefined"
                        ? String(msg.id)
                        : `msg-${messageIndex}-${msg.role}`
                    }
                    msg={msg}
                    idx={idx}
                    visibleMessageStartIndex={visibleMessageStartIndex}
                    allMessages={allMessages}
                    isStreaming={isStreaming}
                    typingMessageId={typingMessageId}
                    typedMessageText={typedMessageText}
                    completedTypingIds={completedTypingIds}
                    feedbackByResponseId={feedbackByResponseId}
                    language={language}
                    runtimeKnowledgeTopics={runtimeKnowledgeTopics}
                    t={t}
                    saveFeedback={saveFeedback}
                    handleQuickStart={handleQuickStart}
                    handleNewChat={handleNewChat}
                  />
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
                      border: "1px solid rgba(121,90,57,0.28)",
                      background: "#ede5d8",
                    }}
                  >
                    📚
                  </div>
                  <div
                    style={{
                      padding: "11px 15px",
                      borderRadius: 13,
                      borderTopLeftRadius: 3,
                      border: "1px solid rgba(121,90,57,0.28)",
                      background: "#f5efe6",
                      position: "relative",
                      overflow: "hidden",
                      minWidth: 80,
                    }}
                  >
                    <div className="hdak-shimmer-bar" />
                    <div
                      className="hdak-unified-loading"
                      style={{ marginTop: 6 }}
                    />
                  </div>
                </div>
              )}

              <div ref={scrollRef} />
            </div>
          )}

          {/* ── INPUT BAR ── */}
          <div
            style={{
              padding: "12px 0 0",
              flexShrink: 0,
              paddingBottom: "max(22px, env(safe-area-inset-bottom))",
              borderTop: "1px solid rgba(121,90,57,0.15)",
            }}
          >
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
                background: "#f5efe6",
                border: inputFocused
                  ? "1.5px solid #8b5e3c"
                  : "1.5px solid #c8b898",
                borderRadius: 16,
                padding: "8px 8px 8px 14px",
                transition: "border-color 0.15s, box-shadow 0.15s",
                boxShadow: inputFocused
                  ? "0 0 0 3px rgba(139,94,60,0.12)"
                  : "0 2px 8px rgba(90,50,20,0.07)",
              }}
            >
              <textarea
                ref={textareaRef}
                id="chat-input"
                className="hdak-textarea"
                rows={1}
                value={localInput}
                aria-label="Введіть запитання до бібліотеки"
                aria-describedby="keyboard-hints"
                inputMode="text"
                autoComplete="off"
                onChange={e => {
                  setLocalInput(e.target.value);
                  adjustTextarea();
                }}
                onKeyDown={e => {
                  if (
                    e.key === "ArrowUp" &&
                    !e.shiftKey &&
                    !e.altKey &&
                    !localInput.trim()
                  ) {
                    e.preventDefault();
                    editLastUserMessage();
                    return;
                  }
                  if (e.key === "ArrowDown" && e.altKey) {
                    e.preventDefault();
                    if (localInput.trim()) handleSendMessage();
                    return;
                  }
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
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                placeholder={t.typeMessage}
                disabled={isStreaming}
              />
              <button
                className="hdak-send"
                aria-label={t.sendMessage}
                onClick={() => {
                  handleSendMessage();
                  if (textareaRef.current)
                    textareaRef.current.style.height = "auto";
                }}
                disabled={isStreaming || !localInput.trim()}
                style={{
                  width: 44,
                  height: 44,
                  flexShrink: 0,
                  background:
                    isStreaming || !localInput.trim() ? "#e2d2bd" : "#5c3a1e",
                  border: "none",
                  borderRadius: 12,
                  cursor:
                    isStreaming || !localInput.trim() ? "default" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color:
                    isStreaming || !localInput.trim() ? "#5f4b3a" : "#ffffff",
                  transition:
                    "background 0.18s, transform 0.15s, box-shadow 0.18s",
                  touchAction: "manipulation",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <svg
                  width="16"
                  height="16"
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
              className="hdak-kb-hint"
              style={{
                fontSize: 11,
                color: "#795a39",
                marginTop: 7,
              }}
            >
              {t.hint}
            </div>{" "}
            {/* Visually-hidden accessible description for screen readers */}
            <span
              id="keyboard-hints-sr"
              style={{
                position: "absolute",
                width: 1,
                height: 1,
                padding: 0,
                margin: -1,
                overflow: "hidden",
                clip: "rect(0,0,0,0)",
                whiteSpace: "nowrap",
                border: 0,
              }}
            >
              Enter для надсилання, Shift+Enter для нового рядка
            </span>
          </div>
        </main>
      </div>
    </>
  );
}
