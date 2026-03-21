import type { Metadata } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin", "cyrillic"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Бібліотечний асистент ХДАК",
  description: "AI-асистент Наукової бібліотеки Харківської державної академії культури",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk" className={`h-full ${dmSans.variable} ${playfair.variable}`}>
      <body className="h-full bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
