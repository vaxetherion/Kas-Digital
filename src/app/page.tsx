"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { TopBar } from "@/components/layout/top-bar";
import {
  TrendingUpIcon,
  TrendingDownIcon,
  TransactionIcon,
  CategoryIcon,
  EyeIcon,
  EyeOffIcon,
} from "@/components/ui/icons";
import { formatRupiah, formatDate, cn } from "@/lib/utils";
import type { Transaction, Category, Wallet, BudgetLimit } from "@/types/database";

type TxRow = Transaction & {
  categories: Pick<Category, "name" | "icon"> | null;
};

type MonthlyData = {
  month: string;
  income: number;
  expense: number;
};

type BudgetAlert = {
  category: string;
  icon: string;
  spent: number;
  limit: number;
  percentage: number;
  status: "ok" | "warning" | "exceeded";
};

export default function DashboardPage() {
  const [supabase, setSupabase] = useState<ReturnType<typeof createClient> | null>(null);
  const [stats, setStats] = useState({ income: 0, expense: 0, count: 0 });
  const [recent, setRecent] = useState<TxRow[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [budgetAlerts, setBudgetAlerts] = useState<BudgetAlert[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [privacyMode, setPrivacyMode] = useState(false);

  useEffect(() => {
    const client = createClient();
    setSupabase(client);
    // Load privacy mode from localStorage
    const saved = localStorage.getItem("mimo-privacy-mode");
    if (saved === "true") setPrivacyMode(true);
  }, []);

  const togglePrivacy = useCallback(() => {
    setPrivacyMode((prev) => {
      localStorage.setItem("mimo-privacy-mode", String(!prev));
      return !prev;
    });
  }, []);

  useEffect(() => {
    if (!supabase) return;

    (async () => {
      // Fetch all confirmed transactions
      const { data: txData } = await supabase
        .from("transactions")
        .select("type, amount, transaction_date")
        .eq("status", "confirmed");

      let income = 0;
      let expense = 0;
      const monthMap = new Map<string, { income: number; expense: number }>();

      for (const tx of txData ?? []) {
        if (tx.type === "income") income += tx.amount;
        else if (tx.type === "expense") expense += tx.amount;

        // Group by month
        const month = tx.transaction_date?.slice(0, 7); // YYYY-MM
        if (month) {
          const existing = monthMap.get(month) ?? { income: 0, expense: 0 };
          if (tx.type === "income") existing.income += tx.amount;
          else if (tx.type === "expense") existing.expense += tx.amount;
          monthMap.set(month, existing);
        }
      }

      setStats({ income, expense, count: txData?.length ?? 0 });

      // Convert to sorted array (last 6 months)
      const sortedMonths = Array.from(monthMap.entries())
        .sort(([a], [b]) => b.localeCompare(a))
        .slice(0, 6)
        .reverse();

      setMonthlyData(
        sortedMonths.map(([month, data]) => ({
          month,
          ...data,
        })),
      );

      // Fetch recent transactions
      const { data: recentData } = await supabase
        .from("transactions")
        .select("*, categories(name, icon)")
        .order("transaction_date", { ascending: false })
        .limit(5);

      setRecent((recentData as TxRow[]) ?? []);

      // Fetch wallets
      const { data: walletData } = await supabase
        .from("wallets")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");

      setWallets((walletData as Wallet[]) ?? []);

      // Fetch budget alerts
      const now = new Date();
      const mStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const endM = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const mEnd = endM.toISOString().slice(0, 10);

      const { data: budgetData } = await supabase
        .from("budget_limits")
        .select("*, categories(name, icon)")
        .eq("is_active", true);

      if (budgetData && budgetData.length > 0) {
        const { data: txForBudget } = await supabase
          .from("transactions")
          .select("category_id, amount")
          .eq("type", "expense")
          .eq("status", "confirmed")
          .gte("transaction_date", mStart)
          .lt("transaction_date", mEnd);

        const expMap = new Map<string, number>();
        for (const tx of (txForBudget as { category_id: string; amount: number }[]) ?? []) {
          if (!tx.category_id) continue;
          expMap.set(tx.category_id, (expMap.get(tx.category_id) ?? 0) + tx.amount);
        }

        const alerts: BudgetAlert[] = (budgetData as (BudgetLimit & { categories: { name: string; icon: string } | null })[])
          .map((b) => {
            const spent = expMap.get(b.category_id) ?? 0;
            const percentage = b.monthly_limit > 0 ? (spent / b.monthly_limit) * 100 : 0;
            let status: "ok" | "warning" | "exceeded" = "ok";
            if (percentage >= 100) status = "exceeded";
            else if (percentage >= b.alert_threshold * 100) status = "warning";
            return {
              category: b.categories?.name ?? "-",
              icon: b.categories?.icon ?? "📂",
              spent,
              limit: b.monthly_limit,
              percentage,
              status,
            };
          })
          .filter((a) => a.status !== "ok")
          .sort((a, b) => b.percentage - a.percentage);

        setBudgetAlerts(alerts);
      }

      setLoading(false);
    })();
  }, [supabase]);

  const balance = stats.income - stats.expense;
  const maxMonthly = Math.max(
    ...monthlyData.map((m) => Math.max(m.income, m.expense)),
    1,
  );

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
      <TopBar
        title="Dashboard"
        rightAction={
          <button
            onClick={togglePrivacy}
            className="flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 transition-colors"
          >
            {privacyMode ? <EyeOffIcon size={14} /> : <EyeIcon size={14} />}
            {privacyMode ? "Tampilkan" : "Sembunyikan"}
          </button>
        }
      />
      <div className="p-4 lg:p-8 space-y-6">
        {/* Page header (desktop) */}
        <div className="hidden lg:flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">
              Ringkasan aktivitas kas digital Anda.
            </p>
          </div>
          <button
            onClick={togglePrivacy}
            className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-200 transition-colors"
          >
            {privacyMode ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
            {privacyMode ? "Tampilkan Saldo" : "Sembunyikan Saldo"}
          </button>
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
                <p className="text-xs font-medium text-gray-500">{card.label}</p>
                <p className={cn(
                  "text-lg font-bold mt-0.5",
                  privacyMode ? "blur-sm select-none" : "text-gray-900",
                )}>
                  {card.display === "count"
                    ? loading ? "..." : stats.count
                    : formatRupiah(card.value)}
                </p>
              </div>
            );
          })}
        </div>

        {/* Monthly chart */}
        {monthlyData.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 lg:p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">
              Pemasukan vs Pengeluaran (6 Bulan)
            </h2>
            <div className={cn(
              "flex items-end gap-3 h-48",
              privacyMode && "blur-sm select-none",
            )}>
              {monthlyData.map((data) => {
                const incomeHeight = (data.income / maxMonthly) * 100;
                const expenseHeight = (data.expense / maxMonthly) * 100;
                const monthLabel = new Date(data.month + "-01").toLocaleDateString("id-ID", {
                  month: "short",
                });
                return (
                  <div key={data.month} className="flex-1 flex flex-col items-center gap-1">
                    <div className="flex items-end gap-1 h-36 w-full">
                      <div
                        className="flex-1 bg-emerald-400 rounded-t-md transition-all duration-500"
                        style={{ height: `${Math.max(incomeHeight, 2)}%` }}
                        title={`Pemasukan: ${formatRupiah(data.income)}`}
                      />
                      <div
                        className="flex-1 bg-red-400 rounded-t-md transition-all duration-500"
                        style={{ height: `${Math.max(expenseHeight, 2)}%` }}
                        title={`Pengeluaran: ${formatRupiah(data.expense)}`}
                      />
                    </div>
                    <span className="text-[10px] font-medium text-gray-400 uppercase">
                      {monthLabel}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-emerald-400" />
                Pemasukan
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-red-400" />
                Pengeluaran
              </span>
            </div>
          </div>
        )}

        {/* Wallet balances */}
        {wallets.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 lg:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">
                Saldo Wallet
              </h2>
              <Link
                href="/wallets"
                className="text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                Kelola →
              </Link>
            </div>
            <div className="space-y-3">
              {wallets.slice(0, 5).map((wallet) => (
                <div
                  key={wallet.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-sm"
                      style={{ backgroundColor: `${wallet.color}15` }}
                    >
                      {wallet.icon ?? "💵"}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{wallet.name}</p>
                      <p className="text-xs text-gray-400 capitalize">{wallet.type}</p>
                    </div>
                  </div>
                  <p className={cn(
                    "text-sm font-bold",
                    privacyMode ? "blur-sm select-none" : "text-gray-900",
                  )}>
                    {formatRupiah(wallet.balance)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Budget alerts */}
        {budgetAlerts.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 lg:p-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">⚠️</span>
              <h2 className="text-sm font-semibold text-amber-900">
                Peringatan Budget ({budgetAlerts.length})
              </h2>
              <Link
                href="/settings/budget"
                className="ml-auto text-xs font-medium text-amber-700 hover:underline"
              >
                Kelola →
              </Link>
            </div>
            <div className="space-y-2">
              {budgetAlerts.map((alert) => (
                <div
                  key={alert.category}
                  className="flex items-center gap-3 rounded-lg bg-white p-3 border border-amber-100"
                >
                  <span className="text-lg shrink-0">{alert.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {alert.category}
                      </span>
                      <span className={cn(
                        "text-xs font-bold shrink-0",
                        alert.status === "exceeded" ? "text-red-600" : "text-amber-600",
                      )}>
                        {alert.percentage.toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className={cn(
                          "h-1.5 rounded-full",
                          alert.status === "exceeded" ? "bg-red-500" : "bg-amber-500",
                        )}
                        style={{ width: `${Math.min(alert.percentage, 100)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1">
                      {formatRupiah(alert.spent)} / {formatRupiah(alert.limit)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
