import { useState, useRef, useEffect } from "react";
import { SendHorizontal, StopCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop: () => void;
  disabled?: boolean;
  isStreaming?: boolean;
}

export function ChatInput({ onSend, onStop, disabled, isStreaming }: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || disabled) return;
    onSend(input);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-4">
      <form onSubmit={handleSubmit} className="relative group">
        <div className="
          relative flex items-end p-2 bg-background 
          border-2 border-border/60 rounded-2xl shadow-sm
          focus-within:border-primary/40 focus-within:ring-4 focus-within:ring-primary/5
          transition-all duration-300
        ">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about books, library services, or research help..."
            className="
              min-h-[56px] w-full resize-none bg-transparent border-0 
              focus-visible:ring-0 focus-visible:ring-offset-0 
              text-base py-4 px-4 placeholder:text-muted-foreground/70
            "
            rows={1}
            disabled={disabled || isStreaming}
          />
          
          <div className="pb-2 pr-2">
            {isStreaming ? (
              <Button
                type="button"
                onClick={onStop}
                size="icon"
                className="rounded-xl h-10 w-10 shrink-0 bg-destructive hover:bg-destructive/90 text-destructive-foreground transition-all duration-200"
              >
                <StopCircle className="w-5 h-5" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={!input.trim() || disabled}
                size="icon"
                className="rounded-xl h-10 w-10 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200 shadow-sm"
              >
                <SendHorizontal className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>
        
        <div className="mt-2 text-center">
          <p className="text-xs text-muted-foreground">
            AI can make mistakes. Please verify library information with official sources.
          </p>
        </div>
      </form>
    </div>
  );
}
