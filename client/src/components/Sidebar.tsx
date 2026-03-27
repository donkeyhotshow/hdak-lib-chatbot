import { cn } from "@/lib/utils";
import { useConversations, useDeleteConversation, useCreateConversation } from "@/hooks/use-chat";
import { Plus, MessageSquare, Trash2, ExternalLink, BookOpen, Clock, Settings, FolderOpen, ChevronRight, Search, Phone, UserPlus, Library, Bookmark, FileText, LogOut } from "lucide-react";
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
        background: "hsl(28 25% 8%)", // #1C1612
        borderRight: "1px solid hsla(35 10% 85% / 0.05)",
        width: 260,
        transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {/* Header */}
      <div style={{ 
        padding: "24px 20px 20px", 
        borderBottom: "1px solid hsla(35 10% 85% / 0.05)",
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 16,
        }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: "hsl(32 45% 63%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <BookOpen style={{ width: 18, height: 18, color: "#fff" }} />
          </div>
          <div>
            <p style={{
              fontSize: 18,
              fontWeight: 600,
              letterSpacing: "-0.01em",
              color: "#fff",
              fontFamily: "var(--font-serif)",
            }}>
              Бібліотека
            </p>
            <p style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "hsl(32 45% 63%)",
              marginTop: 2,
            }}>
              ХДАК <span style={{ fontStyle: "italic", fontWeight: 400, opacity: 0.6 }}>Intelligence</span>
            </p>
          </div>
        </div>

        {/* Online indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "hsl(142 70% 45%)",
            boxShadow: "0 0 8px hsla(142 70% 45% / 0.6)",
          }} />
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "hsla(35 20% 85% / 0.5)",
          }}>
            Онлайн
          </span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-6 px-4 custom-scrollbar" style={{ padding: "20px 16px" }}>
        {/* Quick Requests */}
        <div style={{ marginBottom: 24 }}>
          <span style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "hsla(35 10% 85% / 0.2)",
            display: "block",
            marginBottom: 12,
          }}>
            Швидкі запити
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {[
              { label: "Графік роботи", icon: Clock, query: "Графік роботи бібліотеки" },
              { label: "Як записатися?", icon: UserPlus, query: "Як записатися до бібліотеки" },
              { label: "Електронний каталог", icon: Search, query: "Електронний каталог" },
              { label: "Контакти", icon: Phone, query: "Контакти бібліотеки" },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  createMutation.mutate(item.query, {
                    onSuccess: (newConv) => setLocation(`/chat/${newConv.id}?q=${encodeURIComponent(item.query)}`),
                  });
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  background: "transparent",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  textAlign: "left",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = "hsla(35 20% 85% / 0.05)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                }}
              >
                <span style={{
                  fontSize: 13,
                  color: "hsla(35 20% 85% / 0.7)",
                  fontFamily: "var(--font-sans)",
                }}>
                  {item.label}
                </span>
                <ChevronRight style={{ 
                  width: 14, 
                  height: 14, 
                  color: "hsla(35 20% 85% / 0.1)",
                }} />
              </button>
            ))}
          </div>
        </div>

        {/* Resources */}
        <div>
          <span style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "hsla(35 10% 85% / 0.2)",
            display: "block",
            marginBottom: 12,
          }}>
            Ресурси бібліотеки
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              { label: "Пошук в каталозі", sublabel: "OPAC", icon: Search },
              { label: "Збережені матеріали", sublabel: "Закладки", icon: Bookmark },
              { label: "Наукові праці", sublabel: "Публікації", icon: FileText },
              { label: "Сайт бібліотеки", sublabel: "lib-hdak.in.ua", icon: ExternalLink },
            ].map((item) => (
              <button
                key={item.label}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "10px 12px",
                  background: "transparent",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  textAlign: "left",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = "hsla(35 20% 85% / 0.05)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                }}
              >
                <div style={{
                  marginTop: 2,
                  color: "hsla(35 20% 85% / 0.4)",
                }}>
                  <item.icon style={{ width: 16, height: 16 }} />
                </div>
                <div>
                  <span style={{
                    fontSize: 13,
                    color: "hsla(35 20% 85% / 0.8)",
                    fontFamily: "var(--font-sans)",
                    display: "block",
                  }}>
                    {item.label}
                  </span>
                  <span style={{
                    fontSize: 10,
                    color: "hsla(35 20% 85% / 0.3)",
                    fontFamily: "var(--font-sans)",
                    display: "block",
                    marginTop: 2,
                  }}>
                    {item.sublabel}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer - New Chat */}
      <div style={{ padding: "16px" }}>
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
            padding: "14px",
            background: "transparent",
            border: "1px solid hsla(32 45% 63% / 0.3)",
            borderRadius: 12,
            color: "hsl(32 45% 63%)",
            fontSize: 11,
            fontWeight: 700,
            fontFamily: "var(--font-sans)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            cursor: createMutation.isPending ? "not-allowed" : "pointer",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={e => {
            if (!createMutation.isPending) {
              (e.currentTarget as HTMLButtonElement).style.background = "hsla(32 45% 63% / 0.1)";
            }
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
          }}
        >
          <Plus style={{ width: 16, height: 16 }} />
          {createMutation.isPending ? "Створюю..." : "+ Новий чат"}
        </button>
      </div>
    </div>
  );
}
