import type { Metadata } from "next";
import { Poppins, Literata, Outfit } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

// Sans-serif font for headings - bold, clean, modern
const poppins = Poppins({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
  display: "swap",
  adjustFontFallback: true,
});

// Serif font for elegant text - classic, readable
const literata = Literata({
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
  metadataBase: new URL('https://hdak-lib-chatbot.vercel.app'),
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
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "ХДАК Бібліотека" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
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
        className={`${poppins.variable} ${literata.variable} ${outfit.variable} antialiased`}
        style={{ fontFamily: 'var(--font-sans), system-ui, sans-serif' }}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
