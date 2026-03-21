import { useCreateConversation } from "@/hooks/use-chat";
import { useLocation } from "wouter";
import { Library, Search, BookOpen, MessageCircle, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: Search,
    emoji: "📂",
    title: "Пошук у каталозі",
    desc: "Знайдіть книги та матеріали в електронному каталозі бібліотеки.",
  },
  {
    icon: BookOpen,
    emoji: "📘",
    title: "Довідник бібліотеки",
    desc: "Дізнайтесь про правила, графік роботи та послуги.",
  },
  {
    icon: MessageCircle,
    emoji: "🔬",
    title: "Наукові ресурси",
    desc: "Отримайте допомогу в пошуку академічних матеріалів.",
  },
];

export default function Home() {
  const [_, setLocation] = useLocation();
  const createMutation = useCreateConversation();

  const handleStartChat = () => {
    createMutation.mutate(undefined, {
      onSuccess: (newConv) => setLocation(`/chat/${newConv.id}`),
    });
  };

  return (
    <div
      className="h-full overflow-y-auto flex flex-col items-center justify-center p-6 text-center"
      style={{ background: "var(--p0)" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42 }}
        className="w-full max-w-lg mx-auto space-y-7"
      >
        {/* Logo */}
        <div className="flex justify-center">
          <div style={{
            width: 64, height: 64,
            borderRadius: "var(--r-lg)",
            background: "var(--b1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            position: "relative", overflow: "hidden",
            boxShadow: "0 8px 24px rgba(45,27,14,.25)",
          }}>
            <span style={{
              position: "absolute", left: 12, top: 10, right: 12, bottom: 10,
              borderLeft: "3px solid rgba(245,234,216,.6)",
              borderRight: "3px solid rgba(245,234,216,.6)",
            }} />
            <span style={{
              position: "absolute", left: "50%", top: 10, bottom: 10,
              width: 2, background: "rgba(245,234,216,.4)",
              transform: "translateX(-50%)",
            }} />
          </div>
        </div>

        {/* Heading */}
        <div>
          <h1 style={{
            fontFamily: "var(--ff-d)",
            fontSize: 30,
            fontWeight: 500,
            color: "var(--b0)",
            letterSpacing: "-.025em",
            lineHeight: 1.2,
            marginBottom: 10,
          }}>
            Бібліотечний асистент ХДАК
          </h1>
          <p style={{ fontSize: 14.5, color: "var(--text-3)", lineHeight: 1.65, fontWeight: 300, maxWidth: 360, margin: "0 auto" }}>
            AI-провідник по каталогу, ресурсах та послугах Наукової бібліотеки ХДАК.
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.07, duration: 0.28 }}
              style={{
                padding: "10px 12px",
                background: "rgba(255,252,245,.9)",
                border: "0.5px solid var(--border-light)",
                borderRadius: "var(--r-md)",
                boxShadow: "0 1px 4px rgba(45,27,14,.05)",
              }}
            >
              <div style={{ fontSize: 18, marginBottom: 6 }}>{f.emoji}</div>
              <h3 style={{ fontSize: 13, fontWeight: 500, color: "var(--text-1)", marginBottom: 3 }}>
                {f.title}
              </h3>
              <p style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.5, fontWeight: 300 }}>
                {f.desc}
              </p>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <div>
          <button
            onClick={handleStartChat}
            disabled={createMutation.isPending}
            data-testid="button-start-chat"
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              height: 48, padding: "0 28px",
              background: "var(--b1)",
              border: "none",
              borderRadius: "var(--r-pill)",
              color: "var(--p1)",
              fontSize: 14.5, fontWeight: 500,
              fontFamily: "var(--ff-b)",
              boxShadow: "0 4px 16px rgba(45,27,14,.3)",
              cursor: createMutation.isPending ? "not-allowed" : "pointer",
              opacity: createMutation.isPending ? 0.7 : 1,
              transition: "background .12s, transform .1s",
            }}
            onMouseEnter={(e) => { if (!createMutation.isPending) (e.currentTarget as HTMLButtonElement).style.background = "var(--b0)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--b1)"; }}
          >
            {createMutation.isPending ? "Створення..." : "Розпочати розмову"}
            {!createMutation.isPending && <ArrowRight style={{ width: 15, height: 15 }} />}
          </button>
        </div>

        {/* Quick links */}
        <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
          {[
            { href: "https://lib-hdak.in.ua/", label: "Сайт бібліотеки" },
            { href: "https://library-service.com.ua:8443/khkhdak/DocumentSearchForm", label: "Е-каталог" },
            { href: "https://repository.ac.kharkov.ua/home", label: "Репозитарій" },
          ].map(({ href, label }) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex", alignItems: "center",
                height: 28, padding: "0 12px",
                background: "transparent",
                border: "1px solid var(--border-mid)",
                borderRadius: "var(--r-pill)",
                color: "var(--text-3)", fontSize: 12,
                transition: "all .12s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = "var(--p2)";
                (e.currentTarget as HTMLAnchorElement).style.color = "var(--text-1)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
                (e.currentTarget as HTMLAnchorElement).style.color = "var(--text-3)";
              }}
            >
              {label}
            </a>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
