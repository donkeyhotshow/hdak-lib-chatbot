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
      onSuccess: (newConv) => setLocation(`/chat/${newConv.id}`),
    });
  };

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    deleteMutation.mutate(id, {
      onSuccess: () => {
        if (location === `/chat/${id}`) setLocation("/");
      },
    });
  };

  return (
    <div className={cn("flex flex-col h-full bg-muted/50 border-r border-border", className)}>

      {/* Header */}
      <div className="p-4 border-b border-border/40">
        <Link href="/" className="flex items-center gap-2 px-2 py-3 mb-4 group cursor-pointer">
          <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform duration-200">
            <Library className="w-4 h-4" />
          </div>
          <span className="font-serif font-bold text-lg text-primary tracking-tight">HDAK Library</span>
        </Link>

        <Button
          onClick={handleNewChat}
          disabled={createMutation.isPending}
          data-testid="button-new-conversation"
          className="w-full justify-start gap-2 h-11 shadow-sm bg-white hover:bg-white/70 text-foreground border border-border/60"
          variant="outline"
        >
          <Plus className="w-4 h-4" />
          {createMutation.isPending ? "Створення..." : "Нова розмова"}
        </Button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-thin">
        {isLoading ? (
          <div className="text-center py-8 text-sm text-muted-foreground animate-pulse">
            Завантаження...
          </div>
        ) : conversations?.length === 0 ? (
          <div className="text-center py-8 px-4">
            <p className="text-sm text-muted-foreground mb-1">Ще немає розмов.</p>
            <p className="text-xs text-muted-foreground/60">Розпочніть нову розмову для пошуку в каталозі.</p>
          </div>
        ) : (
          conversations?.map((conv) => {
            const isActive = location === `/chat/${conv.id}`;
            return (
              <Link key={conv.id} href={`/chat/${conv.id}`} className="block">
                <div
                  data-testid={`conv-item-${conv.id}`}
                  className={cn(
                    "group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 cursor-pointer",
                    isActive
                      ? "bg-white text-primary font-medium shadow-sm border border-border/50"
                      : "text-muted-foreground hover:bg-white/60 hover:text-foreground"
                  )}
                >
                  <MessageSquare className={cn(
                    "w-4 h-4 shrink-0",
                    isActive ? "text-primary" : "text-muted-foreground/60"
                  )} />

                  <div className="flex-1 min-w-0 truncate pr-6">
                    {conv.title || "Без назви"}
                  </div>

                  {conv.createdAt && (
                    <span className={cn(
                      "text-[10px] shrink-0 tabular-nums",
                      isActive ? "text-primary/50" : "text-muted-foreground/40"
                    )}>
                      {format(new Date(conv.createdAt), "d MMM")}
                    </span>
                  )}

                  <div className="opacity-0 group-hover:opacity-100 absolute right-2 top-1/2 -translate-y-1/2 transition-opacity z-10">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          data-testid={`button-delete-conv-${conv.id}`}
                          className="p-1.5 rounded-md hover:bg-destructive/10 hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Видалити розмову?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Цю дію не можна скасувати. Всю историю розмови буде видалено.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Скасувати</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={(e) => handleDelete(e, conv.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Видалити
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

      {/* Footer links */}
      <div className="p-4 border-t border-border/40 bg-muted/30 space-y-1">
        <a
          href="https://lib-hdak.in.ua/"
          target="_blank"
          rel="noopener noreferrer"
          data-testid="link-library-website"
          className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-primary transition-colors p-2 rounded-md hover:bg-white/60"
        >
          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
          Офіційний сайт бібліотеки
        </a>
        <a
          href="https://library-service.com.ua:8443/khkhdak/DocumentSearchForm"
          target="_blank"
          rel="noopener noreferrer"
          data-testid="link-catalog"
          className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-primary transition-colors p-2 rounded-md hover:bg-white/60"
        >
          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
          Електронний каталог
        </a>
      </div>
    </div>
  );
}
