import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Clock } from "lucide-react";
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
      style={{
        width: "100%",
        padding: "14px 16px",
        background: isUser ? "transparent" : "hsl(38 55% 95%)",
        borderBottom: "0.5px solid hsl(var(--border))",
      }}
    >
      <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", gap: 12 }}>

        {/* Avatar */}
        <div
          style={{
            flexShrink: 0,
            width: 28,
            height: 28,
            borderRadius: 6,
            background: isUser ? "hsl(37 35% 88%)" : "hsl(var(--b0))",
            border: `1px solid ${isUser ? "hsl(var(--border))" : "hsl(25 40% 18%)"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 2,
            flexDirection: "column" as const,
          }}
        >
          {isUser ? (
            <span style={{ fontSize: 10, fontWeight: 600, color: "hsl(var(--b3))" }}>Ви</span>
          ) : (
            <span style={{ fontSize: 10, color: "hsl(37 50% 78%)", fontFamily: "var(--font-serif)", fontStyle: "italic" }}>б</span>
          )}
        </div>

        {/* Content block */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Name + time + response time */}
          <div style={{
            display: "flex",
            alignItems: "baseline",
            gap: 8,
            marginBottom: 4,
            flexWrap: "wrap" as const,
          }}>
            <span style={{
              fontSize: 12,
              fontWeight: 500,
              color: "hsl(var(--b2))",
            }}>
              {isUser ? "Ви" : "Бібліотечний асистент"}
            </span>
            {createdAt && (
              <span style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>
                {format(new Date(createdAt), "HH:mm")}
              </span>
            )}
            {!isUser && respLabel && (
              <span
                title="Час відповіді"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                  fontSize: 11,
                  color: "hsl(var(--muted-foreground))",
                  marginLeft: "auto",
                }}
              >
                <Clock style={{ width: 11, height: 11 }} />
                {respLabel}
              </span>
            )}
          </div>

          {/* Message body */}
          <div
            className={`prose-custom ${isStreaming ? "animate-pulse-subtle" : ""}`}
            style={{ fontSize: 14.5, lineHeight: 1.7 }}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content || ""}
            </ReactMarkdown>
            {isStreaming && (
              <span
                className="animate-cursor"
                style={{
                  display: "inline-block",
                  width: 2,
                  height: 16,
                  marginLeft: 2,
                  background: "hsl(var(--b3))",
                  borderRadius: 1,
                  verticalAlign: "text-bottom",
                }}
              />
            )}
          </div>

          {/* Follow-up chips */}
          {chips.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6, marginTop: 10 }}>
              {chips.map((chip) => (
                <button
                  key={chip}
                  onClick={() => onChipClick?.(chip)}
                  className="chip-sm"
                  data-testid={`chip-suggestion-${chip.slice(0, 20)}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    height: 28,
                    padding: "0 10px",
                    background: "transparent",
                    border: "0.5px solid hsl(var(--border))",
                    borderRadius: 999,
                    fontSize: 12,
                    color: "hsl(var(--b3))",
                    cursor: "pointer",
                    fontFamily: "var(--font-sans)",
                    whiteSpace: "nowrap",
                    transition: "all 0.12s",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = "hsl(37 35% 88%)";
                    (e.currentTarget as HTMLButtonElement).style.color = "hsl(var(--b1))";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                    (e.currentTarget as HTMLButtonElement).style.color = "hsl(var(--b3))";
                  }}
                >
                  {chip}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
