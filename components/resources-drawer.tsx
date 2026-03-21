"use client";

const RESOURCES = [
  { icon: "📂", name: "Електронний каталог", url: "https://lib-hdak.in.ua/e-catalog.html", host: "lib-hdak.in.ua" },
  { icon: "🔍", name: "Пошук АБІС УФД", url: "https://library-service.com.ua:8443/khkhdak/DocumentSearchForm", host: "library-service.com.ua" },
  { icon: "📖", name: "Репозитарій ХДАК", url: "https://repository.ac.kharkov.ua/home", host: "repository.ac.kharkov.ua" },
  { icon: "🔬", name: "Наукова інформація", url: "https://lib-hdak.in.ua/search-scientific-info.html", host: "lib-hdak.in.ua" },
  { icon: "🔗", name: "Корисні посилання", url: "https://lib-hdak.in.ua/helpful-links.html", host: "lib-hdak.in.ua" },
  { icon: "🏛", name: "Сайт бібліотеки", url: "https://lib-hdak.in.ua/", host: "lib-hdak.in.ua" },
];

interface ResourcesDrawerProps {
  open: boolean;
}

export function ResourcesDrawer({ open }: ResourcesDrawerProps) {
  return (
    <div
      style={{
        flexShrink: 0,
        overflow: "hidden",
        maxHeight: open ? 185 : 0,
        background: "var(--dk2)",
        borderBottom: open ? "1px solid var(--dk0)" : "none",
        transition: "max-height 0.22s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
      aria-hidden={!open}
    >
      <div style={{ padding: "14px 20px" }}>
        <div
          style={{
            fontSize: 9.5,
            fontWeight: 500,
            color: "rgba(192,136,64,0.4)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: 10,
          }}
        >
          Офіційні ресурси
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(148px, 1fr))",
            gap: 3,
          }}
        >
          {RESOURCES.map((res) => (
            <a
              key={res.url}
              href={res.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 10px",
                background: "rgba(255,255,255,0.03)",
                border: "0.5px solid rgba(255,255,255,0.06)",
                borderRadius: 8,
                textDecoration: "none",
                transition: "all 0.12s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.07)";
                e.currentTarget.style.borderColor = "rgba(192,136,64,0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
              }}
            >
              <span style={{ fontSize: 11, flexShrink: 0, opacity: 0.65 }}>{res.icon}</span>
              <div>
                <div style={{ fontSize: 11.5, color: "rgba(240,225,200,0.6)", lineHeight: 1.2 }}>
                  {res.name}
                </div>
                <div style={{ fontSize: 9, color: "rgba(200,160,100,0.28)", marginTop: 1 }}>
                  {res.host}
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
