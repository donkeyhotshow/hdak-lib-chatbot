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
    <div className="flex h-screen w-full overflow-hidden" style={{ background: "hsl(var(--brown-50))" }}>
      <a href="#main-content" className="skip-link">Перейти до змісту</a>

      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden backdrop-blur-sm"
          style={{ background: "hsl(var(--brown-900) / 0.5)" }}
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
          className="md:hidden flex items-center p-4 backdrop-blur"
          style={{
            borderBottom: "1px solid hsl(var(--brown-200))",
            background: "hsl(var(--brown-50) / 0.85)",
          }}
        >
          <button
            onClick={() => setIsSidebarOpen(true)}
            data-testid="button-open-sidebar"
            aria-label="Відкрити меню"
            className="mr-3 p-2 rounded-lg transition-colors"
            style={{ color: "hsl(var(--brown-700))" }}
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-serif font-bold text-lg" style={{ color: "hsl(var(--brown-800))" }}>
            HDAK Library
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
