import { execSync } from "child_process";

const BASE = process.env.CHECK_URL ?? "https://v0-hdak-lib-chatbot.vercel.app";
const results: {
  name: string;
  ok: boolean;
  critical: boolean;
  detail?: string;
}[] = [];

async function check(
  name: string,
  fn: () => Promise<boolean | string>,
  critical = false
) {
  try {
    const r = await fn();
    const ok = r === true || (typeof r === "string" && r.length > 0);
    results.push({
      name,
      ok: ok === true || r === true,
      critical,
      detail: typeof r === "string" ? r : undefined,
    });
  } catch (e: unknown) {
    results.push({
      name,
      ok: false,
      critical,
      detail: e instanceof Error ? e.message : String(e),
    });
  }
}

// ── 1. Health endpoint ────────────────────────────────────────
await check(
  "GET /api/chat/health → ok:true + hasKey:true",
  async () => {
    const r = await fetch(`${BASE}/api/chat/health`);
    const j = (await r.json()) as { ok?: boolean; hasKey?: boolean };
    if (!j.ok) throw new Error("ok is false");
    if (!j.hasKey)
      throw new Error("hasKey is false — ANTHROPIC_API_KEY missing on Vercel");
    return true;
  },
  true
);

// ── 2. Chat API responds ──────────────────────────────────────
await check(
  "POST /api/chat → 200 with content",
  async () => {
    const r = await fetch(`${BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "контакти бібліотеки" }],
      }),
    });
    if (r.status !== 200) throw new Error(`HTTP ${r.status}`);
    const text = await r.text();
    if (text.length < 10) throw new Error("Empty response");
    return true;
  },
  true
);

// ── 3. Catalog API ────────────────────────────────────────────
await check(
  "GET /api/catalog?author=Шевченко → JSON response",
  async () => {
    const r = await fetch(
      `${BASE}/api/catalog?author=%D0%A8%D0%B5%D0%B2%D1%87%D0%B5%D0%BD%D0%BA%D0%BE`
    );
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = (await r.json()) as { ok?: boolean; results?: unknown[] };
    if (typeof j.ok !== "boolean") throw new Error("Missing ok field");
    return `ok:${j.ok}, results:${j.results?.length ?? 0}`;
  },
  true
);

// ── 4. Manifest.json ──────────────────────────────────────────
await check(
  "GET /manifest.json → valid PWA manifest",
  async () => {
    const r = await fetch(`${BASE}/manifest.json`);
    if (!r.ok) throw new Error("manifest.json not found");
    const j = (await r.json()) as {
      name?: string;
      start_url?: string;
      theme_color?: string;
      icons?: unknown[];
    };
    if (!j.name) throw new Error("Missing name");
    if (!j.start_url) throw new Error("Missing start_url");
    if (!j.theme_color) throw new Error("Missing theme_color");
    if (!j.icons?.length) throw new Error("Missing icons");
    return `name:"${j.name}", theme:${j.theme_color}`;
  },
  false
);

// ── 5. TypeScript build ───────────────────────────────────────
await check(
  "npm run build → 0 TypeScript errors",
  async () => {
    execSync("npm run build 2>&1", { stdio: "pipe" });
    return true;
  },
  true
);

// ── 6. Tests pass ─────────────────────────────────────────────
await check(
  "pnpm test → all tests pass",
  async () => {
    execSync("pnpm test --passWithNoTests 2>&1", { stdio: "pipe" });
    return true;
  },
  true
);

// ── 7. runtime=nodejs in catalog route ───────────────────────
await check(
  "app/api/catalog/route.ts has runtime='nodejs'",
  async () => {
    const { readFileSync } = await import("fs");
    const src = readFileSync("app/api/catalog/route.ts", "utf8");
    if (!src.includes("runtime") || !src.includes("nodejs"))
      throw new Error("runtime='nodejs' missing — Vercel will block port 8443");
    return true;
  },
  true
);

// ── 8. maxDuration in chat route ─────────────────────────────
await check(
  "app/api/chat/route.ts has maxDuration",
  async () => {
    const { readFileSync } = await import("fs");
    const src = readFileSync("app/api/chat/route.ts", "utf8");
    if (!src.includes("maxDuration"))
      throw new Error(
        "maxDuration missing — Vercel hobby plan will timeout at 10s"
      );
    return true;
  },
  true
);

// ── 9. No duplicate chips ─────────────────────────────────────
await check(
  "lib/pages/Home.tsx — chips not rendered twice",
  async () => {
    const { readFileSync } = await import("fs");
    const src = readFileSync("lib/pages/Home.tsx", "utf8");
    const matches =
      src.match(/chips\.map|chipsData\.map|quickChips\.map/g) || [];
    if (matches.length > 1)
      throw new Error(
        `Chips render found ${matches.length} times — possible duplicate`
      );
    return true;
  },
  true
);

// ── 10. streaming batching ────────────────────────────────────
await check(
  "lib/pages/Home.tsx — streaming uses buffer (not per-char setState)",
  async () => {
    const { readFileSync } = await import("fs");
    const src = readFileSync("lib/pages/Home.tsx", "utf8");
    if (
      !src.includes("streamBufRef") &&
      !src.includes("flushTimer") &&
      !src.includes("setTimeout")
    )
      throw new Error(
        "No streaming buffer found — setState called per chunk causes re-render storm"
      );
    return true;
  },
  false
);

// ── 11. React.memo on messages ────────────────────────────────
await check(
  "React.memo used on message component",
  async () => {
    const { readFileSync } = await import("fs");
    const src = readFileSync("lib/pages/Home.tsx", "utf8");
    if (!src.includes("React.memo") && !src.includes("memo("))
      throw new Error(
        "React.memo not found — all messages re-render on every stream chunk"
      );
    return true;
  },
  false
);

// ── 12. ARIA live region ──────────────────────────────────────
await check(
  "lib/pages/Home.tsx — aria-live on chat container",
  async () => {
    const { readFileSync } = await import("fs");
    const src = readFileSync("lib/pages/Home.tsx", "utf8");
    if (!src.includes("aria-live"))
      throw new Error(
        "aria-live missing — screen readers cannot read bot responses"
      );
    return true;
  },
  true
);

// ── PRINT RESULTS ─────────────────────────────────────────────
console.log("\n" + "═".repeat(55));
console.log(" HDAK Chatbot — Production Checklist");
console.log("═".repeat(55));

let failed = 0;
for (const r of results) {
  const icon = r.ok ? "✅" : r.critical ? "❌" : "⚠️";
  const label = r.critical && !r.ok ? " [CRITICAL]" : "";
  console.log(`${icon} ${r.name}${label}`);
  if (!r.ok && r.detail) console.log(`   → ${r.detail}`);
  if (!r.ok && r.critical) failed++;
}

const total = results.length;
const passed = results.filter(r => r.ok).length;
const critical = results.filter(r => r.critical && !r.ok).length;

console.log("═".repeat(55));
console.log(
  `Results: ${passed}/${total} passed · ${critical} critical failures`
);
console.log("═".repeat(55) + "\n");

if (critical > 0) {
  console.error(
    `❌ ${critical} critical check(s) failed. Not ready for production.`
  );
  process.exit(1);
} else {
  console.log("✅ All critical checks passed.");
  process.exit(0);
}
