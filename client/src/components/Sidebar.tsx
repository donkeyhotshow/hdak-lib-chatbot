import { cn } from "@/lib/utils";
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
    <div
      className={cn("flex flex-col h-full", className)}
      style={{
        background: "hsl(var(--brown-100))",
        borderRight: "1px solid hsl(var(--brown-200))",
      }}
    >
      {/* Header */}
      <div
        className="p-4"
        style={{ borderBottom: "1px solid hsl(var(--brown-200))" }}
      >
        <Link href="/" className="flex items-center gap-2.5 px-2 py-3 mb-4 group cursor-pointer">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-200"
            style={{
              background: "hsl(var(--brown-700))",
              color: "hsl(var(--brown-50))",
            }}
          >
            <Library className="w-4.5 h-4.5" />
          </div>
          <span className="font-serif font-bold text-lg tracking-tight" style={{ color: "hsl(var(--brown-800))" }}>
            HDAK Library
          </span>
        </Link>

        <button
          onClick={handleNewChat}
          disabled={createMutation.isPending}
          data-testid="button-new-conversation"
          className="
            w-full flex items-center justify-center gap-2 h-11 rounded-xl
            text-sm font-medium
            border transition-all duration-150
            shadow-sm hover:shadow-md
            disabled:opacity-60 disabled:cursor-not-allowed
          "
          style={{
            background: "hsl(var(--brown-700))",
            borderColor: "hsl(var(--brown-600))",
            color: "hsl(var(--brown-50))",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "hsl(var(--brown-600))";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "hsl(var(--brown-700))";
          }}
        >
          <Plus className="w-4 h-4" />
          {createMutation.isPending ? "Створення..." : "Нова розмова"}
        </button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1 scrollbar-thin">
        {isLoading ? (
          <div
            className="text-center py-8 text-sm animate-pulse"
            style={{ color: "hsl(var(--brown-500))" }}
          >
            Завантаження...
          </div>
        ) : conversations?.length === 0 ? (
          <div className="text-center py-8 px-4">
            <p className="text-sm mb-1" style={{ color: "hsl(var(--brown-600))" }}>Ще немає розмов.</p>
            <p className="text-xs" style={{ color: "hsl(var(--brown-400))" }}>Розпочніть нову розмову для пошуку в каталозі.</p>
          </div>
        ) : (
          conversations?.map((conv) => {
            const isActive = location === `/chat/${conv.id}`;
            return (
              <Link key={conv.id} href={`/chat/${conv.id}`} className="block">
                <div
                  data-testid={`conv-item-${conv.id}`}
                  className="group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 cursor-pointer"
                  style={{
                    background: isActive ? "hsl(var(--brown-50))" : "transparent",
                    border: isActive ? "1px solid hsl(var(--brown-300))" : "1px solid transparent",
                    boxShadow: isActive ? "0 1px 4px rgb(92 58 30 / 0.1)" : "none",
                    color: isActive ? "hsl(var(--brown-800))" : "hsl(var(--brown-600))",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLDivElement).style.background = "hsl(var(--brown-200) / 0.5)";
                      (e.currentTarget as HTMLDivElement).style.color = "hsl(var(--brown-800))";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLDivElement).style.background = "transparent";
                      (e.currentTarget as HTMLDivElement).style.color = "hsl(var(--brown-600))";
                    }
                  }}
                >
                  <MessageSquare
                    className="w-4 h-4 shrink-0"
                    style={{ color: isActive ? "hsl(var(--brown-500))" : "hsl(var(--brown-400))" }}
                  />

                  <div className="flex-1 min-w-0 truncate pr-6 font-medium">
                    {conv.title || "Без назви"}
                  </div>

                  {conv.createdAt && (
                    <span
                      className="text-[10px] shrink-0 tabular-nums"
                      style={{ color: isActive ? "hsl(var(--brown-400))" : "hsl(var(--brown-400))" }}
                    >
                      {format(new Date(conv.createdAt), "d MMM")}
                    </span>
                  )}

                  <div className="opacity-0 group-hover:opacity-100 absolute right-2 top-1/2 -translate-y-1/2 transition-opacity z-10">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          data-testid={`button-delete-conv-${conv.id}`}
                          className="p-1.5 rounded-md transition-colors"
                          style={{ color: "hsl(var(--brown-400))" }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.background = "hsl(239 68 68 / 0.1)";
                            (e.currentTarget as HTMLButtonElement).style.color = "hsl(239 68 68)";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                            (e.currentTarget as HTMLButtonElement).style.color = "hsl(var(--brown-400))";
                          }}
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
      <div
        className="p-4 space-y-1"
        style={{
          borderTop: "1px solid hsl(var(--brown-200))",
          background: "hsl(var(--brown-200) / 0.4)",
        }}
      >
        {[
          { href: "https://lib-hdak.in.ua/", label: "Офіційний сайт бібліотеки", testid: "link-library-website" },
          { href: "https://library-service.com.ua:8443/khkhdak/DocumentSearchForm", label: "Електронний каталог", testid: "link-catalog" },
        ].map(({ href, label, testid }) => (
          <a
            key={href}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            data-testid={testid}
            className="flex items-center gap-2 text-xs font-medium p-2 rounded-lg transition-all duration-150"
            style={{ color: "hsl(var(--brown-600))" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = "hsl(var(--brown-200))";
              (e.currentTarget as HTMLAnchorElement).style.color = "hsl(var(--brown-800))";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
              (e.currentTarget as HTMLAnchorElement).style.color = "hsl(var(--brown-600))";
            }}
          >
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            {label}
          </a>
        ))}
      </div>
    </div>
  );
}
