import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Clock, BookOpen, Calendar, UserPlus, Archive, Phone, Sparkles, User } from "lucide-react";
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
        padding: "16px 20px",
        background: isUser ? "transparent" : "transparent",
        borderBottom: "1px solid hsl(35 10% 92% / 0.5)",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", gap: 16 }}>

        {/* Avatar */}
        <div
          style={{
            flexShrink: 0,
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: isUser ? "hsl(32 45% 63%)" : "hsl(28 20% 12%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 4,
            flexDirection: "column" as const,
            boxShadow: "0 2px 8px hsla(0 0% 0% / 0.1)",
          }}
        >
          {isUser ? (
            <User style={{ width: 16, height: 16, color: "#fff" }} />
          ) : (
            <BookOpen style={{ width: 16, height: 16, color: "hsl(32 45% 63%)" }} />
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

          {/* Follow-up chips - Oval with icons */}
          {chips.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8, marginTop: 12 }}>
              {chips.map((chip) => {
                // Determine icon based on chip text
                const getIcon = () => {
                  const lower = chip.toLowerCase();
                  if (lower.includes("каталог") || lower.includes("пошук")) return <BookOpen style={{ width: 12, height: 12 }} />
                  if (lower.includes("графік") || lower.includes("робот")) return <Calendar style={{ width: 12, height: 12 }} />
                  if (lower.includes("записат") || lower.includes("читацьк")) return <UserPlus style={{ width: 12, height: 12 }} />
                  if (lower.includes("репозит")) return <Archive style={{ width: 12, height: 12 }} />
                  if (lower.includes("контакт") || lower.includes("зв'язат")) return <Phone style={{ width: 12, height: 12 }} />
                  return <Sparkles style={{ width: 12, height: 12 }} />
                }
                return (
                  <button
                    key={chip}
                    onClick={() => onChipClick?.(chip)}
                    className="chip-sm"
                    data-testid={`chip-suggestion-${chip.slice(0, 20)}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      height: 30,
                      padding: "0 12px",
                      background: "#fff",
                      border: "1px solid hsla(35 15% 70% / 0.25)",
                      borderRadius: 999,
                      fontSize: 12,
                      color: "hsl(var(--b2))",
                      cursor: "pointer",
                      fontFamily: "var(--font-sans)",
                      whiteSpace: "nowrap",
                      transition: "all 0.2s ease",
                      boxShadow: "0 1px 3px hsla(0 0% 0% / 0.04)",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = "hsl(35 30% 98%)";
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "hsla(32 50% 60% / 0.3)";
                      (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
                      (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 3px 8px hsla(0 0% 0% / 0.08)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = "#fff";
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "hsla(35 15% 70% / 0.25)";
                      (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
                      (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 1px 3px hsla(0 0% 0% / 0.04)";
                    }}
                  >
                    <span style={{ color: "hsl(32 50% 54%)", display: "flex" }}>{getIcon()}</span>
                    {chip}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
