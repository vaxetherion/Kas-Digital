"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { TopBar } from "@/components/layout/top-bar";
import { ChevronRightIcon } from "@/components/ui/icons";
import type { Category, TransactionType, Wallet } from "@/types/database";

type FormState = {
  type: TransactionType;
  amount: string;
  category_id: string;
  wallet_id: string;
  description: string;
  reference: string;
  notes: string;
  transaction_date: string;
};

const INITIAL_STATE: FormState = {
  type: "expense",
  amount: "",
  category_id: "",
  wallet_id: "",
  description: "",
  reference: "",
  notes: "",
  transaction_date: new Date().toISOString().split("T")[0],
};

type ScanData = {
  description?: string;
  amount?: number;
  date?: string;
  notes?: string;
};

export default function NewTransactionPage() {
  const router = useRouter();
  const [supabase, setSupabase] = useState<ReturnType<typeof createClient> | null>(null);

  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [categories, setCategories] = useState<Category[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [fromScan, setFromScan] = useState(false);

  // ── Initialize Supabase client on mount (browser only) ────────────────
  useEffect(() => {
    const client = createClient();
    setSupabase(client);
  }, []);

  // ── Fetch categories ────────────────────────────────────────────────────
  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (!cancelled && data) setCategories(data);
    })();
    return () => { cancelled = true; };
  }, [supabase]);

  // ── Fetch wallets ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("wallets")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (!cancelled && data) {
        setWallets(data as Wallet[]);
        // Auto-select first wallet if none selected
        if (!form.wallet_id && data.length > 0) {
          setForm((prev) => ({ ...prev, wallet_id: data[0].id }));
        }
      }
    })();
    return () => { cancelled = true; };
  }, [supabase, form.wallet_id]);

  // ── Auto-fill from scan receipt ──────────────────────────────────────
  useEffect(() => {
    const scanRaw = sessionStorage.getItem("scan-receipt-data");
    if (!scanRaw) return;

    try {
      const scanData: ScanData = JSON.parse(scanRaw);
      sessionStorage.removeItem("scan-receipt-data");

      setForm((prev) => ({
        ...prev,
        description: scanData.description || prev.description,
        amount: scanData.amount ? String(scanData.amount) : prev.amount,
        transaction_date: scanData.date || prev.transaction_date,
        notes: scanData.notes || prev.notes,
        type: "expense",
      }));
      setFromScan(true);
    } catch {
      // Ignore parse errors
    }
  }, []);

  // ── Helpers ─────────────────────────────────────────────────────────────
  const formatAmountInput = (raw: string): string => {
    const digits = raw.replace(/\D/g, "");
    if (!digits) return "";
    return parseInt(digits, 10).toLocaleString("id-ID");
  };

  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    setForm((prev) => ({ ...prev, amount: raw }));
  }, []);

  const handleChange = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  // ── Submit ──────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validate
    const amount = parseInt(form.amount, 10);
    if (!amount || amount <= 0) {
      setError("Masukkan jumlah nominal yang valid.");
      return;
    }
    if (!form.description.trim()) {
      setError("Deskripsi wajib diisi.");
      return;
    }

    if (!supabase) {
      setError("Sistem belum siap. Silakan muat ulang halaman.");
      return;
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Anda harus login terlebih dahulu.");
      return;
    }

    startTransition(async () => {
      const { error: insertError } = await supabase.from("transactions").insert({
        user_id: user.id,
        type: form.type,
        amount,
        category_id: form.category_id || null,
        wallet_id: form.wallet_id || null,
        description: form.description.trim(),
        reference: form.reference.trim() || null,
        notes: form.notes.trim() || null,
        transaction_date: form.transaction_date,
        status: "confirmed",
      });

      if (insertError) {
        setError(`Gagal menyimpan: ${insertError.message}`);
        return;
      }

      setSuccess(true);
      setForm(INITIAL_STATE);

      // Redirect to transactions list after a short delay
      setTimeout(() => router.push("/transactions"), 1200);
    });
  };

  // ── Computed ────────────────────────────────────────────────────────────
  const amountDisplay = formatAmountInput(form.amount);
  const isIncome = form.type === "income";

  return (
    <>
      <TopBar
        title="Transaksi Baru"
        rightAction={
          <Link
            href="/transactions"
            className="text-sm font-medium text-blue-600"
          >
            Batal
          </Link>
        }
      />

      <div className="p-4 lg:p-8 space-y-4">
        {/* Breadcrumb (desktop) */}
        <nav className="hidden lg:flex items-center gap-1 text-sm text-gray-500">
          <Link href="/transactions" className="hover:text-gray-900 transition-colors">
            Transaksi
          </Link>
          <ChevronRightIcon size={14} className="text-gray-400" />
          <span className="text-gray-900 font-medium">Baru</span>
        </nav>

        {/* Desktop header */}
        <div className="hidden lg:block">
          <h1 className="text-2xl font-bold text-gray-900">Tambah Transaksi</h1>
          <p className="text-sm text-gray-500 mt-1">
            Catat pemasukan atau pengeluaran baru.
          </p>
        </div>

        {/* Scan receipt notification */}
        {fromScan && (
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-700 flex items-center gap-2">
            <span>📸</span>
            <span>Data diisi otomatis dari scan struk. Silakan periksa dan lengkapi.</span>
            <button
              onClick={() => {
                setFromScan(false);
                setForm(INITIAL_STATE);
              }}
              className="ml-auto text-xs font-medium text-blue-600 hover:underline"
            >
              Reset
            </button>
          </div>
        )}

        {/* Success toast */}
        {success && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-700">
            ✅ Transaksi berhasil disimpan! Mengalihkan ke daftar transaksi...
          </div>
        )}

        {/* Error toast */}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
            ❌ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ── Type Toggle ─────────────────────────────────────────────── */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 lg:p-6">
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Jenis Transaksi
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleChange("type", "expense")}
                className={`flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition-all ${
                  isIncome
                    ? "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    : "bg-red-50 text-red-600 ring-2 ring-red-500 shadow-sm"
                }`}
              >
                <span className="text-lg">💸</span>
                Pengeluaran
              </button>
              <button
                type="button"
                onClick={() => handleChange("type", "income")}
                className={`flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition-all ${
                  isIncome
                    ? "bg-emerald-50 text-emerald-600 ring-2 ring-emerald-500 shadow-sm"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                <span className="text-lg">💰</span>
                Pemasukan
              </button>
            </div>
          </div>

          {/* ── Amount ─────────────────────────────────────────────────── */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 lg:p-6">
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Nominal
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-gray-400">
                Rp
              </span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={amountDisplay}
                onChange={handleAmountChange}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 py-4 pl-14 pr-4 text-2xl font-bold text-gray-900 placeholder:text-gray-300 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              />
            </div>
          </div>

          {/* ── Wallet, Category & Date ──────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Wallet */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 lg:p-6">
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                💳 Wallet
              </label>
              <select
                value={form.wallet_id}
                onChange={(e) => handleChange("wallet_id", e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              >
                <option value="">Pilih wallet...</option>
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.icon ?? "💵"} {w.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 lg:p-6">
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Kategori
              </label>
              <select
                value={form.category_id}
                onChange={(e) => handleChange("category_id", e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              >
                <option value="">Pilih kategori...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon ?? "📂"} {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 lg:p-6">
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Tanggal
              </label>
              <input
                type="date"
                value={form.transaction_date}
                onChange={(e) => handleChange("transaction_date", e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              />
            </div>
          </div>

          {/* ── Description ─────────────────────────────────────────────── */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 lg:p-6">
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Deskripsi <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Contoh: Makan siang kantor, Beli ATK..."
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
              required
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
            />
          </div>

          {/* ── Reference & Notes ───────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4 lg:p-6">
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Referensi
              </label>
              <input
                type="text"
                placeholder="No. Bon, Invoice, dll. (opsional)"
                value={form.reference}
                onChange={(e) => handleChange("reference", e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              />
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 lg:p-6">
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Catatan
              </label>
              <input
                type="text"
                placeholder="Catatan tambahan (opsional)"
                value={form.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              />
            </div>
          </div>

          {/* ── Preview card ────────────────────────────────────────────── */}
          {form.amount && parseInt(form.amount, 10) > 0 && (
            <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-4 lg:p-6">
              <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                Ringkasan
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      isIncome
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {isIncome ? "Pemasukan" : "Pengeluaran"}
                  </span>
                  {form.wallet_id && (
                    <span className="text-xs text-gray-500">
                      {wallets.find((w) => w.id === form.wallet_id)?.icon ?? "💵"}{" "}
                      {wallets.find((w) => w.id === form.wallet_id)?.name ?? ""}
                    </span>
                  )}
                </div>
                <p className={`text-xl font-bold ${isIncome ? "text-emerald-600" : "text-red-600"}`}>
                  {isIncome ? "+" : "-"} Rp {amountDisplay}
                </p>
              </div>
            </div>
          )}

          {/* ── Submit button ───────────────────────────────────────────── */}
          <div className="flex gap-3 pt-2 pb-4">
            <Link
              href="/transactions"
              className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-3 text-center text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Batal
            </Link>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Menyimpan...
                </span>
              ) : (
                "Simpan Transaksi"
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
