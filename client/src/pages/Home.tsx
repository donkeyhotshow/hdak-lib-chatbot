import { useCreateConversation } from "@/hooks/use-chat";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { QUICK_MENU } from "@/lib/responses";

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

// Експортуємо CHIPS для використання в ChatInput
export const CHIPS = QUICK_MENU.map(item => ({
  kw: item.kw,
  label: item.label,
  subtitle: item.subtitle,
  emoji: item.icon === "Clock" ? "🕐" : 
         item.icon === "UserPlus" ? "➕" :
         item.icon === "Search" ? "🔍" :
         item.icon === "Phone" ? "📞" :
         item.icon === "Scale" ? "📖" :
         item.icon === "BookOpen" ? "📚" : "✦",
}));

export default function Home() {
  const [_, setLocation] = useLocation();
  const createMutation = useCreateConversation();

  const startChat = (msg?: string) => {
    createMutation.mutate(msg || "Нова розмова", {
      onSuccess: (newConv) => setLocation(`/chat/${newConv.id}`),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      action();
    }
  };

  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      style={{ background: "hsl(var(--background))" }}
    >
      {/* ── Scrollable area ── */}
      <div 
        className="flex-1 overflow-hidden flex flex-col items-center justify-center" 
        style={{ 
          paddingLeft: "clamp(12px, 4vw, 24px)",
          paddingRight: "clamp(12px, 4vw, 24px)",
        }}
      >
        <div 
          className="w-full max-w-md animate-rise"
          style={{ animation: "fadeSlideUp 0.6s ease-out" }}
        >

          {/* Diamond glyph */}
          <div className="text-center mb-4">
            <span
              style={{
                fontSize: "clamp(20px, 5vw, 24px)",
                color: "hsl(var(--b3))",
                display: "inline-block",
                animation: "pulse 2s ease-in-out infinite",
              }}
              aria-hidden="true"
            >
              ✦
            </span>
          </div>

          {/* Title */}
          <h1
            className="text-center font-serif"
            style={{
              fontSize: "clamp(28px, 7vw, 44px)",
              fontWeight: 600,
              color: "hsl(28 20% 12%)",
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              marginBottom: "clamp(20px, 5vw, 32px)",
            }}
          >
            Бібліотека ХДАК
          </h1>

          {/* === SEARCH HUB === */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
          }}>
            {/* Label */}
            <p style={{ 
              fontSize: "clamp(9px, 2.5vw, 10px)", 
              color: "hsl(var(--muted-foreground))",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              fontWeight: 600,
              margin: 0,
              marginBottom: 4,
            }}>
              Популярні запити
            </p>

            {/* 1-2-3 Stepper */}
            <div 
              style={{ 
                display: "flex", 
                justifyContent: "center",
                gap: "clamp(4px, 2vw, 8px)", 
                flexWrap: "wrap",
              }}
            >
              {STEPS.map((step, i) => (
                <button
                  key={step.n}
                  onClick={() => startChat(step.title)}
                  onKeyDown={(e) => handleKeyDown(e, () => startChat(step.title))}
                  className="animate-rise"
                  aria-label={`Крок ${step.n}: ${step.title}. ${step.desc}`}
                  tabIndex={0}
                  style={{
                    animation: `fadeSlideUp 0.5s ease-out ${0.1 + i * 0.08}s both`,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                    padding: "clamp(8px, 2vw, 10px) clamp(10px, 3vw, 14px)",
                    background: "hsl(38 70% 97%)",
                    border: "0.5px solid hsl(var(--border))",
                    borderRadius: 10,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    minWidth: "clamp(80px, 20vw, 90px)",
                    outline: "none",
                  }}
                  onFocus={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "hsl(32 45% 63% / 0.5)";
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 0 3px hsla(32 45% 63% / 0.15)";
                  }}
                  onBlur={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "hsl(var(--border))";
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = "hsl(37 40% 92%)";
                    (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = "hsl(38 70% 97%)";
                    (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
                  }}
                >
                  <div
                    style={{
                      width: "clamp(20px, 5vw, 22px)",
                      height: "clamp(20px, 5vw, 22px)",
                      borderRadius: "50%",
                      background: "hsl(37 35% 88%)",
                      border: "1px solid hsl(var(--border))",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "clamp(10px, 2.5vw, 11px)",
                      fontWeight: 600,
                      color: "hsl(var(--b3))",
                    }}
                  >
                    {step.n}
                  </div>
                  <span style={{ 
                    fontSize: "clamp(10px, 2.5vw, 11px)", 
                    fontWeight: 500, 
                    color: "hsl(var(--b1))",
                    textAlign: "center",
                  }}>
                    {step.title}
                  </span>
                </button>
              ))}
            </div>

            {/* Main Input */}
            <button
              onClick={() => startChat()}
              onKeyDown={(e) => handleKeyDown(e, () => startChat())}
              disabled={createMutation.isPending}
              data-testid="button-start-chat"
              aria-label={createMutation.isPending ? "Створюється нова розмова..." : "Розпочати нову розмову"}
              tabIndex={0}
              style={{
                width: "100%",
                maxWidth: "clamp(280px, 90vw, 400px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                height: "clamp(40px, 10vw, 44px)",
                padding: "0 clamp(12px, 4vw, 16px)",
                background: "#fff",
                border: "1px solid hsla(28 10% 85% / 0.4)",
                borderRadius: 24,
                boxShadow: "0 2px 12px hsla(0 0% 0% / 0.06)",
                cursor: createMutation.isPending ? "wait" : "pointer",
                transition: "all 0.2s ease",
                marginTop: 8,
                outline: "none",
                animation: `fadeSlideUp 0.5s ease-out 0.35s both`,
              }}
              onFocus={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "hsl(32 45% 63% / 0.5)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 0 3px hsla(32 45% 63% / 0.15)";
              }}
              onBlur={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "hsla(28 10% 85% / 0.4)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 2px 12px hsla(0 0% 0% / 0.06)";
              }}
              onMouseEnter={e => {
                if (!createMutation.isPending) {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "hsl(var(--b4))";
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 16px hsla(0 0% 0% / 0.1)";
                }
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "hsla(28 10% 85% / 0.4)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 2px 12px hsla(0 0% 0% / 0.06)";
              }}
            >
              <span style={{ 
                fontSize: "clamp(13px, 3.5vw, 14px)", 
                color: "hsl(var(--muted-foreground))", 
                fontFamily: "var(--font-sans)", 
                whiteSpace: "nowrap",
                textAlign: "center",
              }}>
                {createMutation.isPending ? "Створення..." : "Введіть запитання..."}
              </span>
              <div
                style={{
                  width: "clamp(26px, 6vw, 28px)",
                  height: "clamp(26px, 6vw, 28px)",
                  borderRadius: "50%",
                  background: createMutation.isPending ? "hsl(var(--muted))" : "hsl(var(--b0))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "all 0.2s ease",
                }}
              >
                {createMutation.isPending ? (
                  <Loader2 
                    style={{ 
                      width: "clamp(12px, 3vw, 14px)", 
                      height: "clamp(12px, 3vw, 14px)", 
                      color: "hsl(var(--muted-foreground))",
                      animation: "spin 1s linear infinite"
                    }} 
                    aria-hidden="true"
                  />
                ) : (
                  <span style={{ 
                    color: "hsl(var(--primary-foreground))", 
                    fontSize: "clamp(12px, 3vw, 14px)", 
                    lineHeight: 1 
                  }} aria-hidden="true">→</span>
                )}
              </div>
            </button>
          </div>

          {/* === END SEARCH HUB === */}

        </div>
      </div>

      {/* Footer spacer only */}
      <div style={{ height: "clamp(16px, 4vw, 24px)", flexShrink: 0 }} />

      {/* ── Global animations ── */}
      <style>{`
        @keyframes fadeSlideUp {
          from { 
            opacity: 0; 
            transform: translateY(16px);
          }
          to { 
            opacity: 1; 
            transform: translateY(0);
          }
        }
        @keyframes pulse {
          0%, 100% { 
            opacity: 1; 
            transform: scale(1);
          }
          50% { 
            opacity: 0.7; 
            transform: scale(1.1);
          }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes animate-rise {
          from { 
            opacity: 0; 
            transform: translateY(20px);
          }
          to { 
            opacity: 1; 
            transform: translateY(0);
          }
        }
        .animate-rise {
          animation: animate-rise 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
