import { cn } from "@/lib/utils";
import { useConversations, useDeleteConversation, useCreateConversation } from "@/hooks/use-chat";
import { Plus, MessageSquare, Trash2, ExternalLink, BookOpen, Clock, Settings, FolderOpen, ChevronRight, Search, Phone, UserPlus, Library, Bookmark, FileText, LogOut, Scale, Menu, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import { QUICK_MENU } from "@/lib/responses";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState, useEffect, useCallback } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

export function Sidebar({ className }: { className?: string }) {
  const [location, setLocation] = useLocation();
  const { data: conversations, isLoading } = useConversations();
  const deleteMutation = useDeleteConversation();
  const createMutation = useCreateConversation();
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNewChat = useCallback(() => {
    createMutation.mutate(undefined, {
      onSuccess: (newConv) => {
        setLocation(`/chat/${newConv.id}`);
        setMobileOpen(false);
      },
    });
  }, [createMutation, setLocation]);

  const handleDelete = useCallback((e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    deleteMutation.mutate(id, {
      onSuccess: () => {
        if (location === `/chat/${id}`) setLocation("/");
      },
    });
  }, [deleteMutation, location, setLocation]);

  // Close mobile sidebar on navigation
  useEffect(() => {
    if (mobileOpen) {
      setMobileOpen(false);
    }
  }, [location]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileOpen) {
        setMobileOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen]);

  // Мапінг іконок для швидких запитів
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "Clock": return Clock;
      case "UserPlus": return UserPlus;
      case "Search": return Search;
      case "Phone": return Phone;
      case "Scale": return Scale;
      case "BookOpen": return BookOpen;
      default: return ChevronRight;
    }
  };

  // Sidebar content component
  const SidebarContent = () => (
    <div
      className="flex flex-col h-full"
      style={{
        background: "hsl(28 25% 8%)",
        borderRight: "1px solid hsla(35 10% 85% / 0.05)",
        transition: "all 0.3s ease",
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
            <BookOpen style={{ width: 18, height: 18, color: "#fff" }} aria-hidden="true" />
          </div>
          <div>
            <p style={{
              fontSize: 15,
              fontWeight: 600,
              letterSpacing: "0.02em",
              color: "#fff",
              fontFamily: "var(--font-sans)",
            }}>
              ЧАТ-ПОМІЧНИК
            </p>
            <p style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "hsl(32 45% 63%)",
              marginTop: 2,
            }}>
              БІБЛІОТЕКИ
            </p>
          </div>
        </div>

        {/* Online indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span 
            role="status"
            aria-label="Онлайн"
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "hsl(142 70% 45%)",
              boxShadow: "0 0 8px hsla(142 70% 45% / 0.6)",
            }}
          />
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

      {/* Navigation - flex-1 with justify-between */}
      <div className="flex-1 flex flex-col justify-between overflow-hidden">
        <div className="overflow-y-auto py-6 px-4 custom-scrollbar" style={{ padding: "20px 16px" }}>
          {/* Quick Requests */}
          <div style={{ marginBottom: 24 }}>
            <span style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "hsla(35 10% 85% / 0.4)",
              display: "block",
              marginBottom: 12,
            }}>
              Швидкі запити
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }} role="menu">
              {QUICK_MENU.map((item) => {
                const Icon = getIcon(item.icon);
                return (
                  <button
                    key={item.kw}
                    onClick={() => {
                      createMutation.mutate(item.label, {
                        onSuccess: (newConv) => setLocation(`/chat/${newConv.id}?q=${encodeURIComponent(item.label)}`),
                      });
                    }}
                    role="menuitem"
                    aria-label={`Швидкий запит: ${item.label}. ${item.subtitle}`}
                    tabIndex={0}
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
                      width: "100%",
                      outline: "none",
                    }}
                    onFocus={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = "hsla(35 20% 85% / 0.08)";
                      (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 0 2px hsla(32 45% 63% / 0.2)";
                    }}
                    onBlur={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                      (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = "hsla(35 20% 85% / 0.05)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Icon style={{ width: 14, height: 14, color: "hsla(35 20% 85% / 0.4)" }} aria-hidden="true" />
                      <div>
                        <span style={{
                          fontSize: 13,
                          color: "hsla(35 20% 85% / 0.9)",
                          fontFamily: "var(--font-sans)",
                          display: "block",
                        }}>
                          {item.label}
                        </span>
                        <span style={{
                          fontSize: 10,
                          color: "hsla(35 20% 85% / 0.35)",
                          fontFamily: "var(--font-sans)",
                          display: "block",
                          marginTop: 1,
                        }}>
                          {item.subtitle}
                        </span>
                      </div>
                    </div>
                    <ChevronRight style={{ 
                      width: 14, 
                      height: 14, 
                      color: "hsla(35 20% 85% / 0.1)",
                    }} aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Resources */}
          <div>
            <span style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "hsla(35 10% 85% / 0.8)",
              display: "block",
              marginBottom: 12,
            }}>
              Ресурси бібліотеки
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }} role="menu">
              {[
                { label: "Пошук в каталозі", sublabel: "OPAC", icon: Search, href: "https://library-service.com.ua:8443/khkhdak/DocumentSearchForm" },
                { label: "Репозитарій ХДАК", sublabel: "Публікації", icon: BookOpen, href: "https://repository.ac.kharkov.ua/home" },
                { label: "Наукові бази", sublabel: "Scopus, WoS", icon: ExternalLink, href: "https://lib-hdak.in.ua/search-scientific-info.html" },
                { label: "Сайт бібліотеки", sublabel: "lib-hdak.in.ua", icon: ExternalLink, href: "https://lib-hdak.in.ua/" },
              ].map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  role="menuitem"
                  aria-label={`${item.label} — відкриється в новій вкладці`}
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
                    textDecoration: "none",
                    outline: "none",
                  }}
                  onFocus={e => {
                    (e.currentTarget as HTMLAnchorElement).style.background = "hsla(35 20% 85% / 0.08)";
                    (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 0 0 2px hsla(32 45% 63% / 0.2)";
                  }}
                  onBlur={e => {
                    (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
                    (e.currentTarget as HTMLAnchorElement).style.boxShadow = "none";
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLAnchorElement).style.background = "hsla(35 20% 85% / 0.05)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
                  }}
                >
                  <div style={{
                    marginTop: 2,
                    color: "hsla(35 20% 85% / 0.5)",
                  }}>
                    <item.icon style={{ width: 16, height: 16 }} aria-hidden="true" />
                  </div>
                  <div>
                    <span style={{
                      fontSize: 13,
                      color: "#FFFFFF",
                      fontFamily: "var(--font-sans)",
                      display: "block",
                    }}>
                      {item.label}
                    </span>
                    <span style={{
                      fontSize: 10,
                      color: "hsla(35 20% 85% / 0.7)",
                      fontFamily: "var(--font-sans)",
                      display: "block",
                      marginTop: 2,
                    }}>
                      {item.sublabel}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Footer - New Chat */}
        <div style={{ padding: "16px", borderTop: "1px solid hsla(35 10% 85% / 0.05)" }}>
          <button
            onClick={handleNewChat}
            disabled={createMutation.isPending}
            data-testid="button-new-conversation"
            aria-label={createMutation.isPending ? "Створюється нова розмова..." : "Створити нову розмову"}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "14px",
              background: "rgba(184, 120, 48, 0.15)",
              border: "1px solid rgba(184, 120, 48, 0.35)",
              borderRadius: 12,
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
              fontFamily: "var(--font-sans)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              cursor: createMutation.isPending ? "not-allowed" : "pointer",
              transition: "all 0.2s ease",
              outline: "none",
            }}
            onFocus={e => {
              if (!createMutation.isPending) {
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 0 2px hsla(32 45% 63% / 0.4)";
              }
            }}
            onBlur={e => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
            }}
            onMouseEnter={e => {
              if (!createMutation.isPending) {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(184, 120, 48, 0.25)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(184, 120, 48, 0.5)";
              }
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(184, 120, 48, 0.15)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(184, 120, 48, 0.35)";
            }}
          >
            <Plus style={{ width: 16, height: 16 }} aria-hidden="true" />
            {createMutation.isPending ? "Створюю..." : "Новий чат"}
          </button>
        </div>
      </div>
    </div>
  );

  // Desktop view
  if (!isMobile) {
    return (
      <div
        className={cn("hidden md:flex", className)}
        style={{
          width: 260,
        }}
      >
        <SidebarContent />
      </div>
    );
  }

  // Mobile view with Sheet
  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg"
        style={{
          background: "hsl(28 25% 8%)",
          color: "#fff",
          transition: "all 0.2s ease",
        }}
        aria-label="Відкрити меню"
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.05)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
        }}
      >
        <Menu style={{ width: 24, height: 24 }} />
      </button>

      {/* Mobile Sheet/Drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent 
          side="left" 
          className="p-0 w-[280px] sm:w-[320px]"
          aria-describedby="sidebar-description"
        >
          <SheetHeader className="sr-only">
            <SheetTitle id="sidebar-description">Меню чат-помічника бібліотеки</SheetTitle>
          </SheetHeader>
          <div style={{ width: "100%", height: "100%" }}>
            <SidebarContent />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
