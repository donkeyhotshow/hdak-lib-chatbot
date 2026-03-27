import { Route, Switch } from "wouter";
import Home from "@/pages/Home";
import Chat from "@/pages/Chat";
import NotFound from "@/pages/not-found";
import { Sidebar } from "@/components/Sidebar";

export default function App() {
  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar />
      <main style={{ flex: 1, overflow: "hidden" }}>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/chat/:id" component={Chat} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
} 
