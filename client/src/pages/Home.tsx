import { useCreateConversation } from "@/hooks/use-chat";
import { useLocation } from "wouter";
import { Loader2, ArrowRight, Search, Plus, Clock, Phone, Scale } from "lucide-react";

const STEPS = [
  {
    n: "1",
    title: "Оберіть запит",
    desc: "нижче або напишіть своє",
  },
  {
    n: "2",
    title: "Уточніть тему",
    desc: "— автор, предмет, ключові слова",
  },
  {
    n: "3",
    title: "Відкрийте посилання",
    desc: "з офіційного джерела",
  },
];

const QUICK_CHIPS = [
  { emoji: "🔍", label: "Каталог" },
  { emoji: "➕", label: "Записатися" },
  { emoji: "🕐", label: "Графік роботи" },
  { emoji: "📞", label: "Контакти" },
  { emoji: "📖", label: "ДСТУ" },
];

export const CHIPS = QUICK_CHIPS;

export default function Home() {
  const [_, setLocation] = useLocation();
  const createMutation = useCreateConversation();

  const startChat = (msg?: string) => {
    createMutation.mutate(msg || "Нова розмова", {
      onSuccess: (newConv) => setLocation(`/chat/${newConv.id}`),
    });
  };

  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      style={{ background: "hsl(var(--background))" }}
    >
      {/* ── Scrollable area ── */}
      <div className="flex-1 overflow-y-auto scrollbar-thin flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-md animate-rise">

          {/* Diamond glyph */}
          <div className="text-center mb-5">
            <span
              style={{
                fontSize: 28,
                color: "hsl(var(--b3))",
                display: "inline-block",
              }}
            >
              ✦
            </span>
          </div>

          {/* Title */}
          <h1
            className="text-center font-serif"
            style={{
              fontSize: "clamp(36px, 8vw, 48px)",
              fontWeight: 600,
              color: "hsl(28 20% 12%)",
              letterSpacing: "-0.02em",
              lineHeight: 1.05,
              marginBottom: 16,
            }}
          >
            Бібліотека ХДАК
          </h1>

          <p
            className="text-center font-serif italic"
            style={{
              fontSize: "clamp(20px, 5vw, 28px)",
              color: "hsl(32 45% 63%)",
              lineHeight: 1.4,
              marginBottom: 40,
              fontWeight: 400,
            }}
          >
            Чим можу допомогти?
          </p>

          {/* Steps */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 28 }}>
            {STEPS.map((step, i) => (
              <div
                key={step.n}
                className="animate-rise"
                style={{
                  animationDelay: `${0.06 + i * 0.06}s`,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "10px 14px",
                  background: "hsl(38 70% 97%)",
                  border: "0.5px solid hsl(var(--border))",
                  borderRadius: 10,
                }}
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: "hsl(37 35% 88%)",
                    border: "1px solid hsl(var(--border))",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 500,
                    color: "hsl(var(--b3))",
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                >
                  {step.n}
                </div>
                <p style={{ fontSize: 13.5, color: "hsl(var(--b1))", lineHeight: 1.45 }}>
                  <strong style={{ fontWeight: 500 }}>{step.title}</strong>{" "}
                  <span style={{ color: "hsl(var(--b3))" }}>{step.desc}</span>
                </p>
              </div>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: 12,
            }}
          >
            {QUICK_CHIPS.map((chip, i) => (
              <button
                key={chip.label}
                onClick={() => startChat(chip.label)}
                disabled={createMutation.isPending}
                data-testid={`chip-home-${i}`}
                className="chip-sm"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "12px 20px",
                  background: "#fff",
                  border: "1px solid hsla(28 10% 85% / 0.3)",
                  borderRadius: 999,
                  color: "hsl(28 15% 20%)",
                  fontSize: 13,
                  fontFamily: "var(--font-sans)",
                  fontWeight: 500,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.2s ease",
                  boxShadow: "0 2px 8px hsla(0 0% 0% / 0.04)",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "hsl(32 45% 63% / 0.4)";
                  (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "hsla(28 10% 85% / 0.3)";
                  (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
                }}
              >
                {createMutation.isPending ? <Loader2 className="animate-spin" size={14} /> : <>
                  {chip.label === "Каталог" && <Search size={14} style={{ color: "hsl(32 45% 63%)" }} />}
                  {chip.label === "Записатися" && <Plus size={14} style={{ color: "hsl(32 45% 63%)" }} />}
                  {chip.label === "Графік роботи" && <Clock size={14} style={{ color: "hsl(32 45% 63%)" }} />}
                  {chip.label === "Контакти" && <Phone size={14} style={{ color: "hsl(32 45% 63%)" }} />}
                  {chip.label === "ДСТУ" && <Scale size={14} style={{ color: "hsl(32 45% 63%)" }} />}
                  {chip.label}
                </>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom input teaser ── */}
      <div
        style={{
          flexShrink: 0,
          padding: "10px 16px 16px",
          borderTop: "0.5px solid hsl(var(--border))",
          background: "hsl(38 70% 97%)",
        }}
      >
        <button
          onClick={() => startChat()}
          disabled={createMutation.isPending}
          data-testid="button-start-chat"
          style={{
            width: "100%",
            maxWidth: 440,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            margin: "0 auto",
            height: 50,
            padding: "0 16px",
            background: "#fff",
            border: "1px solid hsla(28 10% 85% / 0.3)",
            borderRadius: 32,
            boxShadow: "0 4px 20px hsla(0 0% 0% / 0.06)",
            cursor: "pointer",
            transition: "border-color 0.12s",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "hsl(var(--b4))";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "hsl(var(--border))";
          }}
        >
          <span style={{ fontSize: 14, color: "hsl(var(--muted-foreground))", fontFamily: "var(--font-sans)" }}>
            {createMutation.isPending ? "Створення..." : "Введіть запитання..."}
          </span>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "hsl(var(--b0))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <span style={{ color: "hsl(var(--primary-foreground))", fontSize: 16, lineHeight: 1 }}>→</span>
          </div>
        </button>
      </div>
    </div>
  );
}
