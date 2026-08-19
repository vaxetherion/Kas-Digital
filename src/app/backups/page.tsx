"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { TopBar } from "@/components/layout/top-bar";
import { formatRupiah, formatDate } from "@/lib/utils";
import type { Transaction, Category } from "@/types/database";

type TxRow = Transaction & {
  categories: Pick<Category, "name"> | null;
};

export default function BackupsPage() {
  const [supabase, setSupabase] = useState<ReturnType<typeof createClient> | null>(null);
  const [loading, setLoading] = useState(false);
  const [txCount, setTxCount] = useState(0);
  const [lastExport, setLastExport] = useState<string | null>(null);

  useEffect(() => {
    const client = createClient();
    setSupabase(client);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .then((res: { count: number | null }) => setTxCount(res.count ?? 0));
  }, [supabase]);

  const exportCSV = async () => {
    if (!supabase) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("transactions")
      .select("*, categories(name)")
      .order("transaction_date", { ascending: false });

    if (error || !data) {
      alert("Gagal mengambil data.");
      setLoading(false);
      return;
    }

    const rows = data as TxRow[];

    // Build CSV
    const headers = [
      "Tanggal",
      "Jenis",
      "Kategori",
      "Deskripsi",
      "Nominal",
      "Status",
      "Referensi",
      "Catatan",
    ];

    const csvRows = [
      "\uFEFF" + headers.join(","), // BOM for Excel UTF-8
      ...rows.map((tx) =>
        [
          tx.transaction_date,
          tx.type === "income" ? "Pemasukan" : "Pengeluaran",
          tx.categories?.name ?? "",
          `"${tx.description.replace(/"/g, '""')}"`,
          tx.amount,
          tx.status === "confirmed" ? "Dikonfirmasi" : tx.status === "pending" ? "Menunggu" : "Dibatalkan",
          tx.reference ?? "",
          `"${(tx.notes ?? "").replace(/"/g, '""')}"`,
        ].join(","),
      ),
    ];

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStr = new Date().toISOString().split("T")[0];
    link.href = url;
    link.download = `kas-digital-export-${dateStr}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    setLastExport(new Date().toLocaleString("id-ID"));
    setLoading(false);
  };

  return (
    <>
      <TopBar title="Backup" />
      <div className="p-4 lg:p-8 space-y-4">
        {/* Desktop header */}
        <div className="hidden lg:block">
          <h1 className="text-2xl font-bold text-gray-900">Backup & Restore</h1>
          <p className="text-sm text-gray-500 mt-1">
            Ekspor dan impor data kas digital.
          </p>
        </div>

        {/* Export CSV Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 lg:p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-2xl shrink-0">
              📊
            </div>
            <div className="flex-1">
              <h2 className="text-base font-semibold text-gray-900">
                Ekspor ke CSV
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Unduh seluruh data transaksi dalam format CSV (Excel-compatible).
                File dapat dibuka langsung di Microsoft Excel atau Google Sheets.
              </p>
              <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                <span>📁 {txCount} transaksi</span>
                {lastExport && (
                  <span>Terakhir diekspor: {lastExport}</span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={exportCSV}
            disabled={loading || txCount === 0}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Mengekspor...
              </span>
            ) : (
              "⬇️ Unduh CSV"
            )}
          </button>
        </div>

        {/* Info card */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 lg:p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900">
            Format Export
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="py-2 pr-4 font-medium text-gray-500">Kolom</th>
                  <th className="py-2 font-medium text-gray-500">Deskripsi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-gray-600">
                <tr><td className="py-2 pr-4 font-medium">Tanggal</td><td className="py-2">Tanggal transaksi</td></tr>
                <tr><td className="py-2 pr-4 font-medium">Jenis</td><td className="py-2">Pemasukan / Pengeluaran</td></tr>
                <tr><td className="py-2 pr-4 font-medium">Kategori</td><td className="py-2">Nama kategori transaksi</td></tr>
                <tr><td className="py-2 pr-4 font-medium">Deskripsi</td><td className="py-2">Keterangan transaksi</td></tr>
                <tr><td className="py-2 pr-4 font-medium">Nominal</td><td className="py-2">Jumlah nominal (angka)</td></tr>
                <tr><td className="py-2 pr-4 font-medium">Status</td><td className="py-2">Dikonfirmasi / Menunggu / Dibatalkan</td></tr>
                <tr><td className="py-2 pr-4 font-medium">Referensi</td><td className="py-2">No. bon / invoice</td></tr>
                <tr><td className="py-2 pr-4 font-medium">Catatan</td><td className="py-2">Catatan tambahan</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
