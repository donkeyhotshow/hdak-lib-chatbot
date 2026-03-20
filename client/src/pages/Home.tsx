import { Button } from "@/components/ui/button";
import { useCreateConversation } from "@/hooks/use-chat";
import { useLocation } from "wouter";
import { BookOpen, Search, ScrollText, MessageCircle, BookMarked } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: Search,
    title: "Пошук у каталозі",
    desc: "Знайдіть книги та матеріали через електронний каталог ХДАК.",
  },
  {
    icon: ScrollText,
    title: "Правила та послуги",
    desc: "Дізнайтеся про режим роботи, умови користування та відділи.",
  },
  {
    icon: MessageCircle,
    title: "Допомога з науковими ресурсами",
    desc: "Навігація по репозитарію та базах даних для вашого дослідження.",
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.35, delay: i * 0.1, ease: "easeOut" },
  }),
};

export default function Home() {
  const [_, setLocation] = useLocation();
  const createMutation = useCreateConversation();

  const handleStart = () => {
    createMutation.mutate(undefined, {
      onSuccess: (conv) => setLocation(`/chat/${conv.id}`),
    });
  };

  return (
    <div className="h-full overflow-y-auto scrollbar-parchment parchment-bg">
      <div className="min-h-full flex flex-col items-center justify-center p-8 py-16">
        <div className="w-full max-w-2xl mx-auto text-center space-y-10">

          {/* Icon + Title */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="space-y-6"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-amber-800 shadow-xl shadow-amber-900/30 border border-amber-700/60">
              <BookMarked className="w-10 h-10 text-amber-200" />
            </div>

            <div className="space-y-3">
              <h1 className="text-4xl md:text-5xl font-serif font-bold text-amber-900 tracking-tight leading-tight">
                Бібліотечний асистент
              </h1>
              <p className="text-lg text-amber-700/75 leading-relaxed max-w-md mx-auto font-light">
                Наукова бібліотека ХДАК — ваш AI-провідник по каталогу, ресурсах та послугах бібліотеки.
              </p>
            </div>
          </motion.div>

          {/* Feature cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                custom={i}
                initial="hidden"
                animate="show"
                variants={cardVariants}
                className="
                  p-5 text-left rounded-2xl border border-amber-200/70
                  bg-white/60 hover:bg-white/90 backdrop-blur-sm
                  shadow-sm hover:shadow-md
                  transition-all duration-200
                "
              >
                <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-200/60 flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-amber-800" />
                </div>
                <h3 className="font-semibold text-amber-900 mb-1.5 text-sm leading-snug">{f.title}</h3>
                <p className="text-xs text-amber-700/65 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45, duration: 0.35 }}
          >
            <button
              onClick={handleStart}
              disabled={createMutation.isPending}
              data-testid="button-start-chat"
              className="
                inline-flex items-center gap-2.5 px-8 py-4 text-base font-semibold rounded-2xl
                bg-amber-800 hover:bg-amber-700 text-amber-100
                border border-amber-700/60 hover:border-amber-600
                shadow-lg shadow-amber-900/25 hover:shadow-amber-900/35
                hover:-translate-y-0.5
                transition-all duration-200
                disabled:opacity-60 disabled:cursor-not-allowed
              "
            >
              <BookOpen className="w-5 h-5" />
              {createMutation.isPending ? "Створення..." : "Почати розмову"}
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
