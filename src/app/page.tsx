"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { TopBar } from "@/components/layout/top-bar";
import {
  TrendingUpIcon,
  TrendingDownIcon,
  TransactionIcon,
  CategoryIcon,
} from "@/components/ui/icons";
import { formatRupiah, formatDate, cn } from "@/lib/utils";
import type { Transaction, Category } from "@/types/database";

type TxRow = Transaction & {
  categories: Pick<Category, "name" | "icon"> | null;
};

export default function DashboardPage() {
  const [supabase, setSupabase] = useState<ReturnType<typeof createClient> | null>(null);
  const [stats, setStats] = useState({
    income: 0,
    expense: 0,
    count: 0,
  });
  const [recent, setRecent] = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const client = createClient();
    setSupabase(client);
  }, []);

  useEffect(() => {
    if (!supabase) return;

    (async () => {
      // Fetch all confirmed transactions for summary
      const { data: txData } = await supabase
        .from("transactions")
        .select("type, amount")
        .eq("status", "confirmed");

      let income = 0;
      let expense = 0;
      for (const tx of txData ?? []) {
        if (tx.type === "income") income += tx.amount;
        else if (tx.type === "expense") expense += tx.amount;
      }
      setStats({ income, expense, count: txData?.length ?? 0 });

      // Fetch 5 most recent transactions with category
      const { data: recentData } = await supabase
        .from("transactions")
        .select("*, categories(name, icon)")
        .order("transaction_date", { ascending: false })
        .limit(5);

      setRecent((recentData as TxRow[]) ?? []);
      setLoading(false);
    })();
  }, [supabase]);

  const balance = stats.income - stats.expense;

  const SUMMARY_CARDS = [
    {
      label: "Total Pemasukan",
      value: stats.income,
      icon: TrendingUpIcon,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Total Pengeluaran",
      value: stats.expense,
      icon: TrendingDownIcon,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      label: "Saldo Bersih",
      value: balance,
      icon: TransactionIcon,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Total Transaksi",
      value: 0,
      icon: CategoryIcon,
      color: "text-purple-600",
      bg: "bg-purple-50",
      display: "count" as const,
    },
  ];

  return (
    <>
      <TopBar title="Dashboard" />
      <div className="p-4 lg:p-8 space-y-6">
        {/* Page header (desktop) */}
        <div className="hidden lg:block">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Ringkasan aktivitas kas digital Anda.
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          {SUMMARY_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="rounded-xl border border-gray-200 bg-white p-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${card.bg}`}>
                    <Icon size={18} className={card.color} />
                  </div>
                </div>
                <p className="text-xs font-medium text-gray-500">
                  {card.label}
                </p>
                <p className="text-lg font-bold text-gray-900 mt-0.5">
                  {card.display === "count"
                    ? loading ? "..." : stats.count
                    : formatRupiah(card.value)}
                </p>
              </div>
            );
          })}
        </div>

        {/* Recent transactions */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 lg:p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">
            Transaksi Terbaru
          </h2>

          {loading ? (
            <div className="text-center py-8">
              <svg className="animate-spin h-6 w-6 text-blue-600 mx-auto mb-2" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-sm text-gray-400">Memuat data...</p>
            </div>
          ) : recent.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-400">
                Belum ada transaksi. Mulai catat transaksi pertama Anda!
              </p>
              <Link
                href="/transactions/new"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                Tambah Transaksi
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recent.map((tx) => (
                <div key={tx.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-base shrink-0">
                    {tx.categories?.icon ?? "📂"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {tx.description}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(tx.transaction_date)} · {tx.categories?.name ?? "Tanpa kategori"}
                    </p>
                  </div>
                  <p
                    className={cn(
                      "text-sm font-bold shrink-0",
                      tx.type === "income" ? "text-emerald-600" : "text-red-600",
                    )}
                  >
                    {tx.type === "income" ? "+" : "-"} {formatRupiah(tx.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}

          {recent.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100 text-center">
              <Link
                href="/transactions"
                className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                Lihat Semua Transaksi →
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
