import { useEffect, useRef } from "react";
import { useParams } from "wouter";
import { useConversation, useChatStream } from "@/hooks/use-chat";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Chat() {
  const params = useParams();
  const id = params.id ? parseInt(params.id) : null;
  
  const { data: conversation, isLoading, error, refetch } = useConversation(id);
  const { sendMessage, isStreaming, streamedContent, stopStream } = useChatStream(id);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversation?.messages, streamedContent]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (error || !conversation) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 text-center p-8">
        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Failed to load conversation</h2>
          <p className="text-muted-foreground mt-2">The conversation might have been deleted or doesn't exist.</p>
        </div>
        <Button onClick={() => refetch()} variant="outline">Try Again</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background relative">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scroll-smooth">
        <div className="min-h-full pb-32">
          {/* Welcome Message Empty State */}
          {conversation.messages.length === 0 && (
            <div className="max-w-3xl mx-auto px-4 py-12 text-center space-y-4">
              <h2 className="text-2xl font-serif font-bold text-primary">
                {conversation.title || "New Conversation"}
              </h2>
              <p className="text-muted-foreground">
                Hello! I'm the HDAK Library Assistant. How can I help you today?
              </p>
            </div>
          )}

          {/* Message List */}
          {conversation.messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              role={msg.role as "user" | "assistant"}
              content={msg.content}
              createdAt={msg.createdAt}
            />
          ))}

          {/* Streaming Message Placeholder */}
          {isStreaming && (
            <ChatMessage
              role="assistant"
              content={streamedContent}
              isStreaming={true}
            />
          )}
          
          <div ref={scrollRef} className="h-4" />
        </div>
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background to-transparent pt-10 pb-2">
        <ChatInput 
          onSend={sendMessage} 
          onStop={stopStream}
          isStreaming={isStreaming}
        />
      </div>
    </div>
  );
}
