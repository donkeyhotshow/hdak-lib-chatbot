import { X } from "lucide-react";

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
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <div
        style={{
          position: "fixed",
          top: 56,
          right: open ? 0 : -320,
          width: 300,
          height: "calc(100% - 56px)",
          background: "hsl(38 70% 97%)",
          borderLeft: "1px solid hsl(var(--border))",
          boxShadow: "-4px 0 20px rgba(0,0,0,0.1)",
          transition: "right 0.28s cubic-bezier(.4,0,.2,1)",
          zIndex: 50,
          overflow: "auto",
        }}
      >
        <div style={{ padding: "16px", borderBottom: "1px solid hsl(var(--border))" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "hsl(var(--b2))" }}>Ресурси</span>
            <button
              onClick={onClose}
              style={{ padding: 4, borderRadius: 4, background: "transparent", border: "none", cursor: "pointer", color: "hsl(var(--muted-foreground))" }}
            >
              <X style={{ width: 16, height: 16 }} />
            </button>
          </div>
        </div>
        <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: 8 }}>
          {RESOURCES.map(({ icon, name, url }) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              data-testid={`link-resource-${name}`}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "10px 12px",
                background: "hsl(var(--card))",
                border: "0.5px solid hsl(var(--border))",
                borderRadius: 10,
                textDecoration: "none",
                transition: "background .12s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "hsl(var(--muted))"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "hsl(var(--card))"; }}
            >
              <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{icon}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "hsl(var(--foreground))",
                  lineHeight: 1.3,
                }}>
                  {name}
                </div>
                <div style={{
                  fontSize: 11,
                  color: "hsl(var(--muted-foreground))",
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
    </>
  );
}

export default ResourcesDrawer;
