interface ResourcesDrawerProps {
  open: boolean;
  onClose: () => void;
}

const RESOURCES = [
  { icon: "📂", name: "Електронний каталог", url: "https://lib-hdak.in.ua/e-catalog.html" },
  { icon: "🔍", name: "Пошук АБІС УФД", url: "https://library-service.com.ua:8443/khkhdak/DocumentSearchForm" },
  { icon: "📖", name: "Репозитарій ХДАК", url: "https://repository.ac.kharkov.ua/home" },
  { icon: "🔬", name: "Наукова інформація", url: "https://lib-hdak.in.ua/search-scientific-info.html" },
  { icon: "🔗", name: "Корисні посилання", url: "https://lib-hdak.in.ua/helpful-links.html" },
  { icon: "🏛", name: "Сайт бібліотеки", url: "https://lib-hdak.in.ua/" },
];

export function ResourcesDrawer({ open, onClose }: ResourcesDrawerProps) {
  return (
    <div
      style={{
        maxHeight: open ? 220 : 0,
        overflow: "hidden",
        transition: "max-height 0.28s cubic-bezier(.4,0,.2,1)",
        background: "var(--bg-page)",
        borderBottom: open ? "0.5px solid var(--border-md)" : "none",
        flexShrink: 0,
      }}
    >
      <div style={{ padding: "12px 16px 14px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: 8,
          }}
        >
          {RESOURCES.map(({ icon, name, url }) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              data-testid={`link-resource-${name}`}
              onClick={onClose}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                padding: "9px 11px",
                background: "var(--bg-surface)",
                border: "1px solid var(--border-xs)",
                borderRadius: 10,
                textDecoration: "none",
                transition: "background .12s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "var(--bg-raised)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "var(--bg-surface)"; }}
            >
              <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>{icon}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--text-primary)",
                  lineHeight: 1.3,
                  marginBottom: 2,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>
                  {name}
                </div>
                <div style={{
                  fontSize: 10,
                  color: "var(--text-faint)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>
                  {url.replace(/^https?:\/\//, "").split("/")[0]}
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ResourcesDrawer;
