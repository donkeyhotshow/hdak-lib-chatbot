import {
  LIBRARY_KNOWLEDGE_TOPICS,
  type LibraryKnowledgeTopic,
} from "./libraryKnowledge";
import {
  listEditableKnowledgeEntries,
  toKnowledgeTopic,
  type EditableKnowledgeEntry,
} from "./knowledgeRepository";

export async function getMergedKnowledgeTopics(): Promise<
  LibraryKnowledgeTopic[]
> {
  const editable = await listEditableKnowledgeEntries();
  return mergeBuiltInAndEditableKnowledge(LIBRARY_KNOWLEDGE_TOPICS, editable);
}

export function mergeBuiltInAndEditableKnowledge(
  builtInTopics: LibraryKnowledgeTopic[],
  editableEntries: EditableKnowledgeEntry[]
): LibraryKnowledgeTopic[] {
  const map = new Map<string, LibraryKnowledgeTopic>();
  for (const topic of builtInTopics) {
    if (topic.enabled === false) continue;
    map.set(topic.id, topic);
  }

  for (const entry of editableEntries) {
    if (!entry.enabled) continue;
    const mappedTopic = toKnowledgeTopic(entry);
    if (entry.overrideBuiltInId && map.has(entry.overrideBuiltInId)) {
      map.set(entry.overrideBuiltInId, {
        ...mappedTopic,
        id: entry.overrideBuiltInId,
      });
      continue;
    }
    map.set(mappedTopic.id, mappedTopic);
  }

  return [...map.values()];
}

export function createKnowledgeEntryDraftFromQuery(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return null;
  const tokenized = trimmed
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(token => token.length >= 3)
    .slice(0, 6);
  return {
    topic: trimmed,
    title: trimmed,
    keywords: tokenized.length > 0 ? tokenized : [trimmed.toLowerCase()],
    shortFacts: [`Оновлюваний довідковий запис для запиту: ${trimmed}`],
    policySnippets: ["Перевіряйте офіційні умови на сторінках бібліотеки."],
    sourceUrls: ["https://lib-hdak.in.ua/site-map.html"],
    sourceBadge: "quick" as const,
    suggestedFollowUps: [],
    enabled: true,
  };
}
