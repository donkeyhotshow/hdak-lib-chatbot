"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock3, Database, Loader2, Play, RefreshCw, ShieldAlert, XCircle } from "lucide-react";

type SyncStatus = {
  status: "never" | "running" | "ok" | "error";
  mode: "mock" | "rest" | "oai-pmh" | null;
  syncedAt: string | null;
  itemCount: number;
  error: string | null;
};

type Snapshot = {
  status: SyncStatus;
  config: {
    restConfigured: boolean;
    oaiConfigured: boolean;
    repositoryUrl: string | null;
    maxItems: number;
    adminTokenConfigured: boolean;
  };
};

const emptySnapshot: Snapshot = {
  status: {
    status: "never",
    mode: null,
    syncedAt: null,
    itemCount: 0,
    error: null,
  },
  config: {
    restConfigured: false,
    oaiConfigured: false,
    repositoryUrl: null,
    maxItems: 1000,
    adminTokenConfigured: false,
  },
};

const statusLabels: Record<SyncStatus["status"], string> = {
  never: "Ще не запускалася",
  running: "Виконується",
  ok: "Синхронізовано",
  error: "Помилка",
};

const modeLabels: Record<NonNullable<SyncStatus["mode"]>, string> = {
  mock: "Демонстраційні дані",
  rest: "DSpace REST API",
  "oai-pmh": "OAI-PMH",
};

export default function DspaceAdminPage() {
  const [snapshot, setSnapshot] = useState<Snapshot>(emptySnapshot);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<SyncStatus["mode"]>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/dspace/admin", { cache: "no-store" });
      const data = (await response.json()) as Snapshot;
      if (!response.ok) throw new Error("Не вдалося завантажити статус");
      setSnapshot(data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не вдалося завантажити статус");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  async function runSync(mode: NonNullable<SyncStatus["mode"]>) {
    setSyncing(mode);
    setMessage(null);
    try {
      const response = await fetch("/api/dspace/admin", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token.trim() ? { "x-dspace-admin-token": token.trim() } : {}),
        },
        body: JSON.stringify({ mode }),
      });
      const data = (await response.json()) as Snapshot & { error?: string };
      if (!response.ok) throw new Error(data.error || "Синхронізація не виконана");
      setSnapshot(data);
      setMessage(mode === "mock" ? "Демонстраційні дані завантажено." : "Синхронізацію завершено.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Синхронізація не виконана");
      await loadStatus();
    } finally {
      setSyncing(null);
    }
  }

  const current = snapshot.status;
  const statusIcon =
    current.status === "ok" ? <CheckCircle2 className="text-emerald-700" size={22} /> :
    current.status === "error" ? <XCircle className="text-red-700" size={22} /> :
    current.status === "running" ? <Loader2 className="animate-spin text-amber-700" size={22} /> :
    <Clock3 className="text-[#8b5e3c]" size={22} />;

  return (
    <main className="min-h-screen bg-[#f5efe6] px-4 py-6 text-[#3b2a1f] sm:px-8 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="mb-8 inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm text-[#6b5240] transition hover:bg-[#eadfcf]">
          <ArrowLeft size={17} /> Повернутися до чату
        </Link>

        <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#8b5e3c]">Адміністрування бібліотеки</p>
            <h1 className="font-serif text-3xl font-semibold sm:text-4xl">Синхронізація DSpace</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b5240]">
              Перевіряйте доступність репозитарію, запускайте початкове завантаження документів та контролюйте якість індексу.
            </p>
          </div>
          <button type="button" onClick={() => void loadStatus()} disabled={loading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#cbb99e] bg-[#fffaf2] px-4 text-sm font-semibold shadow-sm transition hover:border-[#8b5e3c] disabled:opacity-60">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Оновити статус
          </button>
        </header>

        <section className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#d9c9b0] bg-[#fffaf2] p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-sm text-[#6b5240]"><Database size={17} /> Статус</div>
            <div className="flex items-center gap-2 text-lg font-semibold">{statusIcon}{statusLabels[current.status]}</div>
            {current.mode && <p className="mt-2 text-xs text-[#7a6350]">Режим: {modeLabels[current.mode]}</p>}
          </div>
          <div className="rounded-2xl border border-[#d9c9b0] bg-[#fffaf2] p-5 shadow-sm">
            <div className="mb-3 text-sm text-[#6b5240]">Документів в індексі</div>
            <div className="text-3xl font-semibold">{current.itemCount}</div>
            <p className="mt-2 text-xs text-[#7a6350]">Ліміт синхронізації: {snapshot.config.maxItems}</p>
          </div>
          <div className="rounded-2xl border border-[#d9c9b0] bg-[#fffaf2] p-5 shadow-sm">
            <div className="mb-3 text-sm text-[#6b5240]">Остання синхронізація</div>
            <div className="text-lg font-semibold">{current.syncedAt ? new Date(current.syncedAt).toLocaleString("uk-UA") : "Немає даних"}</div>
            <p className="mt-2 text-xs text-[#7a6350]">Помилка: {current.error || "відсутня"}</p>
          </div>
        </section>

        <section className="mb-6 rounded-2xl border border-[#d9c9b0] bg-[#fffaf2] p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-start gap-3">
            <ShieldAlert className="mt-0.5 shrink-0 text-[#8b5e3c]" size={21} />
            <div>
              <h2 className="font-serif text-xl font-semibold">Підключення джерел</h2>
              <p className="mt-1 text-sm leading-6 text-[#6b5240]">Live-запуски захищені серверним токеном <code className="rounded bg-[#eadfcf] px-1.5 py-0.5 text-xs">DSPACE_ADMIN_TOKEN</code>. Токен не зберігається у браузері.</p>
            </div>
          </div>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-xl border border-[#e1d5c3] p-4"><div className="font-semibold">REST API</div><div className="mt-1 text-[#6b5240]">{snapshot.config.restConfigured ? "Endpoint налаштовано" : "DSPACE_API_URL не налаштовано"}</div></div>
            <div className="rounded-xl border border-[#e1d5c3] p-4"><div className="font-semibold">OAI-PMH</div><div className="mt-1 text-[#6b5240]">{snapshot.config.oaiConfigured ? "Endpoint налаштовано" : "DSPACE_OAI_URL не налаштовано"}</div></div>
          </div>
          <p className="mt-4 break-all text-xs text-[#7a6350]">Репозитарій: {snapshot.config.repositoryUrl || "не вказано"}</p>
        </section>

        <section className="rounded-2xl border border-[#d9c9b0] bg-[#fffaf2] p-5 shadow-sm sm:p-6">
          <h2 className="font-serif text-xl font-semibold">Запустити синхронізацію</h2>
          <p className="mt-1 text-sm leading-6 text-[#6b5240]">Спочатку перевірте mock-цикл, потім використайте REST API або OAI-PMH після налаштування endpoint та токена.</p>
          <label className="mt-5 block text-sm font-semibold" htmlFor="dspace-admin-token">Токен адміністратора <span className="font-normal text-[#7a6350]">(для live-режиму)</span></label>
          <input id="dspace-admin-token" type="password" value={token} onChange={event => setToken(event.target.value)} placeholder="Введіть DSPACE_ADMIN_TOKEN" autoComplete="off" className="mt-2 min-h-11 w-full rounded-xl border border-[#cbb99e] bg-white px-3 text-sm outline-none focus:border-[#8b5e3c] focus:ring-2 focus:ring-[#8b5e3c]/20" />
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <SyncButton label="Mock-дані" mode="mock" busy={syncing === "mock"} onClick={() => void runSync("mock")} />
            <SyncButton label="REST API" mode="rest" busy={syncing === "rest"} disabled={!snapshot.config.restConfigured} onClick={() => void runSync("rest")} />
            <SyncButton label="OAI-PMH" mode="oai-pmh" busy={syncing === "oai-pmh"} disabled={!snapshot.config.oaiConfigured} onClick={() => void runSync("oai-pmh")} />
          </div>
          {message && <div role="status" className="mt-4 rounded-xl border border-[#d9c9b0] bg-[#f5efe6] px-4 py-3 text-sm text-[#5d4637]">{message}</div>}
        </section>
      </div>
    </main>
  );
}

function SyncButton({ label, mode, busy, disabled, onClick }: { label: string; mode: NonNullable<SyncStatus["mode"]>; busy: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled || busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#8b5e3c] px-4 text-sm font-semibold text-[#fffaf2] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45">
      {busy ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
      {busy ? "Виконується…" : label}
      {mode === "mock" && <span className="sr-only">демо</span>}
    </button>
  );
}
