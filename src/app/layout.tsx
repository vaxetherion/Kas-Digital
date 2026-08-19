import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Sidebar } from "@/components/layout/sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
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
        {/* Desktop sidebar */}
        <Sidebar />

        {/* Main content area */}
        <div className="lg:pl-64">
          {/* Mobile bottom nav */}
          <BottomNav />

          {/* Page content — bottom padding for mobile nav */}
          <main className="pb-20 lg:pb-0">{children}</main>
        </div>
      </body>
    </html>
  );
}
