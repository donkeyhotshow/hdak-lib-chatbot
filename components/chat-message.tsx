"use client";

import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { format } from "date-fns";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  createdAt?: Date | string | null;
  isStreaming?: boolean;
  responseMs?: number | null;
  suggestions?: string[];
  onChipClick?: (text: string) => void;
}

const BookAvatar = () => (
  <svg width="14" height="11" viewBox="0 0 14 11" fill="none" aria-hidden="true">
    <path d="M7 1C7 1 4.5.5 2 1L1.5 9.5C4 9 6.5 9.5 7 9.5L7 1Z" fill="rgba(192,136,64,0.22)" stroke="rgba(192,136,64,0.55)" strokeWidth="0.6"/>
    <path d="M7 1C7 1 9.5.5 12 1L12.5 9.5C10 9 7.5 9.5 7 9.5L7 1Z" fill="rgba(192,136,64,0.16)" stroke="rgba(192,136,64,0.45)" strokeWidth="0.6"/>
    <line x1="7" y1="1" x2="7" y2="9.5" stroke="rgba(192,136,64,0.8)" strokeWidth="0.8"/>
  </svg>
);

function getSuggestions(content: string): string[] {
  const lower = content.toLowerCase();
  const chips: string[] = [];

  if (lower.includes("каталог") || lower.includes("книг") || lower.includes("пошук"))
    chips.push("Як шукати книги в каталозі?");
  if (lower.includes("год") || lower.includes("розкл") || lower.includes("час роботи"))
    chips.push("Графік роботи бібліотеки");
  if (lower.includes("реєстр") || lower.includes("читацьк") || lower.includes("запис"))
    chips.push("Як записатися до бібліотеки?");
  if (lower.includes("репозит"))
    chips.push("Що таке репозитарій ХДАК?");
  if (lower.includes("послуг") || lower.includes("сервіс"))
    chips.push("Які послуги надає бібліотека?");
  if (lower.includes("контакт") || lower.includes("адрес") || lower.includes("телефон"))
    chips.push("Як зв'язатися?");

  if (chips.length === 0) {
    chips.push("Які послуги надає бібліотека?", "Контакти бібліотеки");
  }
  return chips.slice(0, 3);
}

export const ChatMessage = memo(function ChatMessage({
  role,
  content,
  createdAt,
  isStreaming,
  responseMs,
  suggestions,
  onChipClick,
}: ChatMessageProps) {
  const isUser = role === "user";
  const chips = !isUser && !isStreaming && onChipClick
    ? (suggestions ?? getSuggestions(content))
    : [];

  const respLabel = responseMs != null
    ? responseMs < 1000 ? `${responseMs}мс` : `${(responseMs / 1000).toFixed(1)}с`
    : null;

  return (
    <div
      className="animate-rise"
      style={{ display: "flex", flexDirection: "column", marginBottom: 20 }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 8,
          flexDirection: isUser ? "row-reverse" : "row",
        }}
      >
        {/* Avatar */}
        {isUser ? (
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              background: "var(--paper3)",
              border: "0.5px solid var(--ln2)",
              flexShrink: 0,
              marginBottom: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 9,
              fontWeight: 500,
              color: "var(--ink3)",
            }}
          >
            ВИ
          </div>
        ) : (
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 5,
              background: "var(--dk1)",
              flexShrink: 0,
              marginBottom: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <BookAvatar />
          </div>
        )}

        {/* Message bubble */}
        {isUser ? (
          <div
            style={{
              maxWidth: "72%",
              padding: "10px 15px",
              background: "var(--dk1)",
              borderRadius: "16px 16px 3px 16px",
              color: "rgba(240,225,200,0.88)",
              fontSize: 14,
              lineHeight: 1.7,
              fontWeight: 300,
              wordBreak: "break-word",
            }}
          >
            {content}
          </div>
        ) : (
          <div
            style={{
              maxWidth: "82%",
              padding: "11px 15px",
              background: "#fff",
              border: "0.5px solid var(--ln)",
              borderRadius: "16px 16px 16px 3px",
              color: "var(--ink)",
              fontSize: 14,
              lineHeight: 1.75,
              fontWeight: 300,
            }}
          >
            {isStreaming && !content ? (
              <div style={{ display: "flex", alignItems: "center", gap: 3.5, padding: "2px 0" }}>
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: "50%",
                      background: "var(--ink4)",
                      animation: "typing-dot 1.3s ease-in-out infinite",
                      animationDelay: `${i * 0.18}s`,
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className={`prose-custom ${isStreaming ? "animate-pulse-subtle" : ""}`}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content || ""}
                </ReactMarkdown>
                {isStreaming && (
                  <span
                    className="animate-cursor"
                    style={{
                      display: "inline-block",
                      width: 1.5,
                      height: 13,
                      marginLeft: 1,
                      background: "var(--gold)",
                      borderRadius: 1,
                      verticalAlign: "text-bottom",
                    }}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions + time for assistant messages */}
      {!isUser && !isStreaming && content && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            padding: "5px 0 0 32px",
            opacity: 0,
            transition: "opacity 0.14s",
          }}
          className="group-hover:opacity-100"
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "0"; }}
        >
          <button
            title="Копіювати"
            onClick={() => navigator.clipboard.writeText(content)}
            style={{
              width: 26,
              height: 26,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              border: "none",
              borderRadius: 6,
              color: "var(--ink4)",
              cursor: "pointer",
              transition: "all 0.1s",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="5" width="9" height="9" rx="2"/>
              <path d="M11 5V3a2 2 0 0 0-2-2H3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>
            </svg>
          </button>
          {createdAt && !isNaN(new Date(createdAt).getTime()) && (
            <span style={{ fontSize: 10.5, color: "var(--ink4)", marginLeft: 3 }}>
              {format(new Date(createdAt), "HH:mm")}
            </span>
          )}
          {respLabel && (
            <span style={{ fontSize: 10.5, color: "var(--ink4)", marginLeft: 6 }}>
              {respLabel}
            </span>
          )}
        </div>
      )}

      {/* Follow-up chips */}
      {chips.length > 0 && (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", padding: "8px 0 0 32px" }}>
          {chips.map((chip) => (
            <button
              key={chip}
              onClick={() => onChipClick?.(chip)}
              style={{
                height: 24,
                padding: "0 10px",
                background: "transparent",
                border: "0.5px solid var(--ln2)",
                borderRadius: 100,
                color: "var(--ink3)",
                fontSize: 11.5,
                fontWeight: 300,
                fontFamily: "var(--ff-b)",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.12s",
              }}
            >
              {chip}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
