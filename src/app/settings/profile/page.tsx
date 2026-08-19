"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { TopBar } from "@/components/layout/top-bar";
import { formatDate } from "@/lib/utils";
import type { User } from "@/types/database";

export default function ProfilePage() {
  const [supabase, setSupabase] = useState<ReturnType<typeof createClient> | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const client = createClient();
    setSupabase(client);
  }, []);

  useEffect(() => {
    if (!supabase) return;

    const fetchProfile = async () => {
      setLoading(true);
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .single();

      if (data) {
        setUser(data as User);
        setFullName(data.full_name);
        setEmail(data.email ?? "");
      }
      setLoading(false);
    };

    fetchProfile();
  }, [supabase]);

  const handleSave = async () => {
    if (!supabase || !user) return;
    setSaving(true);
    setSaved(false);

    const { error } = await supabase
      .from("users")
      .update({ full_name: fullName, email: email || null })
      .eq("id", user.id);

    if (!error) {
      setUser({ ...user, full_name: fullName, email: email || null });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  };

  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      <TopBar title="Profil" />
      <div className="p-4 lg:p-8 space-y-4">
        {/* Desktop header */}
        <div className="hidden lg:block">
          <h1 className="text-2xl font-bold text-gray-900">Profil Saya</h1>
          <p className="text-sm text-gray-500 mt-1">
            Kelola informasi profil akun kamu.
          </p>
        </div>

        {loading ? (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
            <div className="inline-flex items-center gap-2 text-sm text-gray-400">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Memuat profil...
            </div>
          </div>
        ) : !user ? (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
            <p className="text-sm text-gray-400">
              Profil belum tersedia. Silakan login terlebih dahulu.
            </p>
          </div>
        ) : (
          <>
            {/* Profile Card */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 lg:p-6 space-y-6">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.full_name}
                    className="h-16 w-16 rounded-full object-cover ring-2 ring-gray-100"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xl font-bold ring-2 ring-gray-100">
                    {initials}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold text-gray-900 truncate">
                    {user.full_name}
                  </h2>
                  <p className="text-sm text-gray-500 truncate">
                    {user.email || "Belum ada email"}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        user.role === "admin"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {user.role === "admin" ? "👑 Admin" : "👤 Staff"}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        user.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {user.is_active ? "✓ Aktif" : "✗ Nonaktif"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Edit Profile Form */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 lg:p-6 space-y-4">
              <h2 className="text-base font-semibold text-gray-900">
                ✏️ Edit Profil
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                    placeholder="Masukkan nama lengkap"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                    placeholder="Masukkan email"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handleSave}
                    disabled={saving || fullName.trim() === ""}
                    className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {saving ? "Menyimpan..." : "💾 Simpan Perubahan"}
                  </button>

                  {saved && (
                    <span className="text-sm text-green-600 font-medium animate-pulse">
                      ✓ Berhasil disimpan!
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Account Info */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 lg:p-6 space-y-4">
              <h2 className="text-base font-semibold text-gray-900">
                ℹ️ Informasi Akun
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="py-2 pr-4 font-medium text-gray-500">Field</th>
                      <th className="py-2 font-medium text-gray-500">Nilai</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-gray-600">
                    <tr>
                      <td className="py-2 pr-4 font-medium">User ID</td>
                      <td className="py-2 font-mono text-xs break-all">{user.id}</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 font-medium">Telegram ID</td>
                      <td className="py-2 font-mono text-xs">
                        {user.telegram_id ?? "—"}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 font-medium">Telegram Username</td>
                      <td className="py-2">
                        {user.telegram_username ? `@${user.telegram_username}` : "—"}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 font-medium">Bergabung</td>
                      <td className="py-2">{formatDate(user.created_at)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 font-medium">Terakhir Diperbarui</td>
                      <td className="py-2">{formatDate(user.updated_at)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
