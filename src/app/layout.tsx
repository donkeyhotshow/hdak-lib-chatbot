import type { Metadata } from "next";
import { Inter, Cormorant_Garamond, Outfit } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

// Geometric sans-serif for interface - ultra-readable
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  adjustFontFallback: true,
});

// Elegant antiqua serif for headings - Dark Academia aesthetic
const cormorant = Cormorant_Garamond({
  variable: "--font-serif",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
  adjustFontFallback: true,
});

// Modern geometric for logo and accents
const outfit = Outfit({
  variable: "--font-logo",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  title: "ХДАК Бібліотека — Інтелектуальний асистент",
  description: "Інтелектуальний асистент бібліотеки Харківської державної академії культури. Пошук видань, графік роботи, ресурси та допомога.",
  keywords: ["ХДАК", "бібліотека", "Харків", "академія культури", "книги", "ресурси", "ШІ асистент"],
  authors: [{ name: "ХДАК Бібліотека" }],
  openGraph: {
    title: "ХДАК Бібліотека — Інтелектуальний асистент",
    description: "Навігатор по ресурсах бібліотеки Харківської державної академії культури.",
    type: "website",
    locale: "uk_UA",
    siteName: "HDAK Library Chatbot",
  },
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk" suppressHydrationWarning>
      <head>
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body
        className={`${inter.variable} ${cormorant.variable} ${outfit.variable} antialiased`}
        style={{ fontFamily: 'var(--font-sans), system-ui, sans-serif' }}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
