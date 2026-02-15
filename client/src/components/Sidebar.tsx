import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useConversations, useDeleteConversation, useCreateConversation } from "@/hooks/use-chat";
import { Plus, MessageSquare, Trash2, Library, ExternalLink } from "lucide-react";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function Sidebar({ className }: { className?: string }) {
  const [location, setLocation] = useLocation();
  const { data: conversations, isLoading } = useConversations();
  const deleteMutation = useDeleteConversation();
  const createMutation = useCreateConversation();

  const handleNewChat = () => {
    createMutation.mutate(undefined, {
      onSuccess: (newConv) => {
        setLocation(`/chat/${newConv.id}`);
      }
    });
  };

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    deleteMutation.mutate(id, {
      onSuccess: () => {
        if (location === `/chat/${id}`) {
          setLocation("/");
        }
      }
    });
  };

  return (
    <div className={cn("flex flex-col h-full bg-muted/50 border-r border-border", className)}>
      {/* Header */}
      <div className="p-4 border-b border-border/40">
        <Link href="/" className="flex items-center gap-2 px-2 py-3 mb-4 group cursor-pointer">
          <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform duration-300">
            <Library className="w-4 h-4" />
          </div>
          <span className="font-serif font-bold text-lg text-primary tracking-tight">HDAK Library</span>
        </Link>
        
        <Button 
          onClick={handleNewChat} 
          disabled={createMutation.isPending}
          className="w-full justify-start gap-2 h-11 shadow-sm bg-white hover:bg-white/50 text-foreground border border-border/60"
          variant="outline"
        >
          {createMutation.isPending ? (
            <span className="animate-spin mr-2">⏳</span>
          ) : (
            <Plus className="w-4 h-4" />
          )}
          New Conversation
        </Button>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-thin">
        {isLoading ? (
          <div className="text-center py-8 text-sm text-muted-foreground animate-pulse">
            Loading history...
          </div>
        ) : conversations?.length === 0 ? (
          <div className="text-center py-8 px-4">
            <p className="text-sm text-muted-foreground mb-2">No conversations yet.</p>
            <p className="text-xs text-muted-foreground/70">Start a new chat to begin exploring the library catalog.</p>
          </div>
        ) : (
          conversations?.map((conv) => {
            const isActive = location === `/chat/${conv.id}`;
            return (
              <Link key={conv.id} href={`/chat/${conv.id}`} className="block">
                <div className={cn(
                  "group relative flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-all duration-200 cursor-pointer",
                  isActive 
                    ? "bg-white text-primary font-medium shadow-sm border border-border/50" 
                    : "text-muted-foreground hover:bg-white/50 hover:text-foreground"
                )}>
                  <MessageSquare className={cn(
                    "w-4 h-4 shrink-0 transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground/70"
                  )} />
                  
                  <div className="flex-1 truncate pr-6">
                    {conv.title || "Untitled Conversation"}
                  </div>

                  <div className="opacity-0 group-hover:opacity-100 absolute right-2 top-1/2 -translate-y-1/2 transition-opacity">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button 
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 rounded-md hover:bg-destructive/10 hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the conversation history.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={(e) => handleDelete(e, conv.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* Footer Links */}
      <div className="p-4 border-t border-border/40 bg-muted/30">
        <div className="space-y-2">
          <a 
            href="https://lib-hdak.in.ua/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-primary transition-colors p-2 rounded-md hover:bg-white/50"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Library Website
          </a>
          <a 
            href="https://library-service.com.ua:8443/khkhdak/DocumentSearchForm" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-primary transition-colors p-2 rounded-md hover:bg-white/50"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Electronic Catalog
          </a>
        </div>
      </div>
    </div>
  );
}
