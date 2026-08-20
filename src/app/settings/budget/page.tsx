"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { TopBar } from "@/components/layout/top-bar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatRupiah, cn } from "@/lib/utils";
import type { Category, BudgetLimit, Transaction } from "@/types/database";

// ── Types ──────────────────────────────────────────────────────────────

type BudgetWithCategory = BudgetLimit & {
  categories: Pick<Category, "name" | "icon" | "color"> | null;
};

type BudgetStatus = {
  limit: BudgetWithCategory;
  spent: number;
  remaining: number;
  percentage: number;
  status: "ok" | "warning" | "exceeded";
};

type FormState = {
  category_id: string;
  monthly_limit: string;
  alert_threshold: number;
};

const INITIAL_FORM: FormState = {
  category_id: "",
  monthly_limit: "",
  alert_threshold: 80,
};

// ── Component ──────────────────────────────────────────────────────────

export default function BudgetPage() {
  const [supabase, setSupabase] = useState<ReturnType<typeof createClient> | null>(null);
  const [budgets, setBudgets] = useState<BudgetStatus[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<BudgetWithCategory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BudgetWithCategory | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);

  // Current month range
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const monthEnd = endMonth.toISOString().slice(0, 10);

  useEffect(() => {
    const client = createClient();
    setSupabase(client);
  }, []);

  const fetchData = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);

    // Fetch budgets with category info
    const { data: budgetData } = await supabase
      .from("budget_limits")
      .select("*, categories(name, icon, color)")
      .eq("is_active", true);

    const budgetRows = (budgetData as BudgetWithCategory[]) ?? [];

    // Fetch current month expenses per category
    const { data: txData } = await supabase
      .from("transactions")
      .select("category_id, amount")
      .eq("type", "expense")
      .eq("status", "confirmed")
      .gte("transaction_date", monthStart)
      .lt("transaction_date", monthEnd);

    // Sum expenses per category
    const expenseMap = new Map<string, number>();
    for (const tx of (txData as Transaction[]) ?? []) {
      if (!tx.category_id) continue;
      expenseMap.set(tx.category_id, (expenseMap.get(tx.category_id) ?? 0) + tx.amount);
    }

    // Build budget status
    const statuses: BudgetStatus[] = budgetRows.map((b) => {
      const spent = expenseMap.get(b.category_id) ?? 0;
      const remaining = b.monthly_limit - spent;
      const percentage = b.monthly_limit > 0 ? (spent / b.monthly_limit) * 100 : 0;
      let status: "ok" | "warning" | "exceeded" = "ok";
      if (percentage >= 100) status = "exceeded";
      else if (percentage >= b.alert_threshold * 100) status = "warning";
      return { limit: b, spent, remaining, percentage, status };
    });

    setBudgets(statuses);
    setLoading(false);
  }, [supabase, monthStart, monthEnd]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch categories for form
  useEffect(() => {
    if (!supabase) return;
    supabase
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .then((res: { data: Category[] | null }) => {
        if (res.data) setCategories(res.data);
      });
  }, [supabase]);

  const openAddForm = () => {
    setEditTarget(null);
    setForm(INITIAL_FORM);
    setError(null);
    setShowForm(true);
  };

  const openEditForm = (budget: BudgetWithCategory) => {
    setEditTarget(budget);
    setForm({
      category_id: budget.category_id,
      monthly_limit: String(budget.monthly_limit),
      alert_threshold: budget.alert_threshold * 100,
    });
    setError(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditTarget(null);
    setError(null);
  };

  const handleSave = async () => {
    if (!supabase) return;
    if (!form.category_id) {
      setError("Pilih kategori.");
      return;
    }
    const limit = parseFloat(form.monthly_limit);
    if (!limit || limit <= 0) {
      setError("Masukkan batas anggaran yang valid.");
      return;
    }

    setSaving(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Anda harus login.");
      setSaving(false);
      return;
    }

    const payload = {
      user_id: user.id,
      category_id: form.category_id,
      monthly_limit: limit,
      alert_threshold: form.alert_threshold / 100,
    };

    if (editTarget) {
      const { error: updateError } = await supabase
        .from("budget_limits")
        .update({ monthly_limit: limit, alert_threshold: payload.alert_threshold })
        .eq("id", editTarget.id);

      if (updateError) {
        setError(`Gagal memperbarui: ${updateError.message}`);
        setSaving(false);
        return;
      }
    } else {
      const { error: insertError } = await supabase
        .from("budget_limits")
        .insert(payload);

      if (insertError) {
        setError(
          insertError.code === "23505"
            ? "Budget untuk kategori ini sudah ada."
            : `Gagal menyimpan: ${insertError.message}`,
        );
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    closeForm();
    fetchData();
  };

  const handleDelete = async () => {
    if (!supabase || !deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase
      .from("budget_limits")
      .delete()
      .eq("id", deleteTarget.id);

    if (!error) {
      setBudgets((prev) => prev.filter((b) => b.limit.id !== deleteTarget.id));
    }
    setDeleting(false);
    setDeleteTarget(null);
  };

  const totalBudget = budgets.reduce((sum, b) => sum + b.limit.monthly_limit, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);

  // Categories not yet in budget
  const usedCatIds = new Set(budgets.map((b) => b.limit.category_id));
  const availableCategories = categories.filter((c) => !usedCatIds.has(c.id));

  return (
    <>
      <TopBar
        title="Budget"
        rightAction={
          <button
            onClick={openAddForm}
            className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
          >
            + Baru
          </button>
        }
      />

      <div className="p-4 lg:p-8 space-y-4">
        <div className="hidden lg:flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Anggaran Bulanan</h1>
            <p className="text-sm text-gray-500 mt-1">
              Tetapkan batas pengeluaran per kategori. {budgets.length} budget aktif.
            </p>
          </div>
          <button
            onClick={openAddForm}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            + Budget Baru
          </button>
        </div>

        {/* Total overview */}
        <div className="rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 p-6 text-white">
          <p className="text-sm font-medium opacity-80">Total Anggaran Bulan Ini</p>
          <div className="flex items-baseline gap-3 mt-1">
            <p className="text-3xl font-bold">{formatRupiah(totalBudget)}</p>
            <p className="text-sm opacity-70">terpakai {formatRupiah(totalSpent)}</p>
          </div>
          {totalBudget > 0 && (
            <div className="mt-3 w-full bg-white/20 rounded-full h-2">
              <div
                className={cn(
                  "h-2 rounded-full transition-all duration-500",
                  totalSpent / totalBudget >= 1 ? "bg-red-400" : "bg-white",
                )}
                style={{ width: `${Math.min((totalSpent / totalBudget) * 100, 100)}%` }}
              />
            </div>
          )}
        </div>

        {/* Budget list */}
        {loading ? (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
            <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-3" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm text-gray-500">Memuat budget...</p>
          </div>
        ) : budgets.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
            <div className="text-4xl mb-3">📊</div>
            <p className="text-sm font-medium text-gray-900 mb-1">Belum ada budget</p>
            <p className="text-xs text-gray-500 mb-4">Buat budget pertama untuk mengontrol pengeluaran per kategori.</p>
            <button
              onClick={openAddForm}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              + Budget Baru
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {budgets.map((bs) => (
              <div
                key={bs.limit.id}
                className="rounded-xl border border-gray-200 bg-white p-4 lg:p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-xl"
                      style={{ backgroundColor: `${bs.limit.categories?.color ?? "#6b7280"}15` }}
                    >
                      {bs.limit.categories?.icon ?? "📂"}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {bs.limit.categories?.name ?? "Tanpa nama"}
                      </p>
                      <p className="text-xs text-gray-400">
                        Batas: {formatRupiah(bs.limit.monthly_limit)}/bulan
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditForm(bs.limit)}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-all"
                      title="Edit"
                    >
                      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setDeleteTarget(bs.limit)}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-all"
                      title="Hapus"
                    >
                      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">
                      {formatRupiah(bs.spent)} terpakai
                    </span>
                    <span className={cn(
                      "font-semibold",
                      bs.status === "exceeded" ? "text-red-600" :
                      bs.status === "warning" ? "text-amber-600" :
                      "text-gray-600",
                    )}>
                      {bs.percentage.toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5">
                    <div
                      className={cn(
                        "h-2.5 rounded-full transition-all duration-500",
                        bs.status === "exceeded" ? "bg-red-500" :
                        bs.status === "warning" ? "bg-amber-500" :
                        "bg-emerald-500",
                      )}
                      style={{ width: `${Math.min(bs.percentage, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className={cn(
                      "font-medium",
                      bs.status === "exceeded" ? "text-red-600" :
                      bs.status === "warning" ? "text-amber-600" :
                      "text-emerald-600",
                    )}>
                      {bs.status === "exceeded" ? "⚠️ Melebihi batas!" :
                       bs.status === "warning" ? `⚠️ Mendekati batas (>${(bs.limit.alert_threshold * 100).toFixed(0)}%)` :
                       `✓ Sisa ${formatRupiah(bs.remaining)}`}
                    </span>
                    <span className="text-gray-400">
                      Treshold: {(bs.limit.alert_threshold * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Form Modal ────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeForm} />
          <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-semibold text-gray-900 mb-4">
              {editTarget ? "Edit Budget" : "Tambah Budget"}
            </h3>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {/* Category */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Kategori <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.category_id}
                  onChange={(e) => setForm((p) => ({ ...p, category_id: e.target.value }))}
                  disabled={!!editTarget}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all disabled:opacity-50"
                >
                  <option value="">Pilih kategori...</option>
                  {(editTarget ? categories : availableCategories).map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon ?? "📂"} {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Monthly limit */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Batas Bulanan (Rp) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  placeholder="500000"
                  value={form.monthly_limit}
                  onChange={(e) => setForm((p) => ({ ...p, monthly_limit: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                />
                {form.monthly_limit && (
                  <p className="text-xs text-gray-400 mt-1">
                    {formatRupiah(parseFloat(form.monthly_limit) || 0)}/bulan
                  </p>
                )}
              </div>

              {/* Alert threshold */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Treshold Peringatan: <span className="font-semibold">{form.alert_threshold}%</span>
                </label>
                <input
                  type="range"
                  min="50"
                  max="99"
                  value={form.alert_threshold}
                  onChange={(e) => setForm((p) => ({ ...p, alert_threshold: parseInt(e.target.value) }))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  Peringatan muncul saat pengeluaran mencapai {form.alert_threshold}% dari batas.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={closeForm}
                className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.category_id || !form.monthly_limit}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {saving ? "Menyimpan..." : editTarget ? "Simpan" : "Tambah"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Hapus Budget"
        description={`Yakin ingin menghapus budget untuk kategori "${deleteTarget?.categories?.name}"?`}
        confirmLabel={deleting ? "Menghapus..." : "Ya, hapus"}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
