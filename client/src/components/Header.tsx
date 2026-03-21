interface HeaderProps {
  onToggleResources: () => void;
  resourcesOpen: boolean;
}

export function Header({ onToggleResources, resourcesOpen }: HeaderProps) {
  return (
    <header
      className="hdak-header"
      style={{
        height: 56,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "0 16px",
        background: "var(--hdr-bg)",
        backgroundImage: `
          repeating-linear-gradient(90deg, transparent 0px, transparent 22px, rgba(0,0,0,0.045) 22px, rgba(0,0,0,0.045) 23px),
          repeating-linear-gradient(180deg, transparent 0px, transparent 5px, rgba(200,140,60,0.02) 5px, rgba(200,140,60,0.02) 6px)
        `,
        borderBottom: "1px solid var(--hdr-border)",
        boxShadow: "inset 0 1px 0 rgba(200,140,60,0.12), 0 2px 6px rgba(0,0,0,0.14)",
      }}
    >
      {/* Logo — 4 book spines */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 2, flexShrink: 0 }}>
        {[9, 14, 7, 11].map((h, i) => (
          <div
            key={i}
            style={{
              width: 4,
              height: h,
              borderRadius: 1,
              background: i === 1
                ? "var(--gold)"
                : i === 3
                ? "rgba(200,140,60,0.65)"
                : "rgba(200,140,60,0.38)",
            }}
          />
        ))}
      </div>

      {/* Title block */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "var(--ff-d)",
            fontSize: 15,
            fontWeight: 500,
            color: "var(--hdr-text)",
            letterSpacing: "-.01em",
            lineHeight: 1.2,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          Бібліотека ХДАК
        </div>
        <div
          style={{
            fontSize: 10,
            color: "var(--hdr-muted)",
            textTransform: "uppercase",
            letterSpacing: ".09em",
            lineHeight: 1,
          }}
        >
          Асистент бібліотеки
        </div>
      </div>

      {/* Nav buttons */}
      <nav style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button
          onClick={onToggleResources}
          data-testid="button-toggle-resources"
          aria-expanded={resourcesOpen}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            height: 28,
            padding: "0 12px",
            background: resourcesOpen ? "rgba(255,255,255,.12)" : "var(--hdr-btn-bg)",
            border: "1px solid var(--hdr-btn-bd)",
            borderRadius: 999,
            color: resourcesOpen ? "var(--hdr-text)" : "var(--hdr-muted)",
            fontSize: 12,
            fontWeight: 500,
            cursor: "pointer",
            transition: "background .12s, color .12s",
            fontFamily: "var(--ff-b)",
            whiteSpace: "nowrap",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,.12)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--hdr-text)";
          }}
          onMouseLeave={e => {
            if (!resourcesOpen) {
              (e.currentTarget as HTMLButtonElement).style.background = "var(--hdr-btn-bg)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--hdr-muted)";
            }
          }}
        >
          {/* Gold dot indicator */}
          <span style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: "var(--gold)",
            flexShrink: 0,
            display: "inline-block",
          }} />
          Ресурси
        </button>

        <button
          data-testid="button-lang"
          style={{
            display: "inline-flex",
            alignItems: "center",
            height: 28,
            padding: "0 10px",
            background: "var(--hdr-btn-bg)",
            border: "1px solid var(--hdr-btn-bd)",
            borderRadius: 999,
            color: "var(--hdr-muted)",
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: ".05em",
            cursor: "pointer",
            transition: "background .12s, color .12s",
            fontFamily: "var(--ff-b)",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,.12)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--hdr-text)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = "var(--hdr-btn-bg)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--hdr-muted)";
          }}
        >
          УКР
        </button>
      </nav>
    </header>
  );
}

export default Header;
