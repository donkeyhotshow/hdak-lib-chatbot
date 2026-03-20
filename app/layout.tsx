import type { Metadata, Viewport } from "next";
import { Providers } from "./providers";
import ErrorBoundary from "@/components/ErrorBoundary";
import "./globals.css";

export const metadata: Metadata = {
  title: "HDAK Library Chatbot",
  description: "AI assistant for HDAK library",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk">
      <body>
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
        <ErrorBoundary>
          <Providers>{children}</Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
