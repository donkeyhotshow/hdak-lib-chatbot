import { cn } from "@/lib/utils";
import { useConversations, useDeleteConversation, useCreateConversation } from "@/hooks/use-chat";
import { Plus, MessageSquare, Trash2, ExternalLink, BookOpen, Search } from "lucide-react";
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
        background: "linear-gradient(180deg, hsl(var(--dark-bg)) 0%, hsl(25 54% 5%) 100%)",
        borderRight: "1px solid hsl(var(--dark-border))",
      }}
    >
      {/* Header */}
      <div style={{ 
        padding: "20px 16px 16px", 
        borderBottom: "1px solid hsl(25 40% 12%)",
        background: "linear-gradient(180deg, hsl(25 48% 10%) 0%, transparent 100%)",
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 14,
        }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "linear-gradient(135deg, hsl(37 45% 25%) 0%, hsl(25 50% 15%) 100%)",
            border: "1px solid hsl(25 35% 20%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)",
          }}>
            <BookOpen style={{ width: 18, height: 18, color: "hsl(37 50% 75%)" }} />
          </div>
          <div>
            <p style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "hsl(37 45% 65%)",
              fontFamily: "var(--font-serif)",
            }}>
              Бібліотека ХДАК
            </p>
            <p style={{
              fontSize: 9,
              color: "hsl(29 20% 35%)",
              letterSpacing: "0.1em",
              marginTop: 2,
            }}>
              Асистент
            </p>
          </div>
        </div>

        <button
          onClick={handleNewChat}
          disabled={createMutation.isPending}
          data-testid="button-new-conversation"
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            height: 40,
            background: "linear-gradient(135deg, hsl(25 50% 18%) 0%, hsl(25 45% 14%) 100%)",
            border: "1px solid hsl(25 35% 22%)",
            borderRadius: 10,
            color: "hsl(37 50% 82%)",
            fontSize: 13,
            fontWeight: 500,
            fontFamily: "var(--font-sans)",
            cursor: createMutation.isPending ? "not-allowed" : "pointer",
            transition: "all 0.2s ease",
            boxShadow: "0 2px 6px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.03)",
          }}
          onMouseEnter={e => {
            if (!createMutation.isPending) {
              (e.currentTarget as HTMLButtonElement).style.background = "linear-gradient(135deg, hsl(25 50% 22%) 0%, hsl(25 45% 18%) 100%)";
              (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
            }
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = "linear-gradient(135deg, hsl(25 50% 18%) 0%, hsl(25 45% 14%) 100%)";
            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";
          }}
        >
          <Plus style={{ width: 16, height: 16 }} />
          {createMutation.isPending ? "Створення..." : "Нова розмова"}
        </button>
      </div>

      {/* Search hint */}
      <div style={{
        padding: "12px 16px 8px",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}>
        <Search style={{ width: 12, height: 12, color: "hsl(29 20% 30%)" }} />
        <span style={{
          fontSize: 10,
          color: "hsl(29 20% 35%)",
          letterSpacing: "0.05em",
        }}>
          Ваші розмови
        </span>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin py-1 px-2 space-y-1">
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
                    gap: 10,
                    padding: "10px 12px",
                    borderRadius: 8,
                    cursor: "pointer",
                    background: isActive ? "linear-gradient(135deg, hsl(25 50% 18%) 0%, hsl(25 45% 14%) 100%)" : "transparent",
                    border: isActive ? "1px solid hsl(25 35% 20%)" : "1px solid transparent",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      (e.currentTarget as HTMLDivElement).style.background = "hsl(25 45% 12%)";
                      (e.currentTarget as HTMLDivElement).style.borderColor = "hsl(25 35% 18%)";
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      (e.currentTarget as HTMLDivElement).style.background = "transparent";
                      (e.currentTarget as HTMLDivElement).style.borderColor = "transparent";
                    }
                  }}
                >
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: isActive ? "hsl(25 45% 20%)" : "hsl(25 40% 12%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <MessageSquare style={{
                      width: 13,
                      height: 13,
                      color: isActive ? "hsl(37 50% 75%)" : "hsl(29 20% 40%)",
                    }} />
                  </div>

                  <div style={{
                    flex: 1,
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontSize: 13,
                    fontWeight: isActive ? 500 : 400,
                    fontFamily: "var(--font-serif)",
                    color: isActive ? "hsl(37 50% 90%)" : "hsl(37 40% 70%)",
                    paddingRight: 24,
                  }}>
                    {conv.title || "Без назви"}
                  </div>

                  {conv.createdAt && (
                    <span style={{
                      fontSize: 10,
                      color: "hsl(29 15% 35%)",
                      flexShrink: 0,
                      fontFamily: "var(--font-sans)",
                      letterSpacing: "0.02em",
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
                            Цю дію не можна скасувати. Всю історію розмови буде видалено.
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
      <div style={{ 
        padding: "16px 12px", 
        borderTop: "1px solid hsl(25 35% 12%)",
        background: "linear-gradient(180deg, transparent 0%, hsl(25 48% 8%) 100%)",
      }}>
        <p style={{
          fontSize: 9,
          fontWeight: 500,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "hsl(29 15% 30%)",
          marginBottom: 10,
          paddingLeft: 4,
        }}>
          Посилання
        </p>
        {[
          { label: "Офіційний сайт", href: "https://lib-hdak.in.ua/", icon: "🌐" },
          { label: "Електронний каталог", href: "https://library-service.com.ua:8443/khkhdak/DocumentSearchForm", icon: "📚" },
        ].map(({ label, href, icon }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 10px",
              fontSize: 12,
              color: "hsl(37 40% 65%)",
              textDecoration: "none",
              borderRadius: 8,
              marginBottom: 4,
              transition: "all 0.15s ease",
              background: "hsl(25 40% 10%)",
              border: "1px solid hsl(25 35% 12%)",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLAnchorElement).style.background = "hsl(25 45% 14%)";
              (e.currentTarget as HTMLAnchorElement).style.color = "hsl(37 50% 80%)";
              (e.currentTarget as HTMLAnchorElement).style.transform = "translateX(2px)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLAnchorElement).style.background = "hsl(25 40% 10%)";
              (e.currentTarget as HTMLAnchorElement).style.color = "hsl(37 40% 65%)";
              (e.currentTarget as HTMLAnchorElement).style.transform = "translateX(0)";
            }}
          >
            <span style={{ fontSize: 14 }}>{icon}</span>
            <span style={{ fontFamily: "var(--font-sans)", fontWeight: 500 }}>{label}</span>
            <ExternalLink style={{ width: 12, height: 12, marginLeft: "auto", flexShrink: 0, opacity: 0.5 }} />
          </a>
        ))}
      </div>
    </div>
  );
}
