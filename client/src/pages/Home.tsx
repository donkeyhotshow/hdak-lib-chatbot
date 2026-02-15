import { Button } from "@/components/ui/button";
import { useCreateConversation } from "@/hooks/use-chat";
import { useLocation } from "wouter";
import { Library, Search, BookOpen, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  const [_, setLocation] = useLocation();
  const createMutation = useCreateConversation();

  const handleStartChat = () => {
    createMutation.mutate(undefined, {
      onSuccess: (newConv) => {
        setLocation(`/chat/${newConv.id}`);
      }
    });
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 text-center max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-8"
      >
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
          <div className="relative bg-white p-6 rounded-3xl shadow-xl shadow-primary/10 border border-border">
            <Library className="w-16 h-16 text-primary" />
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground tracking-tight">
            HDAK Library Assistant
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-lg mx-auto">
            Your AI-powered guide to the library catalog, resources, and services. Ask questions, find books, and explore our collection.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          <div className="p-4 bg-white rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow">
            <Search className="w-6 h-6 text-primary mb-3" />
            <h3 className="font-semibold text-foreground mb-1">Catalog Search</h3>
            <p className="text-sm text-muted-foreground">Find books and materials in our electronic catalog.</p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow">
            <BookOpen className="w-6 h-6 text-primary mb-3" />
            <h3 className="font-semibold text-foreground mb-1">Library Guide</h3>
            <p className="text-sm text-muted-foreground">Learn about library rules, hours, and services.</p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow">
            <MessageCircle className="w-6 h-6 text-primary mb-3" />
            <h3 className="font-semibold text-foreground mb-1">Research Help</h3>
            <p className="text-sm text-muted-foreground">Get assistance with finding academic resources.</p>
          </div>
        </div>

        <div className="pt-4">
          <Button 
            size="lg"
            onClick={handleStartChat}
            disabled={createMutation.isPending}
            className="
              h-14 px-8 text-lg rounded-2xl shadow-lg shadow-primary/25
              bg-primary hover:bg-primary/90 hover:-translate-y-0.5
              transition-all duration-300
            "
          >
            {createMutation.isPending ? "Creating..." : "Start Conversation"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
