import { useCreateConversation } from "@/hooks/use-chat";
import { useLocation } from "wouter";

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
  { emoji: "🔍", label: "Шукати в каталозі" },
  { emoji: "⚡", label: "Як записатися?" },
  { emoji: "📋", label: "Правила користування" },
  { emoji: "🕐", label: "Графік роботи" },
  { emoji: "🗂️", label: "Репозитарій" },
];

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
              fontSize: "clamp(26px, 6vw, 34px)",
              fontWeight: 500,
              color: "hsl(var(--b0))",
              letterSpacing: "-0.02em",
              lineHeight: 1.15,
              marginBottom: 10,
            }}
          >
            Чим можу допомогти?
          </h1>

          <p
            className="text-center"
            style={{
              fontSize: 14,
              color: "hsl(var(--b4))",
              lineHeight: 1.6,
              maxWidth: 320,
              margin: "0 auto 28px",
              fontWeight: 300,
            }}
          >
            Знайду книги в каталозі, розповім про ресурси і
            допоможу орієнтуватися на сайті бібліотеки ХДАК.
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

          {/* Quick chip row */}
          <div
            style={{
              display: "flex",
              gap: 7,
              overflowX: "auto",
              paddingBottom: 4,
              scrollbarWidth: "none",
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
                  flexShrink: 0,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  height: 34,
                  padding: "0 12px",
                  background: i === 0 ? "hsl(var(--b0))" : "hsl(38 70% 97%)",
                  border: "0.5px solid",
                  borderColor: i === 0 ? "transparent" : "hsl(var(--border))",
                  borderRadius: 999,
                  color: i === 0 ? "hsl(var(--primary-foreground))" : "hsl(var(--b2))",
                  fontSize: 12.5,
                  fontFamily: "var(--font-sans)",
                  fontWeight: i === 0 ? 500 : 400,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.12s",
                }}
              >
                <span style={{ fontSize: 13 }}>{chip.emoji}</span>
                {chip.label}
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
            background: "hsl(38 70% 97%)",
            border: "1px solid hsl(var(--border))",
            borderRadius: 14,
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
