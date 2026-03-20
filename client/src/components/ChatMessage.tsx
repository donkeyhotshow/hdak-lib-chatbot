import { memo } from "react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, User } from "lucide-react";
import { format } from "date-fns";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  createdAt?: Date | string | null;
  isStreaming?: boolean;
}

export const ChatMessage = memo(function ChatMessage({
  role,
  content,
  createdAt,
  isStreaming,
}: ChatMessageProps) {
  const isUser = role === "user";

  const timeStr = createdAt
    ? format(new Date(createdAt), "HH:mm")
    : undefined;

  return (
    <div
      className={cn(
        "w-full animate-fade-up",
        isUser
          ? "parchment-bg border-b border-amber-200/50"
          : "parchment-dark-bg border-b border-amber-200/60"
      )}
    >
      <div className="max-w-3xl mx-auto px-5 py-6 flex gap-5">
        {/* Avatar */}
        <div className={cn(
          "shrink-0 w-9 h-9 rounded-xl flex items-center justify-center border shadow-sm mt-0.5",
          isUser
            ? "bg-amber-100 border-amber-300/60 text-amber-800"
            : "bg-amber-800 border-amber-700 text-amber-100"
        )}>
          {isUser
            ? <User className="w-4 h-4" />
            : <Bot className="w-4 h-4" />
          }
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-baseline gap-2">
            <span className={cn(
              "text-sm font-semibold",
              isUser ? "text-amber-900" : "text-amber-800"
            )}>
              {isUser ? "Ви" : "Бібліотечний асистент"}
            </span>
            {timeStr && (
              <span className="text-[11px] text-amber-600/50">{timeStr}</span>
            )}
          </div>

          <div className={cn(
            "prose-custom text-[15px] leading-relaxed",
            isStreaming && "animate-pulse-subtle"
          )}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content || (isStreaming ? "…" : "")}
            </ReactMarkdown>
            {isStreaming && (
              <span className="inline-block w-1.5 h-4 ml-0.5 bg-amber-700/60 animate-cursor rounded-sm" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
