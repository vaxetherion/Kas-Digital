"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { TopBar } from "@/components/layout/top-bar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatRupiah, formatDate, cn } from "@/lib/utils";
import type { Transaction, Category, TransactionType, Wallet } from "@/types/database";

// ── Types ──────────────────────────────────────────────────────────────────

type FilterType = "all" | TransactionType;

type TransactionRow = Transaction & {
  categories: Pick<Category, "name" | "icon" | "color"> | null;
};

type Filters = {
  type: FilterType;
  walletId: string;
  search: string;
  dateFrom: string;
  dateTo: string;
};

const PAGE_SIZE = 20;

const TYPE_TABS: { value: FilterType; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "income", label: "Pemasukan" },
  { value: "expense", label: "Pengeluaran" },
];

// ── Component ──────────────────────────────────────────────────────────────

export default function TransactionsPage() {
  const [supabase, setSupabase] = useState<ReturnType<typeof createClient> | null>(null);

  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<TransactionRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [filters, setFilters] = useState<Filters>({
    type: "all",
    walletId: "all",
    search: "",
    dateFrom: "",
    dateTo: "",
  });

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Init Supabase ─────────────────────────────────────────────────────
  useEffect(() => {
    const client = createClient();
    setSupabase(client);
  }, []);

  // ── Fetch wallets for filter ────────────────────────────────────────
  useEffect(() => {
    if (!supabase) return;
    supabase
      .from("wallets")
      .select("id, name, icon, color")
      .eq("is_active", true)
      .order("sort_order")
      .then((res: { data: Wallet[] | null }) => {
        setWallets((res.data as Wallet[]) ?? []);
      });
  }, [supabase]);

  // ── Fetch transactions ────────────────────────────────────────────────
  const fetchTransactions = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);

    let query = supabase
      .from("transactions")
      .select("*, categories(name, icon, color)", { count: "exact" })
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false });

    // Filter by type
    if (filters.type !== "all") {
      query = query.eq("type", filters.type);
    }

    // Filter by date range
    if (filters.dateFrom) {
      query = query.gte("transaction_date", filters.dateFrom);
    }
    if (filters.dateTo) {
      // Add one day to include the full end date
      const endDate = new Date(filters.dateTo);
      endDate.setDate(endDate.getDate() + 1);
      query = query.lt("transaction_date", endDate.toISOString());
    }

    // Filter by wallet
    if (filters.walletId !== "all") {
      query = query.eq("wallet_id", filters.walletId);
    }

    // Search in description
    if (filters.search.trim()) {
      query = query.ilike("description", `%${filters.search.trim()}%`);
    }

    // Pagination
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    query = query.range(from, to);

    const { data, count, error } = await query;

    if (!error && data) {
      setTransactions(data as TransactionRow[]);
      setTotalCount(count ?? 0);
    }

    setLoading(false);
  }, [supabase, filters, page]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // ── Reset page on filter change ──────────────────────────────────────
  useEffect(() => {
    setPage(0);
  }, [filters.type, filters.walletId, filters.search, filters.dateFrom, filters.dateTo]);

  // ── Search debounce ──────────────────────────────────────────────────
  const handleSearch = useCallback((value: string) => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: value }));
    }, 400);
  }, []);

  // ── Delete handler ─────────────────────────────────────────────────
  const handleDelete = useCallback(async () => {
    if (!supabase || !deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", deleteTarget.id);
    if (!error) {
      setTransactions((prev) => prev.filter((tx) => tx.id !== deleteTarget.id));
      setTotalCount((prev) => prev - 1);
    }
    setDeleting(false);
    setDeleteTarget(null);
  }, [supabase, deleteTarget]);

  // ── Computed ──────────────────────────────────────────────────────────
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const canPrev = page > 0;
  const canNext = page < totalPages - 1;

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <>
      <TopBar
        title="Transaksi"
        rightAction={
          <Link
            href="/transactions/new"
            className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
          >
            + Baru
          </Link>
        }
      />

      <div className="p-4 lg:p-8 space-y-4">
        {/* Desktop header */}
        <div className="hidden lg:flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Transaksi</h1>
            <p className="text-sm text-gray-500 mt-1">
              Riwayat seluruh transaksi kas digital.
            </p>
          </div>
          <Link
            href="/transactions/new"
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            + Transaksi Baru
          </Link>
        </div>

        {/* ── Filter tabs ─────────────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 bg-white p-1.5 inline-flex gap-1">
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilters((prev) => ({ ...prev, type: tab.value }))}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition-all",
                filters.type === tab.value
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Search & date range ─────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 lg:p-5 space-y-4">
          {/* Search */}
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              width={18}
              height={18}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Cari deskripsi transaksi..."
              defaultValue={filters.search}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
            />
          </div>

          {/* Wallet filter */}
          {wallets.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Wallet
              </label>
              <select
                value={filters.walletId}
                onChange={(e) => setFilters((prev) => ({ ...prev, walletId: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              >
                <option value="all">Semua Wallet</option>
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.icon ?? "💵"} {w.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date range */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Dari tanggal
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Sampai tanggal
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              />
            </div>
            {(filters.dateFrom || filters.dateTo) && (
              <div className="flex items-end">
                <button
                  onClick={() => setFilters((prev) => ({ ...prev, dateFrom: "", dateTo: "" }))}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors whitespace-nowrap"
                >
                  Reset tanggal
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Summary line ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between text-sm text-gray-500">
          <p>
            {totalCount} transaksi ditemukan
            {filters.type !== "all" && (
              <span className="ml-1">
                · {filters.type === "income" ? "Pemasukan" : "Pengeluaran"}
              </span>
            )}
          </p>
        </div>

        {/* ── Transaction table / cards ────────────────────────────────── */}
        {loading ? (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
            <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-3" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm text-gray-500">Memuat transaksi...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-sm font-medium text-gray-900 mb-1">
              Tidak ada transaksi
            </p>
            <p className="text-xs text-gray-500 mb-4">
              {filters.search || filters.type !== "all" || filters.dateFrom || filters.dateTo
                ? "Coba ubah filter pencarian Anda."
                : "Mulai catat transaksi pertama Anda!"}
            </p>
            {!filters.search && filters.type === "all" && !filters.dateFrom && !filters.dateTo && (
              <Link
                href="/transactions/new"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                + Transaksi Baru
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* ── Desktop table ────────────────────────────────────────── */}
            <div className="hidden lg:block rounded-xl border border-gray-200 bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-4 py-3 font-medium text-gray-500">
                      Tanggal
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">
                      Kategori
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">
                      Deskripsi
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">
                      Status
                    </th>                      <th className="text-right px-4 py-3 font-medium text-gray-500">
                      Nominal
                    </th>
                    <th className="w-10 px-2 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="group hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {formatDate(tx.transaction_date)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-gray-900">
                          <span>{tx.categories?.icon ?? "📂"}</span>
                          {tx.categories?.name ?? "Tanpa kategori"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-900 max-w-[200px] truncate">
                        {tx.description}
                        {tx.reference && (
                          <span className="ml-1.5 text-xs text-gray-400">
                            ({tx.reference})
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={tx.status} />
                      </td>
                      <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">
                        <span
                          className={
                            tx.type === "income" ? "text-emerald-600" : "text-red-600"
                          }
                        >
                          {tx.type === "income" ? "+" : "-"} {formatRupiah(tx.amount)}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-right">
                        <button
                          onClick={() => setDeleteTarget(tx)}
                          className="rounded-lg p-1.5 text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 transition-all"
                          title="Hapus transaksi"
                        >
                          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Mobile card list ──────────────────────────────────────── */}
            <div className="lg:hidden space-y-2">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="rounded-xl border border-gray-200 bg-white p-4 flex items-center gap-3"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-lg shrink-0">
                    {tx.categories?.icon ?? "📂"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {tx.description}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatDate(tx.transaction_date)} · {tx.categories?.name ?? "Tanpa kategori"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className={cn(
                        "text-sm font-bold",
                        tx.type === "income" ? "text-emerald-600" : "text-red-600",
                      )}
                    >
                      {tx.type === "income" ? "+" : "-"} {formatRupiah(tx.amount)}
                    </p>
                    <StatusBadge status={tx.status} className="mt-0.5" />
                  </div>
                  <button
                    onClick={() => setDeleteTarget(tx)}
                    className="shrink-0 rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-all"
                    title="Hapus"
                  >
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            {/* ── Pagination ────────────────────────────────────────────── */}
            <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3">
              <p className="text-xs text-gray-500">
                Halaman {page + 1} dari {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={!canPrev}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  ← Sebelumnya
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={!canNext}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Selanjutnya →
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Delete confirmation dialog ──────────────────────────────────── */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Hapus Transaksi"
        description={`Yakin ingin menghapus transaksi "${deleteTarget?.description}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel={deleting ? "Menghapus..." : "Ya, hapus"}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}

// ── Status Badge ─────────────────────────────────────────────────────────

function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const styles: Record<string, string> = {
    confirmed: "bg-emerald-50 text-emerald-700",
    pending: "bg-amber-50 text-amber-700",
    cancelled: "bg-gray-100 text-gray-500",
  };

  const labels: Record<string, string> = {
    confirmed: "Dikonfirmasi",
    pending: "Menunggu",
    cancelled: "Dibatalkan",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
        styles[status] ?? styles.confirmed,
        className,
      )}
    >
      {labels[status] ?? status}
    </span>
  );
}
