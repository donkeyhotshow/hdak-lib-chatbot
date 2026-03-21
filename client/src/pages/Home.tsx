import { useCreateConversation } from "@/hooks/use-chat";
import { useLocation } from "wouter";
import { Library, Search, BookOpen, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: Search,
    title: "Пошук у каталозі",
    desc: "Знайдіть книги та матеріали в електронному каталозі бібліотеки.",
  },
  {
    icon: BookOpen,
    title: "Довідник бібліотеки",
    desc: "Дізнайтесь про правила, графік роботи та послуги.",
  },
  {
    icon: MessageCircle,
    title: "Допомога з науковими ресурсами",
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
      className="h-full overflow-y-auto scrollbar-thin flex flex-col items-center justify-center p-8 text-center"
      style={{ background: "hsl(var(--brown-50))" }}
    >
      <div className="w-full max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="space-y-8"
        >
          {/* Icon */}
          <div className="relative inline-block">
            <div
              className="absolute inset-0 blur-3xl rounded-full opacity-30"
              style={{ background: "hsl(var(--brown-400))" }}
            />
            <div
              className="relative p-6 rounded-3xl shadow-xl border"
              style={{
                background: "hsl(var(--brown-50))",
                borderColor: "hsl(var(--brown-200))",
                boxShadow: "0 8px 32px rgb(92 58 30 / 0.15)",
              }}
            >
              <Library className="w-16 h-16" style={{ color: "hsl(var(--brown-700))" }} />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-4">
            <h1
              className="text-4xl md:text-5xl font-serif font-bold tracking-tight"
              style={{ color: "hsl(var(--brown-900))" }}
            >
              Бібліотечний асистент ХДАК
            </h1>
            <p
              className="text-lg leading-relaxed max-w-lg mx-auto"
              style={{ color: "hsl(var(--brown-600))" }}
            >
              AI-провідник по каталогу, ресурсах та послугах Наукової бібліотеки ХДАК.
            </p>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.08, duration: 0.3 }}
                className="p-4 rounded-xl border transition-shadow hover:shadow-md"
                style={{
                  background: "hsl(var(--brown-50))",
                  borderColor: "hsl(var(--brown-200))",
                  boxShadow: "0 1px 4px rgb(92 58 30 / 0.06)",
                }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                  style={{
                    background: "hsl(var(--brown-100))",
                    color: "hsl(var(--brown-600))",
                  }}
                >
                  <f.icon className="w-5 h-5" />
                </div>
                <h3
                  className="font-semibold mb-1 text-sm"
                  style={{ color: "hsl(var(--brown-800))" }}
                >
                  {f.title}
                </h3>
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: "hsl(var(--brown-500))" }}
                >
                  {f.desc}
                </p>
              </motion.div>
            ))}
          </div>

          {/* CTA */}
          <div className="pt-2">
            <button
              onClick={handleStartChat}
              disabled={createMutation.isPending}
              data-testid="button-start-chat"
              className="
                inline-flex items-center gap-2 h-14 px-8
                text-base font-semibold rounded-2xl
                transition-all duration-200
                shadow-lg hover:shadow-xl
                hover:-translate-y-0.5
                disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0
              "
              style={{
                background: "hsl(var(--brown-700))",
                color: "hsl(var(--brown-50))",
                boxShadow: "0 4px 16px rgb(92 58 30 / 0.3)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "hsl(var(--brown-600))";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "hsl(var(--brown-700))";
              }}
            >
              {createMutation.isPending ? "Створення..." : "Розпочати розмову"}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
