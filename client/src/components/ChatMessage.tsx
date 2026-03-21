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

  return (
    <div className={cn(
      "group w-full px-4 py-5 transition-colors duration-150 animate-bubble-in",
      isUser
        ? "bg-transparent"
        : "border-y"
    )}
      style={isUser ? {} : {
        backgroundColor: "hsl(var(--brown-50))",
        borderColor: "hsl(var(--brown-200) / 0.6)",
      }}
    >
      <div className="max-w-3xl mx-auto flex gap-4">

        {/* Avatar */}
        {isUser ? (
          <div
            className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center shadow-sm border mt-0.5"
            style={{
              background: "hsl(var(--brown-100))",
              borderColor: "hsl(var(--brown-300))",
              color: "hsl(var(--brown-700))",
            }}
          >
            <User className="w-4 h-4" />
          </div>
        ) : (
          <div
            className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center shadow-md mt-0.5"
            style={{
              background: "hsl(var(--brown-700))",
              color: "hsl(var(--brown-50))",
            }}
          >
            <Bot className="w-4 h-4" />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 space-y-1.5 min-w-0">
          <div className="flex items-baseline gap-2">
            <span
              className="font-semibold text-sm"
              style={{ color: isUser ? "hsl(var(--brown-800))" : "hsl(var(--brown-700))" }}
            >
              {isUser ? "Ви" : "Бібліотечний асистент"}
            </span>
            {createdAt && (
              <span className="text-xs" style={{ color: "hsl(var(--brown-400))" }}>
                {format(new Date(createdAt), "HH:mm")}
              </span>
            )}
          </div>

          <div className={cn(
            "prose-custom max-w-none text-[15px] leading-relaxed",
            isStreaming && "animate-pulse-subtle"
          )}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content || ""}
            </ReactMarkdown>
            {isStreaming && (
              <span
                className="inline-block w-1.5 h-4 ml-0.5 animate-cursor rounded-sm"
                style={{ background: "hsl(var(--brown-500) / 0.6)" }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
