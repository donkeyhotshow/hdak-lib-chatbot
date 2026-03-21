"use client";

import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Plus, MessageSquare, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { uk } from "date-fns/locale";
import { useState } from "react";

interface Conversation {
  id: number;
  title: string;
  createdAt: string;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function Home() {
  const router = useRouter();
  const { data: conversations, error, isLoading, mutate } = useSWR<Conversation[]>(
    "/api/conversations",
    fetcher,
    { refreshInterval: 0 }
  );
  const [creating, setCreating] = useState(false);

  const createConversation = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Нова розмова" }),
      });
      const newConversation = await res.json();
      await mutate();
      router.push(`/chat/${newConversation.id}`);
    } catch (err) {
      console.error("Failed to create conversation:", err);
    } finally {
      setCreating(false);
    }
  };

  const deleteConversation = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/conversations/${id}`, { method: "DELETE" });
      await mutate();
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      {/* Header */}
      <header className="border-b border-[hsl(var(--border))] bg-[hsl(38_70%_97%)]">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-serif font-bold text-[hsl(var(--b0))]">
                Бібліотечний асистент ХДАК
              </h1>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                AI-асистент Наукової бібліотеки Харківської державної академії культури
              </p>
            </div>
            <button
              onClick={createConversation}
              disabled={creating}
              className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--b0))] text-[hsl(var(--primary-foreground))] rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {creating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span className="text-sm font-medium">Нова розмова</span>
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-[hsl(var(--b3))] animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-[hsl(var(--muted-foreground))]">
              Не вдалося завантажити розмови
            </p>
          </div>
        ) : conversations && conversations.length > 0 ? (
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-[hsl(var(--b3))] uppercase tracking-wide mb-4">
              Ваші розмови
            </h2>
            {conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => router.push(`/chat/${conv.id}`)}
                className="group flex items-center justify-between p-4 bg-[hsl(38_70%_97%)] border border-[hsl(var(--border))] rounded-xl cursor-pointer hover:border-[hsl(var(--b4))] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[hsl(var(--muted))] rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-[hsl(var(--b3))]" />
                  </div>
                  <div>
                    <h3 className="font-medium text-[hsl(var(--b0))]">
                      {conv.title}
                    </h3>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      {format(new Date(conv.createdAt), "d MMMM yyyy, HH:mm", { locale: uk })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => deleteConversation(conv.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-2 text-[hsl(var(--muted-foreground))] hover:text-red-600 transition-all"
                  aria-label="Видалити розмову"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-[hsl(var(--muted))] rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-[hsl(var(--b3))]" />
            </div>
            <h2 className="text-xl font-serif font-bold text-[hsl(var(--b0))] mb-2">
              Ще немає розмов
            </h2>
            <p className="text-[hsl(var(--muted-foreground))] mb-6">
              Почніть нову розмову, щоб отримати допомогу від бібліотечного асистента
            </p>
            <button
              onClick={createConversation}
              disabled={creating}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[hsl(var(--b0))] text-[hsl(var(--primary-foreground))] rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {creating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span className="font-medium">Нова розмова</span>
            </button>
          </div>
        )}

        {/* Quick info */}
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          <div className="p-4 bg-[hsl(38_70%_97%)] border border-[hsl(var(--border))] rounded-xl">
            <h3 className="font-medium text-[hsl(var(--b0))] mb-2">Електронний каталог</h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-3">
              Пошук книг, журналів та документів
            </p>
            <a
              href="https://library-service.com.ua:8443/khkhdak/DocumentSearchForm"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[hsl(var(--b2))] underline underline-offset-2 hover:text-[hsl(var(--b0))]"
            >
              Відкрити каталог
            </a>
          </div>
          <div className="p-4 bg-[hsl(38_70%_97%)] border border-[hsl(var(--border))] rounded-xl">
            <h3 className="font-medium text-[hsl(var(--b0))] mb-2">Репозитарій ХДАК</h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-3">
              Наукові праці та дисертації
            </p>
            <a
              href="http://repo.hdak.edu.ua/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[hsl(var(--b2))] underline underline-offset-2 hover:text-[hsl(var(--b0))]"
            >
              Перейти до репозитарію
            </a>
          </div>
          <div className="p-4 bg-[hsl(38_70%_97%)] border border-[hsl(var(--border))] rounded-xl">
            <h3 className="font-medium text-[hsl(var(--b0))] mb-2">Офіційний сайт</h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-3">
              Новини та анонси бібліотеки
            </p>
            <a
              href="https://lib-hdak.in.ua/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[hsl(var(--b2))] underline underline-offset-2 hover:text-[hsl(var(--b0))]"
            >
              Відвідати сайт
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
