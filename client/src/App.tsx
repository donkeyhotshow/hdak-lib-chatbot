import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Chat from "@/pages/Chat";
import { Sidebar } from "@/components/Sidebar";
import { ResourcesDrawer } from "@/components/ResourcesDrawer";
import { useState, useCallback } from "react";
import { X, BookOpen, Library } from "lucide-react";

// ── Header ───────────────────────────────────────────────────────────────────
function AppHeader({ onHistoryOpen, onResourcesOpen }: { onHistoryOpen: () => void; onResourcesOpen: () => void }) {
  return (
    <header
      style={{
        background: "linear-gradient(180deg, hsl(25 52% 10%) 0%, hsl(25 54% 7%) 100%)",
        borderBottom: "1px solid hsl(25 40% 12%)",
        flexShrink: 0,
        height: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        position: "relative",
        zIndex: 20,
        boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
      }}
    >
      {/* Brand */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Book spine logo */}
        <div style={{
          width: 36, height: 36,
          borderRadius: 10,
          background: "linear-gradient(135deg, hsl(37 45% 25%) 0%, hsl(25 50% 15%) 100%)",
          border: "1px solid hsl(25 35% 20%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
          boxShadow: "0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}>
          <BookOpen style={{ width: 18, height: 18, color: "hsl(37 50% 80%)" }} />
        </div>

        <div>
          <div style={{
            fontFamily: "var(--font-serif)",
            fontSize: 15,
            fontWeight: 500,
            color: "hsl(37 50% 90%)",
            letterSpacing: "-0.01em",
            lineHeight: 1.2,
          }}>
            Бібліотека ХДАК
          </div>
          <div style={{
            fontSize: 10,
            color: "hsl(29 20% 45%)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginTop: 2,
            fontWeight: 400,
          }}>
            Чат-помічник
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {[
          { label: "Історія", onClick: onHistoryOpen, testid: "button-open-history" },
          { label: "Ресурси", onClick: onResourcesOpen, testid: "button-resources" },
        ].map(({ label, onClick, testid }) => (
          <button
            key={label}
            onClick={onClick}
            data-testid={testid}
            style={{
              height: 32, padding: "0 14px",
              background: "linear-gradient(135deg, hsl(25 45% 14%) 0%, hsl(25 40% 10%) 100%)",
              border: "1px solid hsl(25 35% 18%)",
              borderRadius: 8,
              color: "hsl(37 45% 75%)",
              fontSize: 12,
              fontFamily: "var(--font-sans)",
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.2s ease",
              boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
            }}
            onMouseEnter={e => {
              (e.target as HTMLButtonElement).style.background = "linear-gradient(135deg, hsl(25 50% 18%) 0%, hsl(25 45% 14%) 100%)";
              (e.target as HTMLButtonElement).style.transform = "translateY(-1px)";
              (e.target as HTMLButtonElement).style.boxShadow = "0 3px 8px rgba(0,0,0,0.25)";
            }}
            onMouseLeave={e => {
              (e.target as HTMLButtonElement).style.background = "linear-gradient(135deg, hsl(25 45% 14%) 0%, hsl(25 40% 10%) 100%)";
              (e.target as HTMLButtonElement).style.transform = "translateY(0)";
              (e.target as HTMLButtonElement).style.boxShadow = "0 1px 4px rgba(0,0,0,0.15)";
            }}
          >
            {label}
          </button>
        ))}

        <button
          data-testid="button-lang"
          style={{
            height: 30, padding: "0 12px",
            background: "linear-gradient(135deg, hsl(37 40% 30%) 0%, hsl(25 45% 18%)",
            border: "1px solid hsl(25 35% 22%)",
            borderRadius: 8,
            color: "hsl(37 50% 80%)",
            fontSize: 11,
            fontFamily: "var(--font-sans)",
            fontWeight: 600,
            letterSpacing: "0.05em",
            cursor: "pointer",
            boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={e => {
            (e.target as HTMLButtonElement).style.transform = "translateY(-1px)";
            (e.target as HTMLButtonElement).style.boxShadow = "0 3px 8px rgba(0,0,0,0.25)";
          }}
          onMouseLeave={e => {
            (e.target as HTMLButtonElement).style.transform = "translateY(0)";
            (e.target as HTMLButtonElement).style.boxShadow = "0 1px 4px rgba(0,0,0,0.15)";
          }}
        >
          УКР
        </button>
      </div>
    </header>
  );
}

// ── History drawer (sidebar) ──────────────────────────────────────────────────
function HistoryDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-72
          transform transition-transform duration-300 ease-in-out
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="relative h-full">
          <button
            onClick={onClose}
            data-testid="button-close-history"
            aria-label="Закрити"
            className="absolute top-4 right-4 z-10 rounded-lg p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <Sidebar className="h-full w-full" />
        </div>
      </aside>
    </>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────
function AppLayout({ children }: { children: React.ReactNode }) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const closeHistory = useCallback(() => setHistoryOpen(false), []);

  return (
    <div
      className="flex flex-col h-screen w-full overflow-hidden"
      style={{ background: "hsl(var(--background))" }}
    >
      <a href="#main-content" className="skip-link">Перейти до змісту</a>

      <AppHeader onHistoryOpen={() => setHistoryOpen(true)} onResourcesOpen={() => setResourcesOpen(prev => !prev)} />

      <HistoryDrawer open={historyOpen} onClose={closeHistory} />

      <ResourcesDrawer open={resourcesOpen} onClose={() => setResourcesOpen(false)} />

      <main id="main-content" className="flex-1 overflow-hidden relative">
        {children}
      </main>
    </div>
  );
}

// ── Router ────────────────────────────────────────────────────────────────────
function Router() {
  return (
    <Switch>
      <Route path="/">
        <AppLayout><Home /></AppLayout>
      </Route>
      <Route path="/chat/:id">
        <AppLayout><Chat /></AppLayout>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
