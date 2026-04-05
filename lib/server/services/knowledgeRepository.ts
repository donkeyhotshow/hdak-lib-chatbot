import * as db from "../db";
import type { LibraryKnowledgeTopic } from "./libraryKnowledge";

export type EditableKnowledgeEntry = {
  id: string;
  topic: string;
  title: string;
  keywords: string[];
  shortFacts: string[];
  policySnippets: string[];
  sourceUrls: string[];
  sourceBadge: "quick" | "catalog" | "official-rule";
  suggestedFollowUps: string[];
  enabled: boolean;
  updatedAt: string;
  overrideBuiltInId?: string | null;
};

export type EditableKnowledgeEntryInput = Omit<
  EditableKnowledgeEntry,
  "updatedAt"
>;

export const KNOWLEDGE_STORAGE_KEY = "editable-knowledge-entries-v1";
const OFFICIAL_HOST = "lib-hdak.in.ua";

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeList(values: string[]): string[] {
  return [...new Set(values.map(normalizeText).filter(Boolean))];
}

function ensureOfficialUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname === OFFICIAL_HOST;
  } catch {
    return false;
  }
}

function createEntryId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `knowledge-${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
}

function parseStoredEntries(raw: string): EditableKnowledgeEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as EditableKnowledgeEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(item => ({
        ...item,
        topic: normalizeText(item.topic),
        title: normalizeText(item.title),
        keywords: normalizeList(item.keywords ?? []),
        shortFacts: normalizeList(item.shortFacts ?? []),
        policySnippets: normalizeList(item.policySnippets ?? []),
        sourceUrls: normalizeList(item.sourceUrls ?? []),
        suggestedFollowUps: normalizeList(item.suggestedFollowUps ?? []),
        overrideBuiltInId: item.overrideBuiltInId ?? null,
      }))
      .filter(item => item.id && item.topic && item.title);
  } catch {
    return [];
  }
}

function validateEntry(
  entry: EditableKnowledgeEntryInput,
  existing: EditableKnowledgeEntry[]
) {
  if (!entry.id || !normalizeText(entry.id)) {
    throw new Error("Knowledge entry id is required.");
  }
  if (!normalizeText(entry.topic)) {
    throw new Error("Knowledge topic is required.");
  }
  if (!normalizeText(entry.title)) {
    throw new Error("Knowledge title is required.");
  }
  if (!entry.keywords || normalizeList(entry.keywords).length === 0) {
    throw new Error("At least one keyword is required.");
  }
  if (!entry.sourceUrls || normalizeList(entry.sourceUrls).length === 0) {
    throw new Error("At least one source URL is required.");
  }
  if (
    !["quick", "catalog", "official-rule"].includes(entry.sourceBadge as string)
  ) {
    throw new Error("Invalid source badge.");
  }
  const nonOfficialUrl = entry.sourceUrls.find(url => !ensureOfficialUrl(url));
  if (nonOfficialUrl) {
    throw new Error(
      `Only official lib-hdak.in.ua URLs are allowed (${nonOfficialUrl}).`
    );
  }

  const normalizedTopic = normalizeText(entry.topic).toLowerCase();
  const duplicateTopic = existing.find(
    item =>
      item.id !== entry.id &&
      (item.overrideBuiltInId ?? null) === (entry.overrideBuiltInId ?? null) &&
      item.topic.toLowerCase() === normalizedTopic
  );
  if (duplicateTopic) {
    throw new Error(
      "Duplicate topic detected. Use duplicate button or override."
    );
  }
}

export async function listEditableKnowledgeEntries(): Promise<
  EditableKnowledgeEntry[]
> {
  const info = await db.getLibraryInfo(KNOWLEDGE_STORAGE_KEY);
  const raw = info?.valueUk ?? info?.valueEn ?? info?.valueRu ?? "[]";
  return parseStoredEntries(raw).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt)
  );
}

async function saveEntries(entries: EditableKnowledgeEntry[]) {
  const payload = JSON.stringify(entries);
  const saved = await db.setLibraryInfo(
    KNOWLEDGE_STORAGE_KEY,
    payload,
    payload,
    payload
  );
  if (!saved) throw new Error("Failed to persist knowledge entries.");
}

export async function createEditableKnowledgeEntry(
  input: Omit<EditableKnowledgeEntryInput, "id"> & { id?: string }
): Promise<EditableKnowledgeEntry> {
  const entries = await listEditableKnowledgeEntries();
  const nextEntry: EditableKnowledgeEntryInput = {
    ...input,
    id: normalizeText(input.id ?? "") || createEntryId(),
    topic: normalizeText(input.topic),
    title: normalizeText(input.title),
    keywords: normalizeList(input.keywords),
    shortFacts: normalizeList(input.shortFacts),
    policySnippets: normalizeList(input.policySnippets),
    sourceUrls: normalizeList(input.sourceUrls),
    sourceBadge: input.sourceBadge,
    suggestedFollowUps: normalizeList(input.suggestedFollowUps),
    enabled: input.enabled ?? true,
    overrideBuiltInId: input.overrideBuiltInId ?? null,
  };
  validateEntry(nextEntry, entries);
  const created: EditableKnowledgeEntry = {
    ...nextEntry,
    updatedAt: new Date().toISOString(),
  };
  await saveEntries([created, ...entries]);
  return created;
}

export async function updateEditableKnowledgeEntry(
  id: string,
  input: Partial<Omit<EditableKnowledgeEntryInput, "id">>
): Promise<EditableKnowledgeEntry> {
  const entries = await listEditableKnowledgeEntries();
  const existing = entries.find(entry => entry.id === id);
  if (!existing) {
    throw new Error("Knowledge entry not found.");
  }
  const updatedInput: EditableKnowledgeEntryInput = {
    ...existing,
    ...input,
    id,
    topic: normalizeText(input.topic ?? existing.topic),
    title: normalizeText(input.title ?? existing.title),
    keywords: normalizeList(input.keywords ?? existing.keywords),
    shortFacts: normalizeList(input.shortFacts ?? existing.shortFacts),
    policySnippets: normalizeList(
      input.policySnippets ?? existing.policySnippets
    ),
    sourceUrls: normalizeList(input.sourceUrls ?? existing.sourceUrls),
    suggestedFollowUps: normalizeList(
      input.suggestedFollowUps ?? existing.suggestedFollowUps
    ),
    overrideBuiltInId:
      input.overrideBuiltInId ?? existing.overrideBuiltInId ?? null,
  };
  validateEntry(updatedInput, entries);
  const updated: EditableKnowledgeEntry = {
    ...updatedInput,
    updatedAt: new Date().toISOString(),
  };
  const next = entries.map(entry => (entry.id === id ? updated : entry));
  await saveEntries(next);
  return updated;
}

export async function setEditableKnowledgeEntryEnabled(
  id: string,
  enabled: boolean
): Promise<EditableKnowledgeEntry> {
  return updateEditableKnowledgeEntry(id, { enabled });
}

export async function duplicateEditableKnowledgeEntry(
  id: string
): Promise<EditableKnowledgeEntry> {
  const entries = await listEditableKnowledgeEntries();
  const source = entries.find(entry => entry.id === id);
  if (!source) throw new Error("Knowledge entry not found.");
  return createEditableKnowledgeEntry({
    ...source,
    id: undefined,
    topic: `${source.topic} (копія)`,
    title: `${source.title} (копія)`,
    enabled: false,
  });
}

export function toKnowledgeTopic(
  entry: EditableKnowledgeEntry
): LibraryKnowledgeTopic {
  return {
    id: `editable-${entry.id}`,
    topic: entry.topic,
    title: entry.title,
    shortFacts: entry.shortFacts,
    policySnippets: entry.policySnippets,
    keywords: entry.keywords,
    sourceUrls: entry.sourceUrls,
    sourceBadge: entry.sourceBadge,
    suggestedFollowUps: entry.suggestedFollowUps,
    enabled: entry.enabled,
    updatedAt: entry.updatedAt,
  };
}
