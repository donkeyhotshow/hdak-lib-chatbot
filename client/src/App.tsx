import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Chat from "@/pages/Chat";
import { Sidebar } from "@/components/Sidebar";
import { useState, useCallback } from "react";
import { X, BookOpen } from "lucide-react";

// ── Header ───────────────────────────────────────────────────────────────────
function AppHeader({ onHistoryOpen }: { onHistoryOpen: () => void }) {
  return (
    <header
      style={{
        background: "hsl(25 54% 11%)",
        borderBottom: "1px solid hsl(25 50% 8%)",
        flexShrink: 0,
        height: 56,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 18px",
        position: "relative",
        zIndex: 20,
      }}
    >
      {/* Brand */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* Book spine logo */}
        <div style={{
          width: 32, height: 32,
          borderRadius: 7,
          background: "hsl(25 50% 16%)",
          border: "1px solid hsl(25 40% 22%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <BookOpen style={{ width: 16, height: 16, color: "hsl(37 62% 82%)" }} />
        </div>

        <div>
          <div style={{
            fontFamily: "var(--font-serif)",
            fontSize: 14,
            fontWeight: 500,
            color: "hsl(37 62% 90%)",
            letterSpacing: "-0.01em",
            lineHeight: 1.1,
          }}>
            Бібліотека ХДАК
          </div>
          <div style={{
            fontSize: 10,
            color: "hsl(29 30% 58%)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginTop: 1,
          }}>
            Чат-помічник
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {[
          { label: "Історія", onClick: onHistoryOpen, testid: "button-open-history" },
          { label: "Ресурси", onClick: () => {}, testid: "button-resources" },
        ].map(({ label, onClick, testid }) => (
          <button
            key={label}
            onClick={onClick}
            data-testid={testid}
            style={{
              height: 30, padding: "0 12px",
              background: "transparent",
              border: "1px solid hsl(25 30% 30%)",
              borderRadius: 999,
              color: "hsl(37 50% 78%)",
              fontSize: 12,
              fontFamily: "var(--font-sans)",
              cursor: "pointer",
              transition: "all 0.12s",
            }}
            onMouseEnter={e => {
              (e.target as HTMLButtonElement).style.background = "hsl(25 40% 18%)";
              (e.target as HTMLButtonElement).style.borderColor = "hsl(25 30% 40%)";
            }}
            onMouseLeave={e => {
              (e.target as HTMLButtonElement).style.background = "transparent";
              (e.target as HTMLButtonElement).style.borderColor = "hsl(25 30% 30%)";
            }}
          >
            {label}
          </button>
        ))}

        <button
          data-testid="button-lang"
          style={{
            height: 28, padding: "0 10px",
            background: "hsl(25 40% 18%)",
            border: "1px solid hsl(25 30% 28%)",
            borderRadius: 999,
            color: "hsl(37 40% 68%)",
            fontSize: 11,
            fontFamily: "var(--font-sans)",
            fontWeight: 500,
            letterSpacing: "0.04em",
            cursor: "pointer",
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
  const closeHistory = useCallback(() => setHistoryOpen(false), []);

  return (
    <div
      className="flex flex-col h-screen w-full overflow-hidden"
      style={{ background: "hsl(var(--background))" }}
    >
      <a href="#main-content" className="skip-link">Перейти до змісту</a>

      <AppHeader onHistoryOpen={() => setHistoryOpen(true)} />

      <HistoryDrawer open={historyOpen} onClose={closeHistory} />

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
