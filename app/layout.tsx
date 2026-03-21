import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { EB_Garamond } from "next/font/google";
import "./globals.css";

const geist = Geist({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
  display: "swap",
});

const ebGaramond = EB_Garamond({
  subsets: ["latin", "cyrillic"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ХДАК · Бібліотека",
  description: "AI-асистент Наукової бібліотеки Харківської державної академії культури",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1e0f07",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk" className={`h-full ${geist.variable} ${ebGaramond.variable}`}>
      <body className="h-full font-sans antialiased" style={{ background: "var(--dk0)" }}>
        {children}
      </body>
    </html>
  );
}
