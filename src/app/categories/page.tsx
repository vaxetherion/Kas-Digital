"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { TopBar } from "@/components/layout/top-bar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import type { Category } from "@/types/database";

// ── Types ──────────────────────────────────────────────────────────────

type FormState = {
  name: string;
  description: string;
  icon: string;
  color: string;
  sort_order: number;
  is_active: boolean;
};

const INITIAL_FORM: FormState = {
  name: "",
  description: "",
  icon: "📂",
  color: "#3b82f6",
  sort_order: 0,
  is_active: true,
};

const PRESET_ICONS = [
  "🍽️", "🚗", "🛒", "💰", "⚙️", "📈", "🏠", "💊", "📚", "🎮",
  "☕", "🎁", "✈️", "🏥", "👔", "🔧", "📦", "💳", "🔔", "📱",
];

const PRESET_COLORS = [
  "#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6",
  "#ec4899", "#6b7280", "#06b6d4", "#84cc16", "#f97316",
];

// ── Component ──────────────────────────────────────────────────────────

export default function CategoriesPage() {
  const [supabase, setSupabase] = useState<ReturnType<typeof createClient> | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [search, setSearch] = useState("");

  // ── Init Supabase ─────────────────────────────────────────────────────
  useEffect(() => {
    const client = createClient();
    setSupabase(client);
  }, []);

  // ── Fetch categories ──────────────────────────────────────────────────
  const fetchCategories = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (!error && data) {
      setCategories(data as Category[]);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // ── Form handlers ─────────────────────────────────────────────────────
  const openAddForm = () => {
    setEditTarget(null);
    setForm({ ...INITIAL_FORM, sort_order: categories.length });
    setError(null);
    setShowForm(true);
  };

  const openEditForm = (cat: Category) => {
    setEditTarget(cat);
    setForm({
      name: cat.name,
      description: cat.description ?? "",
      icon: cat.icon ?? "📂",
      color: cat.color ?? "#3b82f6",
      sort_order: cat.sort_order,
      is_active: cat.is_active,
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
      setError("Nama kategori wajib diisi.");
      return;
    }

    setSaving(true);
    setError(null);

    if (editTarget) {
      // Update
      const { error: updateError } = await supabase
        .from("categories")
        .update({
          name: form.name.trim(),
          description: form.description.trim() || null,
          icon: form.icon,
          color: form.color,
          sort_order: form.sort_order,
          is_active: form.is_active,
        })
        .eq("id", editTarget.id);

      if (updateError) {
        setError(`Gagal memperbarui: ${updateError.message}`);
        setSaving(false);
        return;
      }
    } else {
      // Insert
      const { error: insertError } = await supabase
        .from("categories")
        .insert({
          name: form.name.trim(),
          description: form.description.trim() || null,
          icon: form.icon,
          color: form.color,
          sort_order: form.sort_order,
          is_active: form.is_active,
        });

      if (insertError) {
        setError(
          insertError.code === "23505"
            ? "Nama kategori sudah ada."
            : `Gagal menyimpan: ${insertError.message}`,
        );
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    closeForm();
    fetchCategories();
  };

  // ── Delete handler ──────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!supabase || !deleteTarget) return;
    setDeleting(true);

    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", deleteTarget.id);

    if (!error) {
      setCategories((prev) => prev.filter((c) => c.id !== deleteTarget.id));
    }
    setDeleting(false);
    setDeleteTarget(null);
  };

  // ── Filtered list ──────────────────────────────────────────────────
  const filtered = categories.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.description ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <>
      <TopBar
        title="Kategori"
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
        {/* Desktop header */}
        <div className="hidden lg:flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Kategori</h1>
            <p className="text-sm text-gray-500 mt-1">
              Kelola kategori transaksi. {categories.length} kategori terdaftar.
            </p>
          </div>
          <button
            onClick={openAddForm}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            + Kategori Baru
          </button>
        </div>

        {/* Search */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 lg:p-5">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              width={18}
              height={18}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Cari kategori..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
            />
          </div>
        </div>

        {/* Category grid */}
        {loading ? (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
            <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-3" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm text-gray-500">Memuat kategori...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
            <div className="text-4xl mb-3">📂</div>
            <p className="text-sm font-medium text-gray-900 mb-1">
              {search ? "Tidak ada kategori ditemukan" : "Belum ada kategori"}
            </p>
            <p className="text-xs text-gray-500 mb-4">
              {search
                ? "Coba ubah kata kunci pencarian."
                : "Buat kategori pertama untuk mengelompokkan transaksi."}
            </p>
            {!search && (
              <button
                onClick={openAddForm}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                + Kategori Baru
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden lg:block rounded-xl border border-gray-200 bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Urutan</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Ikon</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Nama</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Deskripsi</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                    <th className="w-20 px-2 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((cat) => (
                    <tr key={cat.id} className="group hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                        {cat.sort_order}
                      </td>
                      <td className="px-4 py-3">
                        <div
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-lg"
                          style={{ backgroundColor: `${cat.color}15` }}
                        >
                          {cat.icon ?? "📂"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{cat.name}</span>
                          <div
                            className="h-3 w-3 rounded-full shrink-0"
                            style={{ backgroundColor: cat.color ?? "#3b82f6" }}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">
                        {cat.description ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                            cat.is_active
                              ? "bg-green-50 text-green-700"
                              : "bg-gray-100 text-gray-500",
                          )}
                        >
                          {cat.is_active ? "Aktif" : "Nonaktif"}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-right">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEditForm(cat)}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-all"
                            title="Edit"
                          >
                            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeleteTarget(cat)}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-all"
                            title="Hapus"
                          >
                            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="lg:hidden space-y-2">
              {filtered.map((cat) => (
                <div
                  key={cat.id}
                  className="rounded-xl border border-gray-200 bg-white p-4 flex items-center gap-3"
                >
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-xl text-xl shrink-0"
                    style={{ backgroundColor: `${cat.color}15` }}
                  >
                    {cat.icon ?? "📂"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900 truncate">{cat.name}</p>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-medium",
                          cat.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500",
                        )}
                      >
                        {cat.is_active ? "Aktif" : "Off"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {cat.description ?? "Tanpa deskripsi"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEditForm(cat)}
                      className="rounded-lg p-2 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-all"
                    >
                      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setDeleteTarget(cat)}
                      className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-all"
                    >
                      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Add/Edit Form Modal ──────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeForm} />
          <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-semibold text-gray-900 mb-4">
              {editTarget ? "Edit Kategori" : "Tambah Kategori"}
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
                  placeholder="Contoh: Makan & Minum"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Deskripsi
                </label>
                <input
                  type="text"
                  placeholder="Deskripsi singkat (opsional)"
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                />
              </div>

              {/* Icon picker */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Ikon
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_ICONS.map((icon) => (
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
                  {PRESET_COLORS.map((color) => (
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

              {/* Sort order + Active toggle row */}
              <div className="grid grid-cols-2 gap-3">
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
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Status
                  </label>
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
                {saving ? "Menyimpan..." : editTarget ? "Simpan Perubahan" : "Tambah Kategori"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirmation ───────────────────────────────────────── */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Hapus Kategori"
        description={`Yakin ingin menghapus kategori "${deleteTarget?.name}"? Transaksi yang menggunakan kategori ini akan kehilangan referensi kategori.`}
        confirmLabel={deleting ? "Menghapus..." : "Ya, hapus"}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
