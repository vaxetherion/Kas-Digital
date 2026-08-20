"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { TopBar } from "@/components/layout/top-bar";
import { formatRupiah, cn } from "@/lib/utils";
import type { Transaction, Category, Wallet } from "@/types/database";

// ── Types ──────────────────────────────────────────────────────────────

type TxRow = Transaction & {
  categories: Pick<Category, "name" | "icon" | "color"> | null;
  wallets: Pick<Wallet, "name" | "icon"> | null;
};

type MonthlyStats = {
  month: string;
  income: number;
  expense: number;
  balance: number;
  txCount: number;
};

type CategoryBreakdown = {
  category: string;
  icon: string;
  color: string;
  total: number;
  count: number;
};

// ── Component ──────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [supabase, setSupabase] = useState<ReturnType<typeof createClient> | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    return new Date().toISOString().slice(0, 7); // YYYY-MM
  });
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([]);
  const [currentMonthStats, setCurrentMonthStats] = useState<{
    income: number;
    expense: number;
    balance: number;
    txCount: number;
  }>({ income: 0, expense: 0, balance: 0, txCount: 0 });
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown[]>([]);
  const [transactions, setTransactions] = useState<TxRow[]>([]);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const client = createClient();
    setSupabase(client);
  }, []);

  const fetchReport = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);

    const startDate = `${selectedMonth}-01`;
    const endMonth = new Date(selectedMonth + "-01");
    endMonth.setMonth(endMonth.getMonth() + 1);
    const endDate = endMonth.toISOString().slice(0, 10);

    // Fetch all transactions for stats
    const { data: allTx } = await supabase
      .from("transactions")
      .select("type, amount, transaction_date");

    // Monthly stats (last 6 months)
    const monthMap = new Map<string, { income: number; expense: number; txCount: number }>();
    for (const tx of allTx ?? []) {
      const month = tx.transaction_date?.slice(0, 7);
      if (!month) continue;
      const existing = monthMap.get(month) ?? { income: 0, expense: 0, txCount: 0 };
      if (tx.type === "income") existing.income += tx.amount;
      else if (tx.type === "expense") existing.expense += tx.amount;
      existing.txCount++;
      monthMap.set(month, existing);
    }

    const months = Array.from(monthMap.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 6)
      .reverse();

    setMonthlyStats(
      months.map(([month, data]) => ({
        month,
        income: data.income,
        expense: data.expense,
        balance: data.income - data.expense,
        txCount: data.txCount,
      })),
    );

    // Current month transactions with category
    const { data: monthTx } = await supabase
      .from("transactions")
      .select("*, categories(name, icon, color), wallets(name, icon)")
      .gte("transaction_date", startDate)
      .lt("transaction_date", endDate)
      .order("transaction_date", { ascending: false });

    const txRows = (monthTx as TxRow[]) ?? [];
    setTransactions(txRows);

    // Current month stats
    let income = 0;
    let expense = 0;
    for (const tx of txRows) {
      if (tx.type === "income") income += tx.amount;
      else if (tx.type === "expense") expense += tx.amount;
    }
    setCurrentMonthStats({
      income,
      expense,
      balance: income - expense,
      txCount: txRows.length,
    });

    // Category breakdown (expenses only)
    const catMap = new Map<string, { icon: string; color: string; total: number; count: number }>();
    for (const tx of txRows) {
      if (tx.type !== "expense") continue;
      const catName = tx.categories?.name ?? "Tanpa Kategori";
      const existing = catMap.get(catName) ?? {
        icon: tx.categories?.icon ?? "📂",
        color: tx.categories?.color ?? "#6b7280",
        total: 0,
        count: 0,
      };
      existing.total += tx.amount;
      existing.count++;
      catMap.set(catName, existing);
    }

    setCategoryBreakdown(
      Array.from(catMap.entries())
        .map(([name, data]) => ({ category: name, ...data }))
        .sort((a, b) => b.total - a.total),
    );

    setLoading(false);
  }, [supabase, selectedMonth]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Generate month options (last 12 months)
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return d.toISOString().slice(0, 7);
  });

  const maxMonthly = Math.max(
    ...monthlyStats.map((m) => Math.max(m.income, m.expense)),
    1,
  );

  const maxCategory = Math.max(...categoryBreakdown.map((c) => c.total), 1);

  const exportPDF = () => {
    const monthLabel = new Date(selectedMonth + "-01").toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric",
    });

    // Category breakdown HTML
    const catHtml = categoryBreakdown
      .map(
        (cat) => `
        <tr>
          <td style="padding:4px 8px;border-bottom:1px solid #f5f5f5;font-size:12px">${cat.icon} ${cat.category}</td>
          <td style="padding:4px 8px;border-bottom:1px solid #f5f5f5;font-size:12px;text-align:right;font-weight:600">Rp ${cat.total.toLocaleString("id-ID")}</td>
        </tr>`,
      )
      .join("");

    // Transaction rows HTML
    const rowsHtml = transactions
      .map(
        (tx) => `
        <tr>
          <td style="padding:5px 8px;border-bottom:1px solid #f5f5f5;font-size:11px">${formatDateStr(tx.transaction_date)}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #f5f5f5;font-size:11px">${tx.categories?.icon ?? "📂"} ${tx.categories?.name ?? "-"}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #f5f5f5;font-size:11px">${tx.description}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #f5f5f5;font-size:11px;text-align:right;color:${tx.type === "income" ? "#059669" : "#dc2626"};font-weight:600">
            ${tx.type === "income" ? "+" : "-"} Rp ${tx.amount.toLocaleString("id-ID")}
          </td>
        </tr>`,
      )
      .join("");

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Laporan ${monthLabel} — MIMO 2.5</title>
        <style>
          @page { margin: 20mm; size: A4; }
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 0; color: #333; line-height: 1.4; }
          .header { border-bottom: 3px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px; }
          h1 { font-size: 22px; margin: 0 0 4px; color: #1e3a5f; }
          .subtitle { font-size: 13px; color: #666; }
          .generated { font-size: 10px; color: #aaa; margin-top: 2px; }
          .stats { display: flex; gap: 12px; margin: 20px 0; }
          .stat { padding: 14px; border: 1px solid #e5e7eb; border-radius: 8px; flex: 1; text-align: center; background: #fafafa; }
          .stat-value { font-size: 16px; font-weight: 700; }
          .stat-label { font-size: 10px; color: #888; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
          h2 { font-size: 14px; color: #374151; margin: 24px 0 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 4px; }
          th { text-align: left; padding: 6px 8px; border-bottom: 2px solid #d1d5db; font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
          .footer { margin-top: 30px; text-align: center; font-size: 9px; color: #ccc; border-top: 1px solid #eee; padding-top: 10px; }
          .cat-breakdown { width: 48%; display: inline-block; vertical-align: top; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Laporan Keuangan — MIMO 2.5</h1>
          <p class="subtitle">${monthLabel}</p>
          <p class="generated">Dicetak: ${new Date().toLocaleString("id-ID")}</p>
        </div>

        <div class="stats">
          <div class="stat">
            <div class="stat-value" style="color:#059669">Rp ${currentMonthStats.income.toLocaleString("id-ID")}</div>
            <div class="stat-label">Pemasukan</div>
          </div>
          <div class="stat">
            <div class="stat-value" style="color:#dc2626">Rp ${currentMonthStats.expense.toLocaleString("id-ID")}</div>
            <div class="stat-label">Pengeluaran</div>
          </div>
          <div class="stat">
            <div class="stat-value" style="color:#2563eb">Rp ${currentMonthStats.balance.toLocaleString("id-ID")}</div>
            <div class="stat-label">Saldo</div>
          </div>
          <div class="stat">
            <div class="stat-value">${currentMonthStats.txCount}</div>
            <div class="stat-label">Transaksi</div>
          </div>
        </div>

        ${categoryBreakdown.length > 0 ? `
        <h2>Pengeluaran per Kategori</h2>
        <table>
          <thead><tr><th>Kategori</th><th style="text-align:right">Total</th></tr></thead>
          <tbody>${catHtml}</tbody>
        </table>
        ` : ""}

        <h2>Detail Transaksi (${transactions.length})</h2>
        <table>
          <thead>
            <tr><th>Tanggal</th><th>Kategori</th><th>Deskripsi</th><th style="text-align:right">Nominal</th></tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>

        <div class="footer">
          MIMO 2.5 — Sistem Kas Digital · ${monthLabel} · ${transactions.length} transaksi
        </div>
      </body>
      </html>
    `;

    // Create blob and trigger download
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan-${selectedMonth}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Also open print dialog for direct PDF save
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  function formatDateStr(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
    });
  }

  return (
    <>
      <TopBar title="Laporan" />
      <div className="p-4 lg:p-8 space-y-4">
        {/* Desktop header */}
        <div className="hidden lg:flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Laporan Bulanan</h1>
            <p className="text-sm text-gray-500 mt-1">
              Analisis pemasukan, pengeluaran, dan tren keuangan.
            </p>
          </div>
          <button
            onClick={exportPDF}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
📥 Download Laporan
          </button>
        </div>

        {/* Month selector */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 lg:p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Bulan
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              >
                {monthOptions.map((m) => (
                  <option key={m} value={m}>
                    {new Date(m + "-01").toLocaleDateString("id-ID", {
                      month: "long",
                      year: "numeric",
                    })}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:ml-auto">
              <button
                onClick={exportPDF}
                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors lg:hidden"
              >
📥 Download
              </button>
            </div>
          </div>
        </div>

        <div ref={reportRef}>
          {loading ? (
            <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
              <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-3" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-sm text-gray-500">Memuat laporan...</p>
            </div>
          ) : (
            <>
              {/* Current month summary */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <p className="text-xs font-medium text-gray-500">Pemasukan</p>
                  <p className="text-lg font-bold text-emerald-600 mt-1">
                    {formatRupiah(currentMonthStats.income)}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <p className="text-xs font-medium text-gray-500">Pengeluaran</p>
                  <p className="text-lg font-bold text-red-600 mt-1">
                    {formatRupiah(currentMonthStats.expense)}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <p className="text-xs font-medium text-gray-500">Saldo</p>
                  <p className={cn(
                    "text-lg font-bold mt-1",
                    currentMonthStats.balance >= 0 ? "text-blue-600" : "text-red-600",
                  )}>
                    {formatRupiah(currentMonthStats.balance)}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <p className="text-xs font-medium text-gray-500">Transaksi</p>
                  <p className="text-lg font-bold text-gray-900 mt-1">
                    {currentMonthStats.txCount}
                  </p>
                </div>
              </div>

              {/* Monthly trend chart */}
              {monthlyStats.length > 0 && (
                <div className="rounded-xl border border-gray-200 bg-white p-4 lg:p-6">
                  <h2 className="text-sm font-semibold text-gray-900 mb-4">
                    Tren 6 Bulan
                  </h2>
                  <div className="flex items-end gap-3 h-48">
                    {monthlyStats.map((data) => {
                      const isActive = data.month === selectedMonth;
                      return (
                        <div key={data.month} className="flex-1 flex flex-col items-center gap-1">
                          <div className="flex items-end gap-1 h-36 w-full">
                            <div
                              className={cn(
                                "flex-1 rounded-t-md transition-all duration-500",
                                isActive ? "bg-emerald-500" : "bg-emerald-300",
                              )}
                              style={{
                                height: `${Math.max((data.income / maxMonthly) * 100, 2)}%`,
                              }}
                            />
                            <div
                              className={cn(
                                "flex-1 rounded-t-md transition-all duration-500",
                                isActive ? "bg-red-500" : "bg-red-300",
                              )}
                              style={{
                                height: `${Math.max((data.expense / maxMonthly) * 100, 2)}%`,
                              }}
                            />
                          </div>
                          <span className={cn(
                            "text-[10px] font-medium uppercase",
                            isActive ? "text-blue-600 font-bold" : "text-gray-400",
                          )}>
                            {new Date(data.month + "-01").toLocaleDateString("id-ID", { month: "short" })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Category breakdown */}
              {categoryBreakdown.length > 0 && (
                <div className="rounded-xl border border-gray-200 bg-white p-4 lg:p-6">
                  <h2 className="text-sm font-semibold text-gray-900 mb-4">
                    Pengeluaran per Kategori
                  </h2>
                  <div className="space-y-3">
                    {categoryBreakdown.map((cat) => (
                      <div key={cat.category}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="flex items-center gap-2 text-gray-700">
                            <span>{cat.icon}</span>
                            {cat.category}
                          </span>
                          <span className="font-semibold text-gray-900">
                            {formatRupiah(cat.total)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className="h-2 rounded-full transition-all duration-500"
                            style={{
                              width: `${(cat.total / maxCategory) * 100}%`,
                              backgroundColor: cat.color,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Transaction list */}
              <div className="rounded-xl border border-gray-200 bg-white p-4 lg:p-6">
                <h2 className="text-sm font-semibold text-gray-900 mb-4">
                  Daftar Transaksi ({transactions.length})
                </h2>
                {transactions.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">
                    Belum ada transaksi di bulan ini.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {transactions.slice(0, 20).map((tx) => (
                      <div key={tx.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-sm shrink-0">
                          {tx.categories?.icon ?? "📂"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {tx.description}
                          </p>
                          <p className="text-xs text-gray-400">
                            {formatDateStr(tx.transaction_date)} · {tx.categories?.name ?? "-"}
                            {tx.wallets && ` · ${tx.wallets.icon ?? ""} ${tx.wallets.name}`}
                          </p>
                        </div>
                        <p className={cn(
                          "text-sm font-bold shrink-0",
                          tx.type === "income" ? "text-emerald-600" : "text-red-600",
                        )}>
                          {tx.type === "income" ? "+" : "-"} {formatRupiah(tx.amount)}
                        </p>
                      </div>
                    ))}
                    {transactions.length > 20 && (
                      <p className="text-xs text-gray-400 text-center pt-2">
                        +{transactions.length - 20} transaksi lainnya
                      </p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
