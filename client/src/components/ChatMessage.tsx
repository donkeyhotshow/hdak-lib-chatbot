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
      "group w-full py-7 px-4 transition-colors duration-150",
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
        <div className="flex-1 space-y-1.5 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-sm text-foreground">
              {isUser ? "Ви" : "Бібліотечний асистент"}
            </span>
            {createdAt && (
              <span className="text-xs text-muted-foreground">
                {format(new Date(createdAt), "HH:mm")}
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
        </div>
      </div>
    </div>
  );
});
