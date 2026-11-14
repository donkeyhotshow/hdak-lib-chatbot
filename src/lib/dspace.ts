import { timingSafeEqual } from "node:crypto";
import { logger } from "@/lib/logger";

export type DspaceItem = {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  date: string;
  url: string;
  source: "dspace-mock" | "dspace-rest" | "oai-pmh";
};

export type DspaceSyncStatus = {
  status: "never" | "running" | "ok" | "error";
  mode: "mock" | "rest" | "oai-pmh" | null;
  syncedAt: string | null;
  itemCount: number;
  error: string | null;
};

export type DspaceConfigStatus = {
  restConfigured: boolean;
  oaiConfigured: boolean;
  repositoryUrl: string | null;
  maxItems: number;
  adminTokenConfigured: boolean;
};

const MOCK_ITEMS: DspaceItem[] = [
  {
    id: "mock-1",
    title: "Цифрові технології в культурі та мистецтві",
    authors: ["Коваленко, О. В."],
    abstract: "Дослідження цифрових практик у культурних інституціях та мистецькій освіті.",
    date: "2024",
    url: "https://repository.ac.kharkov.ua/handle/mock-1",
    source: "dspace-mock",
  },
  {
    id: "mock-2",
    title: "Менеджмент соціокультурної діяльності",
    authors: ["Шейко, В. М.", "Кушнаренко, Н. М."],
    abstract: "Матеріали про організацію, планування та оцінювання соціокультурних проєктів.",
    date: "2023",
    url: "https://repository.ac.kharkov.ua/handle/mock-2",
    source: "dspace-mock",
  },
  {
    id: "mock-3",
    title: "Українська культура: історія та сучасність",
    authors: ["Харківська державна академія культури"],
    abstract: "Наукові праці та оглядові матеріали з історії української культури.",
    date: "2022",
    url: "https://repository.ac.kharkov.ua/handle/mock-3",
    source: "dspace-mock",
  },
];

let items: DspaceItem[] = [];
let status: DspaceSyncStatus = {
  status: "never",
  mode: null,
  syncedAt: null,
  itemCount: 0,
  error: null,
};

const DEFAULT_REPOSITORY_URL = "https://repository.ac.kharkov.ua";
const DEFAULT_MAX_ITEMS = 1000;
const DEFAULT_TIMEOUT_MS = 15_000;

export function getDspaceStatus(): DspaceSyncStatus {
  return { ...status };
}

export function getDspaceConfigStatus(): DspaceConfigStatus {
  return {
    restConfigured: Boolean(process.env.DSPACE_API_URL?.trim()),
    oaiConfigured: Boolean(process.env.DSPACE_OAI_URL?.trim()),
    repositoryUrl: process.env.DSPACE_URL?.trim() || DEFAULT_REPOSITORY_URL,
    maxItems: getMaxItems(),
    adminTokenConfigured: Boolean(process.env.DSPACE_ADMIN_TOKEN?.trim()),
  };
}

/**
 * Mock sync is intentionally allowed without a token for local demonstrations.
 * Live sync must have an explicitly configured server-side admin token.
 */
export function isDspaceAdminAuthorized(
  suppliedToken: string | null,
  mode: "mock" | "rest" | "oai-pmh"
): boolean {
  const expected = process.env.DSPACE_ADMIN_TOKEN?.trim();
  if (!expected) return mode === "mock";
  if (!suppliedToken) return false;

  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(suppliedToken.trim());
  return (
    expectedBuffer.length === suppliedBuffer.length &&
    timingSafeEqual(expectedBuffer, suppliedBuffer)
  );
}

function getMaxItems(): number {
  const value = Number.parseInt(process.env.DSPACE_SYNC_MAX_ITEMS ?? "", 10);
  return Number.isFinite(value)
    ? Math.min(10_000, Math.max(1, value))
    : DEFAULT_MAX_ITEMS;
}

function getTimeoutMs(): number {
  const value = Number.parseInt(process.env.DSPACE_SYNC_TIMEOUT_MS ?? "", 10);
  return Number.isFinite(value)
    ? Math.min(60_000, Math.max(1_000, value))
    : DEFAULT_TIMEOUT_MS;
}

function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/<[^>]+>/g, "")
    .trim();
}

function textFromXml(xml: string, localName: string): string {
  const pattern = new RegExp(
    `<(?:[\\w.-]+:)?${localName}\\b[^>]*>([\\s\\S]*?)</(?:[\\w.-]+:)?${localName}>`,
    "i"
  );
  const match = xml.match(pattern);
  return match?.[1] ? decodeXml(match[1]) : "";
}

function allTextsFromXml(xml: string, localName: string): string[] {
  const pattern = new RegExp(
    `<(?:[\\w.-]+:)?${localName}\\b[^>]*>([\\s\\S]*?)</(?:[\\w.-]+:)?${localName}>`,
    "gi"
  );
  return [...xml.matchAll(pattern)]
    .map(match => decodeXml(match[1] ?? ""))
    .filter(Boolean);
}

function parseOaiRecords(xml: string, maxItems: number): DspaceItem[] {
  return [...xml.matchAll(/<record\b[\s\S]*?<\/record>/gi)]
    .slice(0, maxItems)
    .map((match, index) => {
      const record = match[0];
      const title =
        textFromXml(record, "title") || `Матеріал репозитарію ${index + 1}`;
      const authors = allTextsFromXml(record, "creator");
      const identifiers = allTextsFromXml(record, "identifier");
      const identifier = identifiers[0] || `oai-${index + 1}`;
      const date = textFromXml(record, "date");
      const abstract = textFromXml(record, "description");
      return {
        id: identifier,
        title,
        authors,
        abstract,
        date,
        url: toRepositoryUrl(identifier),
        source: "oai-pmh" as const,
      };
    });
}

function metadataValues(
  metadata: unknown,
  keys: string[]
): string[] {
  if (!metadata || typeof metadata !== "object") return [];
  const record = metadata as Record<string, unknown>;
  const values: string[] = [];

  for (const key of keys) {
    const value = record[key];
    const candidates = Array.isArray(value) ? value : value === undefined ? [] : [value];
    for (const candidate of candidates) {
      if (typeof candidate === "string") values.push(candidate);
      else if (candidate && typeof candidate === "object") {
        const candidateRecord = candidate as Record<string, unknown>;
        const text = candidateRecord.value ?? candidateRecord.text;
        if (typeof text === "string") values.push(text);
      }
    }
  }
  return [...new Set(values.map(value => value.trim()).filter(Boolean))];
}

function toRepositoryUrl(value: string): string {
  if (/^https?:\/\//i.test(value)) return value;
  const base = process.env.DSPACE_URL?.trim() || DEFAULT_REPOSITORY_URL;
  return `${base.replace(/\/$/, "")}/handle/${value.replace(/^\/?handle\//i, "")}`;
}

async function fetchRestItems(): Promise<DspaceItem[]> {
  const endpoint = process.env.DSPACE_API_URL?.trim();
  if (!endpoint) throw new Error("DSPACE_API_URL не налаштовано");

  const url = new URL(`${endpoint.replace(/\/$/, "")}/discover/search/objects`);
  url.searchParams.set("size", String(getMaxItems()));
  const response = await fetch(url, { signal: AbortSignal.timeout(getTimeoutMs()) });
  if (!response.ok) throw new Error(`DSpace REST HTTP ${response.status}`);

  const payload = (await response.json()) as {
    _embedded?: {
      searchResult?: {
        _embedded?: {
          objects?: Array<{
            _embedded?: { indexableObject?: Record<string, unknown> };
          }>;
        };
      };
    };
  };
  const objects = payload._embedded?.searchResult?._embedded?.objects ?? [];

  return objects.slice(0, getMaxItems()).map((object, index) => {
    const value = object._embedded?.indexableObject ?? {};
    const metadata = value.metadata;
    const title = metadataValues(metadata, ["dc.title", "title"])[0] ?? String(value.name ?? value.title ?? `Матеріал ${index + 1}`);
    const authors = metadataValues(metadata, ["dc.contributor.author", "dc.creator", "author", "creator"]);
    const abstract = metadataValues(metadata, ["dc.description", "abstract", "description"])[0] ?? String(value.abstract ?? "");
    const date = metadataValues(metadata, ["dc.date.issued", "dc.date", "dateIssued", "date"])[0] ?? "";
    const handle = metadataValues(metadata, ["dc.identifier.uri", "handle"])[0] ?? String(value.handle ?? value.uuid ?? `rest-${index + 1}`);
    return {
      id: String(value.uuid ?? handle),
      title,
      authors,
      abstract,
      date,
      url: toRepositoryUrl(handle),
      source: "dspace-rest" as const,
    };
  });
}

async function fetchOaiItems(): Promise<DspaceItem[]> {
  const endpoint = process.env.DSPACE_OAI_URL?.trim();
  if (!endpoint) throw new Error("DSPACE_OAI_URL не налаштовано");

  const maxItems = getMaxItems();
  const firstUrl = new URL(endpoint);
  firstUrl.searchParams.set("verb", "ListRecords");
  firstUrl.searchParams.set("metadataPrefix", firstUrl.searchParams.get("metadataPrefix") || "oai_dc");
  if (process.env.DSPACE_OAI_SET?.trim()) {
    firstUrl.searchParams.set("set", process.env.DSPACE_OAI_SET.trim());
  }

  const result: DspaceItem[] = [];
  let nextUrl: URL | null = firstUrl;
  while (nextUrl && result.length < maxItems) {
    const response = await fetch(nextUrl, {
      signal: AbortSignal.timeout(getTimeoutMs()),
      headers: { accept: "application/xml,text/xml" },
    });
    if (!response.ok) throw new Error(`OAI-PMH HTTP ${response.status}`);
    const xml = await response.text();
    result.push(...parseOaiRecords(xml, maxItems - result.length));

    const token = textFromXml(xml, "resumptionToken");
    if (!token) {
      nextUrl = null;
    } else {
      nextUrl = new URL(firstUrl);
      nextUrl.search = "";
      nextUrl.searchParams.set("verb", "ListRecords");
      nextUrl.searchParams.set("resumptionToken", token);
    }
  }
  return result.slice(0, maxItems);
}

export async function syncDspace(
  mode: "mock" | "rest" | "oai-pmh" = "mock"
): Promise<DspaceSyncStatus> {
  status = { ...status, status: "running", mode, error: null };
  try {
    const nextItems =
      mode === "mock"
        ? MOCK_ITEMS.map(item => ({ ...item }))
        : mode === "rest"
          ? await fetchRestItems()
          : await fetchOaiItems();

    // Preserve the previous successful index if a live source returns no records.
    if (mode !== "mock" && nextItems.length === 0) {
      throw new Error("Синхронізація завершилася без документів");
    }
    items = nextItems;
    status = {
      status: "ok",
      mode,
      syncedAt: new Date().toISOString(),
      itemCount: items.length,
      error: null,
    };
  } catch (error) {
    status = {
      ...status,
      status: "error",
      itemCount: items.length,
      error: error instanceof Error ? error.message : String(error),
    };
    logger.warn(`DSpace sync failed (${mode}); chat remains available`);
  }
  return getDspaceStatus();
}

export function searchDspace(query: string, limit = 5): DspaceItem[] {
  if (!items.length) return [];
  const tokens = query
    .toLocaleLowerCase("uk-UA")
    .split(/[^\p{L}\p{N}]+/u)
    .filter(token => token.length >= 3);
  return items
    .filter(item => {
      const haystack = `${item.title} ${item.authors.join(" ")} ${item.abstract}`.toLocaleLowerCase("uk-UA");
      return tokens.some(token => haystack.includes(token));
    })
    .slice(0, limit);
}

export function buildDspaceContext(query: string): string {
  const found = searchDspace(query);
  if (!found.length) return "";
  const lines = found.map(
    (item, index) =>
      `${index + 1}. ${item.title} — ${item.authors.join(", ") || "автор не вказаний"} (${item.date || "рік не вказаний"})\n   ${item.url}`
  );
  return `\n\n[ДЖЕРЕЛО: РЕПОЗИТАРІЙ ХДАК / DSpace]\nПісля синхронізації знайдено матеріали за запитом «${query}»:\n${lines.join("\n")}\nУ відповіді обов'язково назвіть джерело: «Репозитарій ХДАК (DSpace)».`;
}

export function buildDspaceAnswer(query: string): string | null {
  const found = searchDspace(query);
  if (!found.length) return null;
  return [
    `**Джерело: Репозитарій ХДАК (DSpace).** За запитом «${query}» знайдено:`,
    ...found.map(
      item =>
        `- **${item.title}** — ${item.authors.join(", ") || "автор не вказаний"} (${item.date || "рік не вказаний"})\n  ${item.url}`
    ),
    "Якщо потрібен інший матеріал, зверніться до бібліотекаря або подайте тематичний запит.",
  ].join("\n");
}
