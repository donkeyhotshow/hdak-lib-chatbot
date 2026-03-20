import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useConversations, useDeleteConversation, useCreateConversation } from "@/hooks/use-chat";
import { Plus, MessageSquare, Trash2, BookMarked, ExternalLink } from "lucide-react";
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
    <div className={cn("flex flex-col h-full wood-panel spine-divider", className)}>

      {/* ── Logo / Header ── dark wood header zone */}
      <div className="wood-panel-mid px-5 py-5 border-b border-amber-900/30">
        <Link href="/" className="flex items-center gap-3 group cursor-pointer mb-5">
          <div className="w-9 h-9 rounded-lg bg-amber-700/80 border border-amber-600/50 flex items-center justify-center shadow-lg group-hover:bg-amber-600/90 transition-colors">
            <BookMarked className="w-5 h-5 text-amber-100" />
          </div>
          <div>
            <p className="font-serif font-bold text-base text-amber-100 leading-tight tracking-wide">ХДАК</p>
            <p className="text-[10px] text-amber-400/70 uppercase tracking-widest leading-none font-medium">Наукова бібліотека</p>
          </div>
        </Link>

        {/* New chat button */}
        <button
          onClick={handleNewChat}
          disabled={createMutation.isPending}
          data-testid="button-new-conversation"
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg
            bg-amber-800/40 hover:bg-amber-700/50 border border-amber-700/40 hover:border-amber-600/50
            text-amber-200 hover:text-amber-100 text-sm font-medium
            transition-all duration-200 disabled:opacity-50"
        >
          <Plus className="w-4 h-4 shrink-0" />
          {createMutation.isPending ? "Створення..." : "Нова розмова"}
        </button>
      </div>

      {/* ── Conversation list ── */}
      <div className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5 scrollbar-wood">
        {isLoading ? (
          <div className="py-8 text-center">
            <p className="text-xs text-amber-500/60 animate-pulse">Завантаження...</p>
          </div>
        ) : conversations?.length === 0 ? (
          <div className="py-10 px-4 text-center">
            <MessageSquare className="w-8 h-8 text-amber-700/50 mx-auto mb-3" />
            <p className="text-xs text-amber-500/60 leading-relaxed">
              Почніть нову розмову, щоб переглянути бібліотечний каталог
            </p>
          </div>
        ) : (
          conversations?.map((conv) => {
            const isActive = location === `/chat/${conv.id}`;
            const dateStr = conv.createdAt
              ? format(new Date(conv.createdAt), "d MMM")
              : "";

            return (
              <Link key={conv.id} href={`/chat/${conv.id}`} className="block">
                <div
                  data-testid={`conv-item-${conv.id}`}
                  className={cn(
                    "group relative flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 cursor-pointer",
                    isActive
                      ? "bg-amber-800/60 border border-amber-700/50 text-amber-100"
                      : "text-amber-300/70 hover:bg-amber-900/50 hover:text-amber-200"
                  )}
                >
                  <MessageSquare className={cn(
                    "w-3.5 h-3.5 shrink-0",
                    isActive ? "text-amber-300" : "text-amber-600/60"
                  )} />

                  <div className="flex-1 min-w-0">
                    <p className="truncate leading-snug pr-5">
                      {conv.title || "Без назви"}
                    </p>
                    {dateStr && (
                      <p className={cn(
                        "text-[10px] mt-0.5",
                        isActive ? "text-amber-400/70" : "text-amber-700/60"
                      )}>
                        {dateStr}
                      </p>
                    )}
                  </div>

                  {/* Delete */}
                  <div className="opacity-0 group-hover:opacity-100 absolute right-2 top-1/2 -translate-y-1/2 transition-opacity z-10">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          data-testid={`button-delete-conv-${conv.id}`}
                          className="p-1.5 rounded-md hover:bg-red-900/40 hover:text-red-300 text-amber-600/60 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Видалити розмову?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Це незворотно видалить всю историю розмови.
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

      {/* ── Footer links ── slightly lighter wood */}
      <div className="wood-panel-mid px-4 py-4 border-t border-amber-900/30 space-y-1">
        <a
          href="https://lib-hdak.in.ua/"
          target="_blank"
          rel="noopener noreferrer"
          data-testid="link-library-website"
          className="flex items-center gap-2 text-xs text-amber-500/70 hover:text-amber-300 transition-colors px-2 py-1.5 rounded-md hover:bg-amber-900/30"
        >
          <ExternalLink className="w-3 h-3 shrink-0" />
          Офіційний сайт бібліотеки
        </a>
        <a
          href="https://library-service.com.ua:8443/khkhdak/DocumentSearchForm"
          target="_blank"
          rel="noopener noreferrer"
          data-testid="link-catalog"
          className="flex items-center gap-2 text-xs text-amber-500/70 hover:text-amber-300 transition-colors px-2 py-1.5 rounded-md hover:bg-amber-900/30"
        >
          <ExternalLink className="w-3 h-3 shrink-0" />
          Електронний каталог
        </a>
      </div>
    </div>
  );
}
