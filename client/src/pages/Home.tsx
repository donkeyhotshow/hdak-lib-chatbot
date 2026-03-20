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
    <div className="h-full overflow-y-auto scrollbar-thin flex flex-col items-center justify-center p-8 text-center">
      <div className="w-full max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="space-y-8"
        >
          {/* Icon */}
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
            <div className="relative bg-white p-6 rounded-3xl shadow-xl shadow-primary/10 border border-border">
              <Library className="w-16 h-16 text-primary" />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground tracking-tight">
              Бібліотечний асистент ХДАК
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-lg mx-auto">
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
                className="p-4 bg-white rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow"
              >
                <f.icon className="w-6 h-6 text-primary mb-3" />
                <h3 className="font-semibold text-foreground mb-1 text-sm">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
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
                inline-flex items-center gap-2 h-14 px-8 text-base font-semibold rounded-2xl
                bg-primary hover:bg-primary/90 text-primary-foreground
                shadow-lg shadow-primary/25 hover:-translate-y-0.5
                transition-all duration-200
                disabled:opacity-60 disabled:cursor-not-allowed
              "
            >
              {createMutation.isPending ? "Створення..." : "Розпочати розмову"}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
