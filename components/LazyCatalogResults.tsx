"use client";

import { memo, lazy, Suspense } from "react";
import type { CatalogBook } from "@/lib/server/services/catalogInstantAnswers";
import type { CatalogBookCardProps } from "./CatalogBookCard";

// Lazy-load the animated card to keep the initial bundle small.
const CatalogBookCard = lazy(() =>
  import("./CatalogBookCard").then(m => ({ default: m.CatalogBookCard }))
) as React.ComponentType<CatalogBookCardProps>;

type CatalogResultsListProps = {
  books: CatalogBook[];
  onOrder?: (book: CatalogBook) => void;
};

function SkeletonCard() {
  return (
    <div className="hdak-book-card hdak-book-card--skeleton" aria-hidden="true">
      <span className="hdak-status-badge">⬜</span>
      <div className="hdak-book-title hdak-skeleton-line" />
      <div className="hdak-book-author hdak-skeleton-line" />
    </div>
  );
}

/**
 * Memoized list of catalog book cards with staggered entrance animation.
 * The card component itself is code-split via React.lazy.
 */
export const LazyCatalogResults = memo(function LazyCatalogResults({
  books,
  onOrder,
}: CatalogResultsListProps) {
  if (books.length === 0) return null;

  return (
    <div className="hdak-catalog-results">
      {books.map((book, index) => (
        <Suspense key={book.title + book.author} fallback={<SkeletonCard />}>
          <CatalogBookCard book={book} delay={index * 50} onOrder={onOrder} />
        </Suspense>
      ))}
    </div>
  );
});
