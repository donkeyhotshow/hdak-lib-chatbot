"use client";

import { motion } from "framer-motion";
import type { CatalogBook, CatalogBookStatus } from "@/lib/server/services/catalogInstantAnswers";

const STATUS_BADGE: Record<CatalogBookStatus, string> = {
  доступна: "🟢",
  замовлена: "🟡",
  "на полиці": "🟢",
  відсутня: "🔴",
};

const STATUS_LABEL: Record<CatalogBookStatus, string> = {
  доступна: "Доступна для видачі",
  замовлена: "Замовлена — очікуйте",
  "на полиці": "На полиці — зверніться до бібліотекаря",
  відсутня: "Відсутня у фонді",
};

export type CatalogBookCardProps = {
  book: CatalogBook;
  /** Stagger delay in milliseconds (e.g. index * 50). */
  delay?: number;
  onOrder?: (book: CatalogBook) => void;
};

export function CatalogBookCard({ book, delay = 0, onOrder }: CatalogBookCardProps) {
  const badge = STATUS_BADGE[book.status];
  const label = STATUS_LABEL[book.status];
  const canOrder = book.status !== "відсутня";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay / 1000, duration: 0.25 }}
    >
      <div className="hdak-book-card">
        <span
          className="hdak-status-badge"
          title={label}
          aria-label={label}
        >
          {badge}
        </span>
        <h4 className="hdak-book-title">{book.title}</h4>
        <p className="hdak-book-author">{book.author}</p>
        {canOrder && onOrder && (
          <button
            className="hdak-order-btn"
            onClick={() => onOrder(book)}
            type="button"
          >
            📖 Замовити
          </button>
        )}
      </div>
    </motion.div>
  );
}
