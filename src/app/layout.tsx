import type { Metadata } from "next";
import { Poppins, Literata, Outfit } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Script from "next/script";

const poppins = Poppins({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  adjustFontFallback: true,
});

const literata = Literata({
  variable: "--font-serif",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600"],
  display: "swap",
  adjustFontFallback: true,
});

const outfit = Outfit({
  variable: "--font-logo",
  subsets: ["latin", "latin-ext"],
  weight: ["600", "700"],
  display: "swap",
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://hdak-lib-chatbot.vercel.app'),
  title: "ХДАК Бібліотека  Інтелектуальний асистент",
  description: "Інтелектуальний асистент бібліотеки Харківської державної академії культури. Пошук видань, графік роботи, ресурси та допомога.",
  keywords: ["ХДАК", "бібліотека", "Харків", "академія культури", "книги", "ресурси", "ШІ асистент"],
  authors: [{ name: "ХДАК Бібліотека" }],
  openGraph: {
    title: "ХДАК Бібліотека  Інтелектуальний асистент",
    description: "Навігатор по ресурсах бібліотеки Харківської державної академії культури.",
    type: "website",
    locale: "uk_UA",
    siteName: "HDAK Library Chatbot",
    images: [{ url: "/og-image.svg", width: 1200, height: 630, alt: "ХДАК Бібліотека" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ХДАК Бібліотека  Інтелектуальний асистент",
    description: "Навігатор по ресурсах бібліотеки Харківської державної академії культури.",
    images: ["/og-image.svg"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/icons/icon-192.png",
  },
  manifest: "/manifest.json",
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: '/',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk" dir="ltr" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#B87830" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="ХДАК" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body
        className={`${poppins.variable} ${literata.variable} ${outfit.variable} antialiased`}
      >
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
        <Toaster />
        <Script id="sw-register" strategy="afterInteractive">{`
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js').catch(function(err) {
                console.warn('SW registration failed:', err);
              });
            });
          }
        `}</Script>
      </body>
    </html>
  );
}

