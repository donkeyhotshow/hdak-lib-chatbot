/**
 * Shared application constants.
 *
 * Keeping cross-cutting values here prevents them from being duplicated across
 * multiple modules (e.g. chat.ts, syncService.ts, system-prompts-official.ts).
 * Import individual named exports rather than `* as constants` to keep
 * tree-shaking effective.
 */

/**
 * Base URL of the HDAK electronic catalog search form.
 * This is the same endpoint used by the catalog-sync service, the AI chat tools,
 * and the library system-prompt template.
 *
 * If the catalog moves, update this single constant instead of hunting
 * through every file that previously embedded the URL as a string literal.
 */
export const CATALOG_SEARCH_URL =
  "https://library-service.com.ua:8443/khkhdak/DocumentSearchForm";

/** Human-readable landing page for the electronic catalog (navigated to by users). */
export const CATALOG_PAGE_URL = "https://lib-hdak.in.ua/e-catalog.html";

/** Institutional repository for HDAK scholar publications. */
export const REPOSITORY_URL = "https://repository.ac.kharkov.ua/home";
