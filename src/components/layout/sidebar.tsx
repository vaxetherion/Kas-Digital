"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  HomeIcon,
  TransactionIcon,
  CategoryIcon,
  BackupIcon,
  SettingsIcon,
  TelegramIcon,
  WalletIcon,
  SplitBillIcon,
  TrendingUpIcon,
} from "@/components/ui/icons";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: HomeIcon },
  { href: "/transactions", label: "Transaksi", icon: TransactionIcon },
  { href: "/wallets", label: "Wallet", icon: WalletIcon },
  { href: "/categories", label: "Kategori", icon: CategoryIcon },
  { href: "/reports", label: "Laporan", icon: TrendingUpIcon },
  { href: "/split-bill", label: "Split Bill", icon: SplitBillIcon },
  { href: "/scan-receipt", label: "Scan Struk", icon: ScanIcon },
  { href: "/telegram", label: "Telegram", icon: TelegramIcon },
  { href: "/backups", label: "Backup", icon: BackupIcon },
  { href: "/settings", label: "Pengaturan", icon: SettingsIcon },
] as const;

function ScanIcon({ className, size = 24 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
      {/* Brand header */}
      <div className="flex h-16 items-center gap-2 border-b border-blue-100 bg-blue-600 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-blue-600 font-bold text-sm">
          M
        </div>
        <div>
          <h1 className="text-sm font-bold text-white leading-tight">
            MIMO 2.5
          </h1>
          <p className="text-[10px] text-blue-200 leading-tight">
            Kas Digital
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 bg-white px-3 py-4 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
              )}
            >
              <Icon
                size={20}
                className={cn(
                  isActive ? "text-blue-600" : "text-gray-400",
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-100 bg-white p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
            A
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              Admin
            </p>
            <p className="text-xs text-gray-500 truncate">admin@mimo.local</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
