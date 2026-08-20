"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { TopBar } from "@/components/layout/top-bar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatRupiah, cn } from "@/lib/utils";
import type { Wallet, WalletType } from "@/types/database";

// ── Types ──────────────────────────────────────────────────────────────

type FormState = {
  name: string;
  type: WalletType;
  icon: string;
  color: string;
  balance: number;
  is_active: boolean;
  sort_order: number;
};

const INITIAL_FORM: FormState = {
  name: "",
  type: "cash",
  icon: "💵",
  color: "#3b82f6",
  balance: 0,
  is_active: true,
  sort_order: 0,
};

const WALLET_ICONS: Record<WalletType, string[]> = {
  cash: ["💵", "💰", "🪙"],
  bank: ["🏦", "💳", "🏧"],
  ewallet: ["📱", "📲", "💳"],
  other: ["📦", "💎", "🎁"],
};

const WALLET_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6b7280",
];

const WALLET_TYPES: { value: WalletType; label: string; icon: string }[] = [
  { value: "cash", label: "Tunai", icon: "💵" },
  { value: "bank", label: "Rekening Bank", icon: "🏦" },
  { value: "ewallet", label: "E-Wallet", icon: "📱" },
  { value: "other", label: "Lainnya", icon: "📦" },
];

// ── Component ──────────────────────────────────────────────────────────

export default function WalletsPage() {
  const [supabase, setSupabase] = useState<ReturnType<typeof createClient> | null>(null);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Wallet | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Wallet | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);

  useEffect(() => {
    const client = createClient();
    setSupabase(client);
  }, []);

  const fetchWallets = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("wallets")
      .select("*")
      .order("sort_order", { ascending: true });

    if (!error && data) {
      setWallets(data as Wallet[]);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchWallets();
  }, [fetchWallets]);

  const totalBalance = wallets
    .filter((w) => w.is_active)
    .reduce((sum, w) => sum + w.balance, 0);

  const openAddForm = () => {
    setEditTarget(null);
    setForm({ ...INITIAL_FORM, sort_order: wallets.length });
    setError(null);
    setShowForm(true);
  };

  const openEditForm = (wallet: Wallet) => {
    setEditTarget(wallet);
    setForm({
      name: wallet.name,
      type: wallet.type,
      icon: wallet.icon ?? "💵",
      color: wallet.color ?? "#3b82f6",
      balance: wallet.balance,
      is_active: wallet.is_active,
      sort_order: wallet.sort_order,
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
    if (!form.name.trim()) {
      setError("Nama wallet wajib diisi.");
      return;
    }

    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Anda harus login.");
      setSaving(false);
      return;
    }

    if (editTarget) {
      const { error: updateError } = await supabase
        .from("wallets")
        .update({
          name: form.name.trim(),
          type: form.type,
          icon: form.icon,
          color: form.color,
          balance: form.balance,
          is_active: form.is_active,
          sort_order: form.sort_order,
        })
        .eq("id", editTarget.id);

      if (updateError) {
        setError(`Gagal memperbarui: ${updateError.message}`);
        setSaving(false);
        return;
      }
    } else {
      const { error: insertError } = await supabase.from("wallets").insert({
        user_id: user.id,
        name: form.name.trim(),
        type: form.type,
        icon: form.icon,
        color: form.color,
        balance: form.balance,
        is_active: form.is_active,
        sort_order: form.sort_order,
      });

      if (insertError) {
        setError(
          insertError.code === "23505"
            ? "Nama wallet sudah ada."
            : `Gagal menyimpan: ${insertError.message}`,
        );
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    closeForm();
    fetchWallets();
  };

  const handleDelete = async () => {
    if (!supabase || !deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase
      .from("wallets")
      .delete()
      .eq("id", deleteTarget.id);

    if (!error) {
      setWallets((prev) => prev.filter((w) => w.id !== deleteTarget.id));
    }
    setDeleting(false);
    setDeleteTarget(null);
  };

  const activeIcons = WALLET_ICONS[form.type] ?? WALLET_ICONS.cash;

  return (
    <>
      <TopBar
        title="Wallet"
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
            <h1 className="text-2xl font-bold text-gray-900">Multi-Wallet</h1>
            <p className="text-sm text-gray-500 mt-1">
              Kelola sumber dana Anda — tunai, rekening bank, e-wallet.
            </p>
          </div>
          <button
            onClick={openAddForm}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            + Wallet Baru
          </button>
        </div>

        {/* Total balance */}
        <div className="rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 p-6 text-white">
          <p className="text-sm font-medium opacity-80">Total Saldo</p>
          <p className="text-3xl font-bold mt-1">{formatRupiah(totalBalance)}</p>
          <p className="text-xs opacity-60 mt-2">
            {wallets.filter((w) => w.is_active).length} wallet aktif
          </p>
        </div>

        {/* Wallet list */}
        {loading ? (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
            <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-3" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm text-gray-500">Memuat wallet...</p>
          </div>
        ) : wallets.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
            <div className="text-4xl mb-3">💳</div>
            <p className="text-sm font-medium text-gray-900 mb-1">Belum ada wallet</p>
            <p className="text-xs text-gray-500 mb-4">Buat wallet pertama untuk mulai mengelola dana.</p>
            <button
              onClick={openAddForm}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              + Wallet Baru
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {wallets.map((wallet) => (
              <div
                key={wallet.id}
                className={cn(
                  "rounded-xl border bg-white p-4 transition-all",
                  wallet.is_active
                    ? "border-gray-200 hover:shadow-md"
                    : "border-gray-100 opacity-60",
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-xl"
                    style={{ backgroundColor: `${wallet.color}15` }}
                  >
                    {wallet.icon ?? "💵"}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditForm(wallet)}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-all"
                      title="Edit"
                    >
                      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setDeleteTarget(wallet)}
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
                <h3 className="text-sm font-semibold text-gray-900">{wallet.name}</h3>
                <p className="text-xs text-gray-400 capitalize">{wallet.type}</p>
                <p
                  className={cn(
                    "text-lg font-bold mt-2",
                    wallet.balance >= 0 ? "text-gray-900" : "text-red-600",
                  )}
                >
                  {formatRupiah(wallet.balance)}
                </p>
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
              {editTarget ? "Edit Wallet" : "Tambah Wallet"}
            </h3>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Nama <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Tunai, BCA, GoPay"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                />
              </div>

              {/* Wallet type */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Tipe Wallet
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {WALLET_TYPES.map((wt) => (
                    <button
                      key={wt.value}
                      type="button"
                      onClick={() => {
                        const icons = WALLET_ICONS[wt.value];
                        setForm((p) => ({
                          ...p,
                          type: wt.value,
                          icon: icons[0],
                        }));
                      }}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border-2 px-3 py-2.5 text-sm font-medium transition-all",
                        form.type === wt.value
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-200 bg-white text-gray-600 hover:border-gray-300",
                      )}
                    >
                      <span>{wt.icon}</span>
                      {wt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Icon picker */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Ikon
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {activeIcons.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, icon }))}
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-lg text-lg transition-all",
                        form.icon === icon
                          ? "bg-blue-100 ring-2 ring-blue-500 shadow-sm"
                          : "bg-gray-50 hover:bg-gray-100",
                      )}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color picker */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Warna
                </label>
                <div className="flex flex-wrap gap-2">
                  {WALLET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, color }))}
                      className={cn(
                        "h-8 w-8 rounded-full transition-all",
                        form.color === color
                          ? "ring-2 ring-offset-2 ring-blue-500 scale-110"
                          : "hover:scale-105",
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Balance + Sort order */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Saldo Awal
                  </label>
                  <input
                    type="number"
                    value={form.balance}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, balance: parseFloat(e.target.value) || 0 }))
                    }
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Urutan
                  </label>
                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))
                    }
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Active toggle */}
              <div>
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, is_active: !p.is_active }))}
                  className={cn(
                    "relative inline-flex h-10 w-full items-center rounded-lg border-2 border-transparent px-3 text-sm font-medium transition-all",
                    form.is_active
                      ? "bg-green-50 text-green-700"
                      : "bg-gray-100 text-gray-500",
                  )}
                >
                  {form.is_active ? "✓ Aktif" : "✗ Nonaktif"}
                </button>
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
                disabled={saving || !form.name.trim()}
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
        title="Hapus Wallet"
        description={`Yakin ingin menghapus wallet "${deleteTarget?.name}"? Transaksi yang menggunakan wallet ini tidak akan terhapus.`}
        confirmLabel={deleting ? "Menghapus..." : "Ya, hapus"}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
