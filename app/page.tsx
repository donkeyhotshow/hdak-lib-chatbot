"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect, useCallback } from "react";
import { AppHeader } from "@/components/app-header";

const BigBookIcon = () => (
  <svg width="64" height="50" viewBox="0 0 64 50" fill="none" aria-hidden="true">
    <path d="M32 7C32 7 23 5 9 8L8 41C22 38 31 40 32 40L32 7Z"
      fill="rgba(58,34,16,0.07)" stroke="rgba(58,34,16,0.2)" strokeWidth="1"/>
    <path d="M32 7C32 7 41 5 55 8L56 41C42 38 33 40 32 40L32 7Z"
      fill="rgba(58,34,16,0.05)" stroke="rgba(58,34,16,0.16)" strokeWidth="1"/>
    <line x1="32" y1="6" x2="32" y2="40" stroke="rgba(58,34,16,0.35)" strokeWidth="1.4"/>
    <line x1="32" y1="6" x2="32" y2="40" stroke="rgba(192,136,64,0.5)" strokeWidth="0.6"/>
    <line x1="13" y1="16" x2="27" y2="15" stroke="rgba(58,34,16,0.15)" strokeWidth="1"/>
    <line x1="13" y1="20" x2="27" y2="19" stroke="rgba(58,34,16,0.15)" strokeWidth="1"/>
    <line x1="13" y1="24" x2="27" y2="23" stroke="rgba(58,34,16,0.15)" strokeWidth="1"/>
    <line x1="13" y1="28" x2="27" y2="27" stroke="rgba(58,34,16,0.1)" strokeWidth="1"/>
    <line x1="13" y1="32" x2="22" y2="31.5" stroke="rgba(58,34,16,0.1)" strokeWidth="1"/>
    <line x1="37" y1="15" x2="51" y2="16" stroke="rgba(58,34,16,0.15)" strokeWidth="1"/>
    <line x1="37" y1="19" x2="51" y2="20" stroke="rgba(58,34,16,0.15)" strokeWidth="1"/>
    <line x1="37" y1="23" x2="51" y2="24" stroke="rgba(58,34,16,0.15)" strokeWidth="1"/>
    <line x1="37" y1="27" x2="51" y2="28" stroke="rgba(58,34,16,0.1)" strokeWidth="1"/>
    <line x1="37" y1="31.5" x2="46" y2="32" stroke="rgba(58,34,16,0.1)" strokeWidth="1"/>
    <ellipse cx="32" cy="41.5" rx="21" ry="2.5" fill="rgba(58,34,16,0.07)"/>
  </svg>
);

const CHIPS = [
  { label: "Каталог", highlight: true },
  { label: "Записатися" },
  { label: "Графік" },
  { label: "Контакти" },
];

export default function Home() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [creating, setCreating] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 116)}px`;
  }, [input]);

  const createConversationAndSend = useCallback(async (message: string) => {
    if (creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: message.slice(0, 50) }),
      });
      const newConversation = await res.json();
      // Store the message to send after redirect
      sessionStorage.setItem("pendingMessage", message);
      router.push(`/chat/${newConversation.id}`);
    } catch (err) {
      console.error("Failed to create conversation:", err);
      setCreating(false);
    }
  }, [creating, router]);

  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || creating) return;
    createConversationAndSend(trimmed);
  }, [input, creating, createConversationAndSend]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const handleChip = useCallback((label: string) => {
    if (creating) return;
    createConversationAndSend(label);
  }, [creating, createConversationAndSend]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        maxWidth: 720,
        margin: "0 auto",
        background: "var(--paper)",
        borderLeft: "0.5px solid rgba(255,255,255,0.04)",
        borderRight: "0.5px solid rgba(255,255,255,0.04)",
        overflow: "hidden",
      }}
    >
      <AppHeader />

      {/* Landing */}
      <div
        className="animate-rise"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 24px 20px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18, marginBottom: 28 }}>
          <BigBookIcon />
          <div>
            <h1
              style={{
                fontFamily: "var(--ff-s)",
                fontSize: 27,
                fontWeight: 400,
                color: "var(--ink)",
                letterSpacing: "-0.02em",
                lineHeight: 1.15,
                textAlign: "center",
              }}
            >
              Чим можу допомогти?
            </h1>
            <p
              style={{
                fontSize: 13.5,
                color: "var(--ink3)",
                lineHeight: 1.65,
                maxWidth: 280,
                fontWeight: 300,
                textAlign: "center",
                marginTop: 8,
              }}
            >
              Знайду книги в каталозі, розповім про послуги і ресурси бібліотеки ХДАК.
            </p>
          </div>
        </div>

        {/* Input box */}
        <div style={{ width: "100%", maxWidth: 520 }}>
          <form
            onSubmit={handleSubmit}
            style={{
              background: "#fff",
              border: "1px solid var(--ln2)",
              borderRadius: 16,
              transition: "border-color 0.14s, box-shadow 0.14s",
            }}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Запитайте про бібліотеку…"
              rows={1}
              disabled={creating}
              aria-label="Введіть запитання"
              style={{
                display: "block",
                width: "100%",
                background: "transparent",
                border: "none",
                outline: "none",
                color: "var(--ink)",
                fontSize: 15,
                fontFamily: "var(--ff-b)",
                fontWeight: 300,
                resize: "none",
                lineHeight: 1.55,
                padding: "13px 16px 0",
                minHeight: 46,
                maxHeight: 116,
              }}
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "5px 7px 7px 12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 3, overflow: "hidden" }}>
                <div style={{ display: "flex", gap: 3, overflowX: "auto" }}>
                  {CHIPS.map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => handleChip(chip.label)}
                      disabled={creating}
                      style={{
                        height: 23,
                        padding: "0 9px",
                        flexShrink: 0,
                        background: "transparent",
                        border: chip.highlight
                          ? "0.5px solid var(--goldb)"
                          : "0.5px solid var(--ln2)",
                        borderRadius: 100,
                        color: chip.highlight ? "var(--gold)" : "var(--ink3)",
                        fontSize: 11,
                        fontWeight: 300,
                        fontFamily: "var(--ff-b)",
                        whiteSpace: "nowrap",
                        cursor: creating ? "not-allowed" : "pointer",
                        opacity: creating ? 0.5 : 1,
                        transition: "all 0.1s",
                      }}
                    >
                      {chip.highlight && "🔍 "}{chip.label}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="submit"
                disabled={!input.trim() || creating}
                aria-label="Надіслати"
                style={{
                  width: 30,
                  height: 30,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: !input.trim() || creating ? "var(--paper3)" : "var(--dk1)",
                  border: "none",
                  borderRadius: 9,
                  color: !input.trim() || creating ? "var(--ink4)" : "rgba(240,225,200,0.9)",
                  cursor: !input.trim() || creating ? "not-allowed" : "pointer",
                  transition: "background 0.12s, transform 0.1s",
                }}
              >
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 7H1"/><path d="M8 2l5 5-5 5"/>
                </svg>
              </button>
            </div>
          </form>
          <p
            className="hidden md:block"
            style={{
              fontSize: 10,
              color: "var(--ink4)",
              textAlign: "center",
              paddingTop: 6,
            }}
          >
            Enter — надіслати · Shift+Enter — рядок
          </p>
        </div>
      </div>
    </div>
  );
}
