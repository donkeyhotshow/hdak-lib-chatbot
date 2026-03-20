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
import { Menu, BookMarked } from "lucide-react";

function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <a href="#main-content" className="skip-link">Перейти до змісту</a>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0 md:flex-shrink-0
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <Sidebar className="h-full w-full" />
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col h-full min-w-0 relative overflow-hidden">

        {/* Mobile top bar — dark wood */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 wood-panel border-b border-amber-900/30">
          <button
            onClick={() => setSidebarOpen(true)}
            data-testid="button-open-sidebar"
            className="w-9 h-9 flex items-center justify-center rounded-lg text-amber-300 hover:bg-amber-900/50 transition-colors"
            aria-label="Відкрити меню"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <BookMarked className="w-4 h-4 text-amber-400" />
            <span className="font-serif font-bold text-amber-200 text-base tracking-wide">ХДАК Бібліотека</span>
          </div>
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
