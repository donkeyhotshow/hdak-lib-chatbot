type CatalogActionButtonProps = {
  href: string;
  label: string;
  emphasized?: boolean;
};

export function CatalogActionButton({
  href,
  label,
  emphasized = false,
}: CatalogActionButtonProps) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      <button
        className={`hdak-action-btn${emphasized ? " hdak-action-btn--catalog" : ""}`}
      >
        🔍 {label}
      </button>
    </a>
  );
}
