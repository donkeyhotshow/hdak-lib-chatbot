"use client";

import { useState } from "react";
import { ResourcesDrawer } from "./resources-drawer";

const BookIcon = () => (
  <svg width="26" height="19" viewBox="0 0 26 19" fill="none" aria-hidden="true">
    <path d="M13 3C13 3 9.5 2 4 3.5L3.5 16C9 14.5 12.5 15.5 13 15.5L13 3Z" fill="rgba(192,136,64,0.15)" stroke="rgba(192,136,64,0.5)" strokeWidth="0.75"/>
    <path d="M13 3C13 3 16.5 2 22 3.5L22.5 16C17 14.5 13.5 15.5 13 15.5L13 3Z" fill="rgba(192,136,64,0.1)" stroke="rgba(192,136,64,0.4)" strokeWidth="0.75"/>
    <line x1="13" y1="2.5" x2="13" y2="15.5" stroke="rgba(192,136,64,0.75)" strokeWidth="0.8"/>
    <line x1="6" y1="7" x2="11" y2="6.5" stroke="rgba(192,136,64,0.28)" strokeWidth="0.6"/>
    <line x1="6" y1="9.5" x2="11" y2="9" stroke="rgba(192,136,64,0.28)" strokeWidth="0.6"/>
    <line x1="6" y1="12" x2="11" y2="11.5" stroke="rgba(192,136,64,0.22)" strokeWidth="0.6"/>
    <line x1="15" y1="6.5" x2="20" y2="7" stroke="rgba(192,136,64,0.28)" strokeWidth="0.6"/>
    <line x1="15" y1="9" x2="20" y2="9.5" stroke="rgba(192,136,64,0.28)" strokeWidth="0.6"/>
    <line x1="15" y1="11.5" x2="20" y2="12" stroke="rgba(192,136,64,0.22)" strokeWidth="0.6"/>
  </svg>
);

interface AppHeaderProps {
  showBackButton?: boolean;
  onBack?: () => void;
}

export function AppHeader({ showBackButton, onBack }: AppHeaderProps) {
  const [resourcesOpen, setResourcesOpen] = useState(false);

  return (
    <>
      <header
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 52,
          padding: "0 20px",
          background: "var(--dk1)",
          borderBottom: "1px solid var(--dk0)",
          boxShadow: "0 1px 0 rgba(192,136,64,0.08), 0 2px 14px rgba(0,0,0,0.28)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          {showBackButton && (
            <button
              onClick={onBack}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 28,
                height: 28,
                background: "transparent",
                border: "0.5px solid rgba(192,136,64,0.2)",
                borderRadius: 6,
                color: "rgba(192,136,64,0.6)",
                marginRight: 4,
                cursor: "pointer",
                transition: "all 0.14s",
              }}
              aria-label="Назад"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3L4 7l4 4"/>
              </svg>
            </button>
          )}
          <BookIcon />
          <span
            style={{
              fontFamily: "var(--ff-s)",
              fontSize: 15.5,
              fontWeight: 500,
              color: "rgba(250,238,218,0.96)",
              letterSpacing: "0.01em",
            }}
          >
            Бібліотека ХДАК
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button
            onClick={() => setResourcesOpen(!resourcesOpen)}
            style={{
              height: 27,
              padding: "0 13px",
              background: resourcesOpen ? "rgba(192,136,64,0.14)" : "rgba(255,255,255,0.05)",
              border: `0.5px solid ${resourcesOpen ? "rgba(192,136,64,0.6)" : "rgba(192,136,64,0.32)"}`,
              borderRadius: 100,
              color: resourcesOpen ? "rgba(225,178,100,1)" : "rgba(210,168,100,0.88)",
              fontSize: 12,
              fontWeight: 400,
              cursor: "pointer",
              transition: "all 0.14s",
            }}
          >
            Ресурси
          </button>
          <div style={{ width: 0.5, height: 14, background: "rgba(255,255,255,0.1)", margin: "0 2px" }} />
          <button
            style={{
              height: 27,
              padding: "0 11px",
              background: "rgba(255,255,255,0.05)",
              border: "0.5px solid rgba(192,136,64,0.28)",
              borderRadius: 100,
              color: "rgba(210,168,100,0.88)",
              fontSize: 12,
              fontWeight: 400,
              cursor: "pointer",
              transition: "all 0.14s",
            }}
          >
            УКР
          </button>
        </div>
      </header>

      <ResourcesDrawer open={resourcesOpen} />
    </>
  );
}
