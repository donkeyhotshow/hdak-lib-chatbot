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

const RESOURCES = [
  { href: "https://lib-hdak.in.ua/e-catalog.html", emoji: "📂", name: "Електронний каталог", url: "lib-hdak.in.ua" },
  { href: "https://library-service.com.ua:8443/khkhdak/DocumentSearchForm", emoji: "🔍", name: "Пошук АБІС УФД", url: "library-service.com.ua" },
  { href: "https://lib-hdak.in.ua/search-scientific-info.html", emoji: "🔬", name: "Наукова інформація", url: "lib-hdak.in.ua/search" },
  { href: "https://repository.ac.kharkov.ua/home", emoji: "📖", name: "Репозитарій ХДАК", url: "repository.ac.kharkov.ua" },
  { href: "https://lib-hdak.in.ua/", emoji: "🏛", name: "Сайт бібліотеки", url: "lib-hdak.in.ua" },
];

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
        background: "var(--p1)",
        borderRight: "1px solid var(--border-mid)",
      }}
    >
      {/* Brand header */}
      <div style={{
        padding: "0 18px",
        height: 56,
        display: "flex",
        alignItems: "center",
        gap: 10,
        borderBottom: "1px solid var(--border-mid)",
        background: "rgba(245,234,216,.92)",
        backdropFilter: "blur(10px)",
        flexShrink: 0,
      }}>
        <Link href="/" className="flex items-center gap-2.5 flex-1 group cursor-pointer">
          {/* Book spine logo */}
          <div style={{
            width: 32, height: 32,
            borderRadius: "var(--r-sm)",
            background: "var(--b1)",
            position: "relative",
            overflow: "hidden",
            flexShrink: 0,
            transition: "transform .2s",
          }}
          className="group-hover:scale-105"
          >
            <span style={{
              position: "absolute", left: 6, top: 6, right: 6, bottom: 6,
              borderLeft: "2.5px solid var(--p2)",
              borderRight: "2.5px solid var(--p2)",
              opacity: .7,
            }} />
            <span style={{
              position: "absolute", left: "50%", top: 6, bottom: 6,
              width: 1.5, background: "var(--p2)",
              transform: "translateX(-50%)", opacity: .5,
            }} />
          </div>
          <div>
            <div style={{ fontFamily: "var(--ff-d)", fontSize: 15, fontWeight: 500, color: "var(--b0)", letterSpacing: "-.02em", lineHeight: 1.1 }}>
              Бібліотека ХДАК
            </div>
            <div style={{ fontSize: 10, color: "var(--text-3)", letterSpacing: ".08em", textTransform: "uppercase", marginTop: 1 }}>
              Чат-помічник
            </div>
          </div>
        </Link>
      </div>

      {/* New conversation button */}
      <div style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--border-light)" }}>
        <button
          onClick={handleNewChat}
          disabled={createMutation.isPending}
          data-testid="button-new-conversation"
          style={{
            width: "100%",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            height: 34,
            background: "transparent",
            border: "1px solid var(--border-mid)",
            borderRadius: "var(--r-pill)",
            color: "var(--text-2)",
            fontSize: 13, fontWeight: 500,
            fontFamily: "var(--ff-b)",
            cursor: createMutation.isPending ? "not-allowed" : "pointer",
            opacity: createMutation.isPending ? 0.6 : 1,
            transition: "all .12s",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--p2)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-strong)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-1)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-mid)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-2)"; }}
        >
          <Plus style={{ width: 14, height: 14 }} />
          {createMutation.isPending ? "Створення..." : "Нова розмова"}
        </button>
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto" style={{ padding: "8px 6px" }}>
        {isLoading ? (
          <p style={{ textAlign: "center", padding: "24px 0", fontSize: 13, color: "var(--text-4)" }} className="animate-pulse">
            Завантаження...
          </p>
        ) : conversations?.length === 0 ? (
          <div style={{ textAlign: "center", padding: "24px 16px" }}>
            <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 4 }}>Ще немає розмов.</p>
            <p style={{ fontSize: 11, color: "var(--text-4)" }}>Розпочніть нову розмову вище.</p>
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
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "7px 10px",
                    borderRadius: "var(--r-md)",
                    marginBottom: 2,
                    background: isActive ? "rgba(255,252,245,.9)" : "transparent",
                    border: `0.5px solid ${isActive ? "var(--border-mid)" : "transparent"}`,
                    color: isActive ? "var(--text-1)" : "var(--text-3)",
                    fontSize: 13,
                    fontWeight: isActive ? 500 : 400,
                    cursor: "pointer",
                    transition: "all .12s",
                  }}
                  onMouseEnter={(e) => { if (!isActive) { (e.currentTarget as HTMLDivElement).style.background = "rgba(255,252,245,.6)"; (e.currentTarget as HTMLDivElement).style.color = "var(--text-2)"; } }}
                  onMouseLeave={(e) => { if (!isActive) { (e.currentTarget as HTMLDivElement).style.background = "transparent"; (e.currentTarget as HTMLDivElement).style.color = "var(--text-3)"; } }}
                >
                  <MessageSquare style={{ width: 14, height: 14, flexShrink: 0, color: isActive ? "var(--b3)" : "var(--text-4)" }} />
                  <span className="flex-1 truncate pr-6">{conv.title || "Без назви"}</span>
                  {conv.createdAt && (
                    <span style={{ fontSize: 10, color: "var(--text-4)", flexShrink: 0, tabularNums: true } as any}>
                      {format(new Date(conv.createdAt), "d MMM")}
                    </span>
                  )}

                  <div className="opacity-0 group-hover:opacity-100 absolute right-1.5 top-1/2 -translate-y-1/2 transition-opacity z-10">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          data-testid={`button-delete-conv-${conv.id}`}
                          style={{
                            width: 24, height: 24,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            background: "transparent",
                            border: "0.5px solid var(--border-light)",
                            borderRadius: "var(--r-sm)",
                            color: "var(--text-4)",
                            cursor: "pointer",
                            transition: "all .12s",
                          }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(180,30,30,.08)"; (e.currentTarget as HTMLButtonElement).style.color = "#c62828"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-4)"; }}
                        >
                          <Trash2 style={{ width: 11, height: 11 }} />
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

      {/* Resources footer */}
      <div style={{
        borderTop: "1px solid var(--border-mid)",
        padding: "10px 8px",
        background: "rgba(237,224,200,.5)",
        flexShrink: 0,
      }}>
        <div style={{ fontSize: 10, color: "var(--text-4)", letterSpacing: ".08em", textTransform: "uppercase", padding: "2px 8px 6px" }}>
          Ресурси
        </div>
        {RESOURCES.map(({ href, emoji, name, url }) => (
          <a
            key={href}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex", alignItems: "flex-start", gap: 7,
              padding: "6px 8px",
              borderRadius: "var(--r-md)",
              textDecoration: "none",
              transition: "all .12s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "var(--p2)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}
          >
            <span style={{
              width: 18, height: 18,
              borderRadius: "var(--r-sm)",
              background: "var(--p2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, flexShrink: 0, marginTop: 1,
            }}>
              {emoji}
            </span>
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 500, color: "var(--text-1)", lineHeight: 1.3 }}>{name}</div>
              <div style={{ fontSize: 10, color: "var(--text-4)", marginTop: 1 }}>{url}</div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
