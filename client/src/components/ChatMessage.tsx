import { memo, useState } from "react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { format } from "date-fns";
import { ThumbsUp, ThumbsDown } from "lucide-react";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  createdAt?: Date | string | null;
  isStreaming?: boolean;
}

function BotAvatar() {
  return (
    <div
      aria-hidden="true"
      className="shrink-0 mb-0.5"
      style={{
        width: 28, height: 28,
        borderRadius: "var(--r-sm)",
        background: "var(--b1)",
        border: "1px solid rgba(92,58,30,0.3)",
        position: "relative",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {/* Book spine lines */}
      <span style={{
        position: "absolute", left: 5, top: 4, right: 5, bottom: 4,
        borderLeft: "2px solid rgba(245,234,216,.6)",
        borderRight: "2px solid rgba(245,234,216,.6)",
      }} />
      <span style={{
        position: "absolute", left: "50%", top: 4, bottom: 4,
        width: 1, background: "rgba(245,234,216,.4)",
        transform: "translateX(-50%)",
      }} />
    </div>
  );
}

function UserAvatar() {
  return (
    <div
      aria-hidden="true"
      className="shrink-0 mb-0.5"
      style={{
        width: 28, height: 28,
        borderRadius: "50%",
        background: "var(--b2)",
        border: "1px solid var(--border-strong)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 500, color: "var(--p1)",
        letterSpacing: ".02em",
        flexShrink: 0,
      }}
    >
      ВИ
    </div>
  );
}

export const ChatMessage = memo(function ChatMessage({
  role,
  content,
  createdAt,
  isStreaming,
}: ChatMessageProps) {
  const isUser = role === "user";
  const [feedback, setFeedback] = useState<"up" | "dn" | null>(null);
  const [feedbackLabel, setFeedbackLabel] = useState("Чи була відповідь корисною?");

  const handleFeedback = (dir: "up" | "dn") => {
    setFeedback(dir);
    setFeedbackLabel(dir === "up" ? "Дякуємо! 🙏" : "Зрозуміло, покращимо");
  };

  return (
    <div
      className={cn(
        "group flex flex-col gap-1.5 mb-3.5 animate-rise",
        isUser ? "items-end" : "items-start"
      )}
    >
      <div className={cn("flex items-end gap-2", isUser && "flex-row-reverse")}>
        {isUser ? <UserAvatar /> : <BotAvatar />}

        {/* Bubble */}
        <div
          className={cn("prose-custom", isStreaming && "animate-pulse-subtle")}
          style={isUser ? {
            maxWidth: "76%",
            padding: "10px 15px",
            background: "var(--b1)",
            border: "0.5px solid rgba(92,58,30,.35)",
            borderRadius: "var(--r-xl) var(--r-xl) var(--r-sm) var(--r-xl)",
            color: "rgba(245,234,216,.95)",
            fontSize: 14,
            lineHeight: 1.65,
            wordBreak: "break-word",
          } : {
            maxWidth: "82%",
            padding: "11px 15px",
            background: "rgba(255,252,245,.92)",
            border: "0.5px solid var(--border-light)",
            borderRadius: "var(--r-xl) var(--r-xl) var(--r-xl) var(--r-sm)",
            color: "var(--text-1)",
            fontSize: 14,
            lineHeight: 1.68,
            backdropFilter: "blur(4px)",
          }}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content || ""}
          </ReactMarkdown>
          {isStreaming && (
            <span style={{
              display: "inline-block",
              width: "1.5px",
              height: 13,
              background: "var(--b3)",
              marginLeft: 1,
              verticalAlign: "text-bottom",
              animation: "cblink .65s step-end infinite",
            }} />
          )}
          {/* Source attribution for bot */}
          {!isUser && !isStreaming && content && (
            <div style={{
              display: "flex", alignItems: "center", gap: 5,
              fontSize: 11, color: "var(--text-4)",
              marginTop: 7, paddingTop: 7,
              borderTop: "0.5px solid var(--border-light)",
            }}>
              <span style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--text-4)", flexShrink: 0, display: "inline-block" }} />
              Бібліотечний асистент ХДАК
              {createdAt && (
                <span style={{ marginLeft: "auto" }}>
                  {format(new Date(createdAt), "HH:mm")}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Feedback row — visible on group hover (bot only) */}
      {!isUser && !isStreaming && content && (
        <div
          className="flex items-center gap-1 pl-9 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
        >
          <button
            onClick={() => handleFeedback("up")}
            aria-label="Корисна відповідь"
            style={{
              width: 26, height: 26,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: feedback === "up" ? "rgba(46,125,50,.1)" : "transparent",
              border: `0.5px solid ${feedback === "up" ? "rgba(46,125,50,.25)" : "var(--border-light)"}`,
              borderRadius: "var(--r-sm)",
              color: feedback === "up" ? "#2e7d32" : "var(--text-4)",
              fontSize: 12,
              transition: "all .12s",
              cursor: "pointer",
            }}
          >
            <ThumbsUp style={{ width: 11, height: 11 }} />
          </button>
          <button
            onClick={() => handleFeedback("dn")}
            aria-label="Некорисна відповідь"
            style={{
              width: 26, height: 26,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: feedback === "dn" ? "rgba(198,40,40,.08)" : "transparent",
              border: `0.5px solid ${feedback === "dn" ? "rgba(198,40,40,.2)" : "var(--border-light)"}`,
              borderRadius: "var(--r-sm)",
              color: feedback === "dn" ? "#c62828" : "var(--text-4)",
              fontSize: 12,
              transition: "all .12s",
              cursor: "pointer",
            }}
          >
            <ThumbsDown style={{ width: 11, height: 11 }} />
          </button>
          <span style={{ fontSize: 11, color: "var(--text-4)" }}>{feedbackLabel}</span>
        </div>
      )}
    </div>
  );
});

/* ── Typing indicator (three animated dots) ── */
export function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 mb-3.5 animate-rise">
      <BotAvatar />
      <div style={{
        display: "flex", alignItems: "center", gap: 4,
        padding: "11px 15px",
        background: "rgba(255,252,245,.92)",
        border: "0.5px solid var(--border-light)",
        borderRadius: "var(--r-xl) var(--r-xl) var(--r-xl) var(--r-sm)",
        width: "fit-content",
      }}>
        {[0, 0.18, 0.36].map((delay, i) => (
          <span key={i} style={{
            width: 5, height: 5, borderRadius: "50%",
            background: "var(--text-4)",
            display: "inline-block",
            animation: `tpulse 1.3s ease-in-out ${delay}s infinite`,
          }} />
        ))}
      </div>
    </div>
  );
}
