import { cn } from "@/lib/utils";
import { useConversations, useDeleteConversation, useCreateConversation } from "@/hooks/use-chat";
import { Plus, MessageSquare, Trash2, ExternalLink } from "lucide-react";
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
        background: "hsl(25 54% 11%)",
        borderRight: "1px solid hsl(25 50% 8%)",
      }}
    >
      {/* Header */}
      <div style={{ padding: "16px", borderBottom: "1px solid hsl(25 40% 18%)" }}>
        <p style={{
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "hsl(29 30% 50%)",
          marginBottom: 10,
        }}>
          Історія
        </p>

        <button
          onClick={handleNewChat}
          disabled={createMutation.isPending}
          data-testid="button-new-conversation"
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 8,
            height: 36,
            padding: "0 12px",
            background: "hsl(25 40% 18%)",
            border: "1px solid hsl(25 30% 28%)",
            borderRadius: 8,
            color: "hsl(37 50% 78%)",
            fontSize: 13,
            fontFamily: "var(--font-sans)",
            cursor: "pointer",
            transition: "all 0.12s",
          }}
        >
          <Plus style={{ width: 14, height: 14 }} />
          {createMutation.isPending ? "Створення..." : "Нова розмова"}
        </button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin py-2 px-2 space-y-0.5">
        {isLoading ? (
          <div style={{ padding: "24px 8px", textAlign: "center", fontSize: 12, color: "hsl(29 30% 50%)" }}>
            Завантаження...
          </div>
        ) : conversations?.length === 0 ? (
          <div style={{ padding: "24px 8px", textAlign: "center" }}>
            <p style={{ fontSize: 12, color: "hsl(29 30% 50%)" }}>Ще немає розмов.</p>
          </div>
        ) : (
          conversations?.map((conv) => {
            const isActive = location === `/chat/${conv.id}`;
            return (
              <Link key={conv.id} href={`/chat/${conv.id}`} className="block">
                <div
                  data-testid={`conv-item-${conv.id}`}
                  className="group relative"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 10px",
                    borderRadius: 7,
                    cursor: "pointer",
                    background: isActive ? "hsl(25 40% 18%)" : "transparent",
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={e => {
                    if (!isActive) (e.currentTarget as HTMLDivElement).style.background = "hsl(25 35% 16%)";
                  }}
                  onMouseLeave={e => {
                    if (!isActive) (e.currentTarget as HTMLDivElement).style.background = "transparent";
                  }}
                >
                  <MessageSquare style={{
                    width: 14,
                    height: 14,
                    flexShrink: 0,
                    color: isActive ? "hsl(37 50% 75%)" : "hsl(29 20% 40%)",
                  }} />

                  <div style={{
                    flex: 1,
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontSize: 13,
                    color: isActive ? "hsl(37 50% 85%)" : "hsl(37 30% 60%)",
                    paddingRight: 24,
                  }}>
                    {conv.title || "Без назви"}
                  </div>

                  {conv.createdAt && (
                    <span style={{
                      fontSize: 10,
                      color: "hsl(29 20% 38%)",
                      flexShrink: 0,
                    }}>
                      {format(new Date(conv.createdAt), "d MMM")}
                    </span>
                  )}

                  <div className="opacity-0 group-hover:opacity-100 absolute right-2 top-1/2 -translate-y-1/2 transition-opacity z-10">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          data-testid={`button-delete-conv-${conv.id}`}
                          style={{
                            padding: "4px",
                            borderRadius: 4,
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            color: "hsl(0 60% 60%)",
                          }}
                        >
                          <Trash2 style={{ width: 13, height: 13 }} />
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

      {/* Footer */}
      <div style={{ padding: "12px", borderTop: "1px solid hsl(25 40% 18%)" }}>
        {[
          { label: "Офіційний сайт", href: "https://lib-hdak.in.ua/" },
          { label: "Електронний каталог", href: "https://library-service.com.ua:8443/khkhdak/DocumentSearchForm" },
        ].map(({ label, href }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 8px",
              fontSize: 11.5,
              color: "hsl(29 25% 45%)",
              textDecoration: "none",
              borderRadius: 6,
              transition: "color 0.12s",
            }}
          >
            <ExternalLink style={{ width: 11, height: 11, flexShrink: 0 }} />
            {label}
          </a>
        ))}
      </div>
    </div>
  );
}
