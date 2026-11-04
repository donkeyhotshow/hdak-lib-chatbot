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

export function getDspaceStatus(): DspaceSyncStatus {
  return { ...status };
}

function textFromXml(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<[^>]*${tag}[^>]*>([\\s\\S]*?)</[^>]*${tag}>`, "i"));
  return match?.[1]?.replace(/<[^>]+>/g, "").trim() ?? "";
}

function parseOaiRecords(xml: string): DspaceItem[] {
  return [...xml.matchAll(/<record[\s\S]*?<\/record>/gi)].map((match, index) => {
    const record = match[0];
    const title = textFromXml(record, "dc:title") || textFromXml(record, "title") || `Матеріал репозитарію ${index + 1}`;
    const authors = [...record.matchAll(/<dc:creator[^>]*>([\s\S]*?)<\/dc:creator>/gi)].map(m => m[1].replace(/<[^>]+>/g, "").trim()).filter(Boolean);
    const identifier = textFromXml(record, "dc:identifier") || `oai-${index + 1}`;
    const date = textFromXml(record, "dc:date") || "";
    return { id: identifier, title, authors, abstract: textFromXml(record, "dc:description"), date, url: identifier.startsWith("http") ? identifier : `${process.env.DSPACE_URL ?? "https://repository.ac.kharkov.ua"}/handle/${identifier}`, source: "oai-pmh" as const };
  });
}

export async function syncDspace(mode: "mock" | "rest" | "oai-pmh" = "mock"): Promise<DspaceSyncStatus> {
  status = { ...status, status: "running", mode, error: null };
  try {
    if (mode === "mock") {
      items = MOCK_ITEMS.map(item => ({ ...item }));
    } else if (mode === "oai-pmh") {
      const endpoint = process.env.DSPACE_OAI_URL?.trim();
      if (!endpoint) throw new Error("DSPACE_OAI_URL не налаштовано");
      const response = await fetch(endpoint, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error(`OAI-PMH HTTP ${response.status}`);
      items = parseOaiRecords(await response.text());
    } else {
      const endpoint = process.env.DSPACE_API_URL?.trim();
      if (!endpoint) throw new Error("DSPACE_API_URL не налаштовано");
      const response = await fetch(`${endpoint.replace(/\/$/, "")}/discover/search/objects?size=100`, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error(`DSpace REST HTTP ${response.status}`);
      const payload = (await response.json()) as { _embedded?: { searchResult?: { _embedded?: { objects?: Array<{ _embedded?: { indexableObject?: Record<string, unknown> } }>; } } } };
      const objects = payload._embedded?.searchResult?._embedded?.objects ?? [];
      items = objects.map((object, index) => {
        const value = object._embedded?.indexableObject ?? {};
        return { id: String(value.uuid ?? `rest-${index}`), title: String(value.name ?? value.title ?? "Без назви"), authors: Array.isArray(value.metadata) ? value.metadata.map(String) : [], abstract: String(value.abstract ?? ""), date: String(value.dateIssued ?? ""), url: String(value.handle ?? process.env.DSPACE_URL ?? "https://repository.ac.kharkov.ua"), source: "dspace-rest" as const };
      });
    }
    status = { status: "ok", mode, syncedAt: new Date().toISOString(), itemCount: items.length, error: null };
  } catch (error) {
    status = { ...status, status: "error", error: error instanceof Error ? error.message : String(error) };
    logger.warn(`DSpace sync failed (${mode}); chat remains available`);
  }
  return getDspaceStatus();
}

export function searchDspace(query: string, limit = 5): DspaceItem[] {
  if (!items.length) return [];
  const tokens = query.toLocaleLowerCase("uk-UA").split(/[^\p{L}\p{N}]+/u).filter(token => token.length >= 3);
  return items.filter(item => {
    const haystack = `${item.title} ${item.authors.join(" ")} ${item.abstract}`.toLocaleLowerCase("uk-UA");
    return tokens.some(token => haystack.includes(token));
  }).slice(0, limit);
}

export function buildDspaceContext(query: string): string {
  const found = searchDspace(query);
  if (!found.length) return "";
  const lines = found.map((item, index) => `${index + 1}. ${item.title} — ${item.authors.join(", ") || "автор не вказаний"} (${item.date || "рік не вказаний"})\n   ${item.url}`);
  return `\n\n[ДЖЕРЕЛО: РЕПОЗИТАРІЙ ХДАК / DSpace]\nПісля синхронізації знайдено матеріали за запитом «${query}»:\n${lines.join("\n")}\nУ відповіді обов'язково назвіть джерело: «Репозитарій ХДАК (DSpace)».`;
}

export function buildDspaceAnswer(query: string): string | null {
  const found = searchDspace(query);
  if (!found.length) return null;
  return [
    `**Джерело: Репозитарій ХДАК (DSpace).** За запитом «${query}» знайдено:`,
    ...found.map(item => `- **${item.title}** — ${item.authors.join(", ") || "автор не вказаний"} (${item.date || "рік не вказаний"})\n  ${item.url}`),
    "Якщо потрібен інший матеріал, зверніться до бібліотекаря або подайте тематичний запит.",
  ].join("\n");
}
