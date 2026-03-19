import type { CatalogInstantAnswerResult } from "./catalogInstantAnswers";
import type { AbVariant } from "./abTesting";

export type CatalogSearchEvent = {
  query: string;
  found: boolean;
  booksCount: number;
  durationMs: number;
  variant: AbVariant;
};

/**
 * In-memory event log — replaced by a real analytics sink (e.g. PostHog, Segment)
 * in production environments.
 */
const _events: CatalogSearchEvent[] = [];

/**
 * Tracks a catalog search event.
 * @param query      The raw user query.
 * @param result     The instant-answer result.
 * @param startTime  Value from `performance.now()` captured before the search.
 * @param variant    The A/B variant active for this user.
 */
export function trackCatalogSearch(
  query: string,
  result: CatalogInstantAnswerResult,
  startTime: number,
  variant: AbVariant
): void {
  const event: CatalogSearchEvent = {
    query,
    found: result.found,
    booksCount: result.books.length,
    durationMs: performance.now() - startTime,
    variant,
  };
  _events.push(event);
}

/**
 * Returns a snapshot of all recorded events.
 * Useful for admin dashboards or test assertions.
 */
export function getCatalogSearchEvents(): ReadonlyArray<CatalogSearchEvent> {
  return _events;
}

/** Exposed for testing only — clears the event log. */
export function _clearCatalogSearchEvents(): void {
  _events.length = 0;
}
