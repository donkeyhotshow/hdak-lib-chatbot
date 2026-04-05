"use client";

export function SkipLink() {
  return (
    <a
      href="#chat-input"
      style={{
        position: "absolute",
        top: "-100%",
        left: 0,
        background: "#5c3a1e",
        color: "#fff",
        padding: "8px 16px",
        zIndex: 9999,
        borderRadius: "0 0 4px 0",
        fontFamily: "system-ui, sans-serif",
        fontSize: 14,
      }}
      onFocus={e => {
        (e.currentTarget as HTMLAnchorElement).style.top = "0";
      }}
      onBlur={e => {
        (e.currentTarget as HTMLAnchorElement).style.top = "-100%";
      }}
    >
      Перейти до поля вводу
    </a>
  );
}
