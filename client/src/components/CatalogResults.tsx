export interface CatalogBook {
  title: string;
  author: string;
  year: string;
  type: string;
  url: string;
}

export interface CatalogResult {
  ok: boolean;
  total: number;
  results: CatalogBook[];
  search_url: string;
  empty?: boolean;
  error?: string;
  fallback?: { label: string; url: string }[];
}

interface CatalogResultsProps {
  data: CatalogResult;
  savedTitles: Set<string>;
  onSave: (book: CatalogBook) => void;
}

export function CatalogResults({ data, savedTitles, onSave }: CatalogResultsProps) {
  return (
    <div
      style={{
        paddingLeft: 34,
        marginTop: 6,
        marginBottom: 10,
      }}
    >
      <div
        style={{
          background: "rgba(255,252,245,.92)",
          border: "0.5px solid var(--border-light)",
          borderRadius: "var(--r-xl) var(--r-xl) var(--r-xl) var(--r-sm)",
          padding: "10px 14px",
          maxWidth: "82%",
        }}
      >
        {/* Header */}
        <div style={{
          fontSize: 11,
          fontWeight: 500,
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: ".06em",
          marginBottom: 8,
        }}>
          Результати пошуку в каталозі
        </div>

        {/* Error / fallback */}
        {!data.ok && (
          <div>
            <p style={{ fontSize: 13, color: "var(--error-tx)", marginBottom: 8 }}>
              Каталог тимчасово недоступний.
            </p>
            {data.fallback && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {data.fallback.map(fb => (
                  <a
                    key={fb.url}
                    href={fb.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      height: 28,
                      padding: "0 12px",
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border-sm)",
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 500,
                      color: "var(--brown-2)",
                      textDecoration: "none",
                      transition: "background .12s",
                    }}
                  >
                    {fb.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {data.ok && data.empty && (
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Документів не знайдено за вашим запитом.
          </p>
        )}

        {/* Results list */}
        {data.ok && data.results.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.results.map((book, i) => {
              const saved = savedTitles.has(book.title);
              return (
                <div
                  key={i}
                  data-testid={`catalog-result-${i}`}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 10,
                    paddingBottom: 8,
                    borderBottom: i < data.results.length - 1 ? "0.5px solid var(--border-xs)" : "none",
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <a
                      href={book.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid={`link-catalog-title-${i}`}
                      style={{
                        display: "block",
                        fontSize: 13.5,
                        fontWeight: 500,
                        color: "var(--brown-2)",
                        textDecoration: "none",
                        lineHeight: 1.35,
                        marginBottom: 2,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={book.title}
                    >
                      {book.title}
                    </a>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {[book.author, book.year].filter(Boolean).join(" · ")}
                    </div>
                  </div>

                  <button
                    onClick={() => onSave(book)}
                    data-testid={`button-save-book-${i}`}
                    aria-label={saved ? "Видалити зі збережених" : "Зберегти"}
                    style={{
                      flexShrink: 0,
                      display: "inline-flex",
                      alignItems: "center",
                      height: 22,
                      padding: "0 8px",
                      background: saved ? "var(--brown-1)" : "transparent",
                      border: `1px solid ${saved ? "var(--brown-1)" : "var(--border-md)"}`,
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 500,
                      color: saved ? "rgba(245,234,216,.95)" : "var(--text-muted)",
                      cursor: "pointer",
                      transition: "all .12s",
                      whiteSpace: "nowrap",
                      fontFamily: "var(--ff-b)",
                    }}
                  >
                    {saved ? "✓ Збережено" : "Зберегти"}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* "See all" link */}
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: "0.5px solid var(--border-xs)" }}>
          <a
            href={data.search_url}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="link-catalog-all-results"
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "var(--brown-3)",
              textDecoration: "none",
            }}
          >
            Всі результати ↗
          </a>
        </div>
      </div>
    </div>
  );
}

export default CatalogResults;
