"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  HomeIcon,
  TransactionIcon,
  CategoryIcon,
  PlusIcon,
  SettingsIcon,
} from "@/components/ui/icons";

const NAV_ITEMS: readonly (
  | { href: string; label: string; icon: (props: { className?: string; size?: number }) => React.JSX.Element; isFab?: boolean }
)[] = [
  { href: "/", label: "Beranda", icon: HomeIcon },
  { href: "/transactions", label: "Transaksi", icon: TransactionIcon },
  { href: "/transactions/new", label: "Baru", icon: PlusIcon, isFab: true },
  { href: "/categories", label: "Kategori", icon: CategoryIcon },
  { href: "/settings", label: "Lainnya", icon: SettingsIcon },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white lg:hidden">
      <div className="flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          if (item.isFab) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative -mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/30 active:scale-95 transition-transform"
              >
                <Icon size={28} />
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 text-[10px] font-medium transition-colors",
                isActive ? "text-blue-600" : "text-gray-500",
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
      </div>
    </nav>
  );
}
