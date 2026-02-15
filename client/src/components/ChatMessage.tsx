import { cn } from "@/lib/utils";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, User } from "lucide-react";
import { format } from "date-fns";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  createdAt?: Date | string;
  isStreaming?: boolean;
}

export function ChatMessage({ role, content, createdAt, isStreaming }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div className={cn(
      "group w-full py-8 px-4 transition-colors duration-200",
      isUser ? "bg-transparent" : "bg-muted/30 border-y border-border/40"
    )}>
      <div className="max-w-3xl mx-auto flex gap-6">
        {/* Avatar */}
        <div className={cn(
          "shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border",
          isUser 
            ? "bg-white border-border text-foreground" 
            : "bg-primary text-primary-foreground border-primary"
        )}>
          {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
        </div>

        {/* Content */}
        <div className="flex-1 space-y-2 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-foreground">
              {isUser ? "You" : "Library Assistant"}
            </span>
            {createdAt && (
              <span className="text-xs text-muted-foreground">
                {format(new Date(createdAt), "p")}
              </span>
            )}
          </div>
          
          <div className={cn(
            "prose-custom max-w-none text-base",
            isStreaming && "animate-pulse-subtle"
          )}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
            {isStreaming && <span className="inline-block w-2 h-4 ml-1 bg-primary/50 animate-pulse" />}
          </div>
        </div>
      </div>
    </div>
  );
}
