import type { ChatAnalyticsEvent, ChatSourceBadge } from "./chatAnalytics";

type TopCountItem = { key: string; count: number };

function incrementCounter(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function mapToTopItems(
  map: Map<string, number>,
  limit: number
): TopCountItem[] {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

export type ChatQualitySummary = {
  totalEvents: number;
  modeBreakdown: { guest: number; auth: number };
  sourceBadgeBreakdown: Record<ChatSourceBadge, number>;
  intents: {
    instantAnswers: number;
    catalogIntent: number;
    retrievalHit: number;
    retrievalAssistedResponse: number;
    knowledgeFallback: number;
    llmFallback: number;
    safeFallback: number;
  };
  cache: {
    hit: number;
    miss: number;
    hitRatePercent: number;
  };
  feedback: {
    useful: number;
    notUseful: number;
    bySourceBadge: Record<
      ChatSourceBadge,
      { useful: number; notUseful: number }
    >;
    negativeResponses: Array<{
      timestamp: string;
      responseId: string;
      query: string;
      sourceBadge: ChatSourceBadge;
      mode: "guest" | "auth";
    }>;
  };
  topQueries: Array<{ query: string; count: number }>;
  uncoveredTopQueries: Array<{ query: string; count: number }>;
  topRetrievedSources: Array<{ source: string; count: number }>;
  uncoveredAfterRetrievalTopQueries: Array<{ query: string; count: number }>;
};

const EMPTY_BADGE_COUNTS: Record<ChatSourceBadge, number> = {
  quick: 0,
  catalog: 0,
  "official-rule": 0,
  generated: 0,
  "llm-fallback": 0,
  unknown: 0,
};

function createFeedbackBySourceBadge() {
  return {
    quick: { useful: 0, notUseful: 0 },
    catalog: { useful: 0, notUseful: 0 },
    "official-rule": { useful: 0, notUseful: 0 },
    generated: { useful: 0, notUseful: 0 },
    "llm-fallback": { useful: 0, notUseful: 0 },
    unknown: { useful: 0, notUseful: 0 },
  } as ChatQualitySummary["feedback"]["bySourceBadge"];
}

export function buildChatAnalyticsSummary(
  events: ChatAnalyticsEvent[],
  options?: { topLimit?: number }
): ChatQualitySummary {
  const topLimit = options?.topLimit ?? 10;
  const queryCounts = new Map<string, number>();
  const uncoveredQueryCounts = new Map<string, number>();
  const uncoveredAfterRetrievalCounts = new Map<string, number>();
  const retrievedSourceCounts = new Map<string, number>();
  const feedbackByBadge = createFeedbackBySourceBadge();
  const negativeResponses: ChatQualitySummary["feedback"]["negativeResponses"] =
    [];

  const summary: ChatQualitySummary = {
    totalEvents: events.length,
    modeBreakdown: { guest: 0, auth: 0 },
    sourceBadgeBreakdown: { ...EMPTY_BADGE_COUNTS },
    intents: {
      instantAnswers: 0,
      catalogIntent: 0,
      retrievalHit: 0,
      retrievalAssistedResponse: 0,
      knowledgeFallback: 0,
      llmFallback: 0,
      safeFallback: 0,
    },
    cache: { hit: 0, miss: 0, hitRatePercent: 0 },
    feedback: {
      useful: 0,
      notUseful: 0,
      bySourceBadge: feedbackByBadge,
      negativeResponses,
    },
    topQueries: [],
    uncoveredTopQueries: [],
    topRetrievedSources: [],
    uncoveredAfterRetrievalTopQueries: [],
  };

  for (const event of events) {
    summary.modeBreakdown[event.mode] += 1;
    const badge = event.sourceBadge ?? "unknown";
    summary.sourceBadgeBreakdown[badge] += 1;

    const query =
      typeof event.metadata?.query === "string"
        ? event.metadata.query.trim()
        : "";
    if (query) {
      incrementCounter(queryCounts, query.toLowerCase());
    }

    switch (event.name) {
      case "instant_answer_hit":
        summary.intents.instantAnswers += 1;
        break;
      case "catalog_intent_hit":
        summary.intents.catalogIntent += 1;
        break;
      case "retrieval_hit": {
        summary.intents.retrievalHit += 1;
        const sourcesRaw = event.metadata?.sourceDocUrls;
        if (typeof sourcesRaw === "string" && sourcesRaw.length > 0) {
          for (const source of sourcesRaw.split("|")) {
            const safeSource = source.trim();
            if (safeSource) incrementCounter(retrievedSourceCounts, safeSource);
          }
        }
        break;
      }
      case "retrieval_assisted_response":
        summary.intents.retrievalAssistedResponse += 1;
        break;
      case "knowledge_fallback_hit":
        summary.intents.knowledgeFallback += 1;
        break;
      case "llm_fallback_used":
        summary.intents.llmFallback += 1;
        if (query && event.metadata?.completed !== false) {
          incrementCounter(uncoveredQueryCounts, query.toLowerCase());
        }
        if (
          query &&
          event.metadata?.retrievalHit !== true &&
          event.metadata?.completed !== false
        ) {
          incrementCounter(uncoveredAfterRetrievalCounts, query.toLowerCase());
        }
        break;
      case "llm_safe_fallback_used":
        summary.intents.safeFallback += 1;
        break;
      case "cache_hit":
        summary.cache.hit += 1;
        break;
      case "cache_miss":
        summary.cache.miss += 1;
        break;
      case "feedback_submitted": {
        const feedbackValue = event.metadata?.feedbackValue;
        const responseId =
          typeof event.metadata?.responseId === "string"
            ? event.metadata.responseId
            : "unknown-response";
        if (feedbackValue === "up") {
          summary.feedback.useful += 1;
          feedbackByBadge[badge].useful += 1;
        } else if (feedbackValue === "down") {
          summary.feedback.notUseful += 1;
          feedbackByBadge[badge].notUseful += 1;
          negativeResponses.push({
            timestamp: event.timestamp,
            responseId,
            query: query || "—",
            sourceBadge: badge,
            mode: event.mode,
          });
        }
        break;
      }
      default:
        break;
    }
  }

  const cacheTotal = summary.cache.hit + summary.cache.miss;
  summary.cache.hitRatePercent =
    cacheTotal > 0 ? Math.round((summary.cache.hit / cacheTotal) * 100) : 0;
  summary.topQueries = mapToTopItems(queryCounts, topLimit).map(item => ({
    query: item.key,
    count: item.count,
  }));
  summary.uncoveredTopQueries = mapToTopItems(
    uncoveredQueryCounts,
    topLimit
  ).map(item => ({
    query: item.key,
    count: item.count,
  }));
  summary.topRetrievedSources = mapToTopItems(
    retrievedSourceCounts,
    topLimit
  ).map(item => ({
    source: item.key,
    count: item.count,
  }));
  summary.uncoveredAfterRetrievalTopQueries = mapToTopItems(
    uncoveredAfterRetrievalCounts,
    topLimit
  ).map(item => ({
    query: item.key,
    count: item.count,
  }));
  summary.feedback.negativeResponses = negativeResponses
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, topLimit);

  return summary;
}
