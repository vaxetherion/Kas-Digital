import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppShell } from "@/components/layout/app-shell";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "MIMO 2.5 — Kas Digital",
    template: "%s | MIMO 2.5 Kas Digital",
  },
  description:
    "Sistem pencatatan kas digital yang terintegrasi dengan Telegram untuk UMKM dan tim kecil.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={inter.variable}>
      <body className="min-h-dvh">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
