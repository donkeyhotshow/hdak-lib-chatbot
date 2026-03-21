import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Chat from "@/pages/Chat";
import { Sidebar } from "@/components/Sidebar";
import { useState, useCallback } from "react";
import { Menu } from "lucide-react";

function AppLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);

  return (
    <div
      className="flex h-screen w-full overflow-hidden"
      style={{ background: "var(--p1)" }}
    >
      <a href="#main-content" className="skip-link">Перейти до змісту</a>

      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: "rgba(45,27,14,.5)", backdropFilter: "blur(4px)" }}
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <Sidebar className="h-full w-full" />
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col h-full min-w-0 relative">

        {/* Mobile header */}
        <div
          className="md:hidden flex items-center gap-3 px-4"
          style={{
            height: 56,
            background: "rgba(245,234,216,.92)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            borderBottom: "1px solid var(--border-mid)",
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => setIsSidebarOpen(true)}
            data-testid="button-open-sidebar"
            aria-label="Відкрити меню"
            style={{
              width: 32, height: 32,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "transparent",
              border: "1px solid var(--border-mid)",
              borderRadius: "var(--r-sm)",
              color: "var(--text-2)",
              cursor: "pointer",
              transition: "all .12s",
              flexShrink: 0,
            }}
          >
            <Menu style={{ width: 16, height: 16 }} />
          </button>
          {/* Book spine mini-logo */}
          <div style={{
            width: 26, height: 26,
            borderRadius: "var(--r-sm)",
            background: "var(--b1)",
            position: "relative", overflow: "hidden",
            flexShrink: 0,
          }}>
            <span style={{ position: "absolute", left: 5, top: 4, right: 5, bottom: 4, borderLeft: "2px solid rgba(245,234,216,.6)", borderRight: "2px solid rgba(245,234,216,.6)" }} />
            <span style={{ position: "absolute", left: "50%", top: 4, bottom: 4, width: 1, background: "rgba(245,234,216,.4)", transform: "translateX(-50%)" }} />
          </div>
          <span style={{ fontFamily: "var(--ff-d)", fontSize: 15, fontWeight: 500, color: "var(--b0)", letterSpacing: "-.02em" }}>
            Бібліотека ХДАК
          </span>
        </div>

        <div id="main-content" className="flex-1 h-full overflow-hidden relative">
          {children}
        </div>
      </main>
    </div>
  );
}

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
