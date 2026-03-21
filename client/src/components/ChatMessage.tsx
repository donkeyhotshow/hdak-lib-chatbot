import { memo } from "react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, User, Clock } from "lucide-react";
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

// ── Client-side chip generator ─────────────────────────────────────────────
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
    chips.push("Як зв'язатися з бібліотекою?");
  if (lower.includes("електрон") || lower.includes("онлайн"))
    chips.push("Електронні ресурси бібліотеки");

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
    ? responseMs < 1000
      ? `${responseMs}мс`
      : `${(responseMs / 1000).toFixed(1)}с`
    : null;

  return (
    <div className={cn(
      "group w-full py-6 px-4 transition-colors duration-150",
      isUser ? "bg-transparent" : "bg-muted/30 border-y border-border/40"
    )}>
      <div className="max-w-3xl mx-auto flex gap-5">

        {/* Avatar */}
        <div className={cn(
          "shrink-0 w-9 h-9 rounded-xl flex items-center justify-center shadow-sm border mt-0.5",
          isUser
            ? "bg-white border-border text-foreground"
            : "bg-primary text-primary-foreground border-primary/80"
        )}>
          {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        </div>

        {/* Content */}
        <div className="flex-1 space-y-2 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-semibold text-sm text-foreground">
              {isUser ? "Ви" : "Бібліотечний асистент"}
            </span>
            {createdAt && (
              <span className="text-xs text-muted-foreground">
                {format(new Date(createdAt), "HH:mm")}
              </span>
            )}
            {!isUser && respLabel && (
              <span
                className="flex items-center gap-1 text-xs text-muted-foreground/70 ml-auto"
                title="Час відповіді"
              >
                <Clock className="w-3 h-3" />
                {respLabel}
              </span>
            )}
          </div>

          <div className={cn(
            "prose-custom max-w-none text-[15px]",
            isStreaming && "animate-pulse-subtle"
          )}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content || (isStreaming ? "" : "")}
            </ReactMarkdown>
            {isStreaming && (
              <span className="inline-block w-1.5 h-4 ml-0.5 bg-primary/50 animate-cursor rounded-sm" />
            )}
          </div>

          {/* Contextual follow-up chips */}
          {chips.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {chips.map((chip) => (
                <button
                  key={chip}
                  onClick={() => onChipClick?.(chip)}
                  className="
                    px-3 py-1 text-xs rounded-full border border-border/70
                    bg-background hover:bg-muted/60 text-muted-foreground
                    hover:text-foreground transition-colors duration-150
                    whitespace-nowrap
                  "
                  data-testid={`chip-suggestion-${chip.slice(0, 20)}`}
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
