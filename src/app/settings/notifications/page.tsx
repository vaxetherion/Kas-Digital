"use client";

import { useState } from "react";
import { TopBar } from "@/components/layout/top-bar";

type NotificationSetting = {
  id: string;
  label: string;
  description: string;
  icon: string;
  enabled: boolean;
  channel: "email" | "telegram" | "both";
};

const defaultSettings: NotificationSetting[] = [
  {
    id: "transaction_new",
    label: "Transaksi Baru",
    description: "Notifikasi saat ada transaksi baru (pemasukan/pengeluaran).",
    icon: "💰",
    enabled: true,
    channel: "both",
  },
  {
    id: "transaction_confirmed",
    label: "Transaksi Dikonfirmasi",
    description: "Notifikasi saat transaksi berhasil dikonfirmasi.",
    icon: "✅",
    enabled: true,
    channel: "both",
  },
  {
    id: "transaction_cancelled",
    label: "Transaksi Dibatalkan",
    description: "Notifikasi saat transaksi dibatalkan.",
    icon: "❌",
    enabled: true,
    channel: "both",
  },
  {
    id: "daily_summary",
    label: "Ringkasan Harian",
    description: "Ringkasan transaksi harian dikirim setiap jam 8 malam.",
    icon: "📊",
    enabled: false,
    channel: "telegram",
  },
  {
    id: "backup_complete",
    label: "Backup Selesai",
    description: "Notifikasi saat backup data selesai.",
    icon: "💾",
    enabled: true,
    channel: "both",
  },
  {
    id: "backup_failed",
    label: "Backup Gagal",
    description: "Peringatan saat backup data gagal.",
    icon: "⚠️",
    enabled: true,
    channel: "both",
  },
];

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
        checked ? "bg-blue-600" : "bg-gray-200"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function ChannelBadge({ channel }: { channel: string }) {
  const styles: Record<string, string> = {
    email: "bg-blue-50 text-blue-700",
    telegram: "bg-cyan-50 text-cyan-700",
    both: "bg-purple-50 text-purple-700",
  };

  const labels: Record<string, string> = {
    email: "📧 Email",
    telegram: "📱 Telegram",
    both: "📧📱 Keduanya",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[channel] ?? styles.email}`}
    >
      {labels[channel] ?? channel}
    </span>
  );
}

export default function NotificationsPage() {
  const [settings, setSettings] = useState(defaultSettings);
  const [saved, setSaved] = useState(false);

  const toggleSetting = (id: string) => {
    setSettings((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  };

  const handleSave = () => {
    // In a real app, this would save to the database
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const enabledCount = settings.filter((s) => s.enabled).length;

  return (
    <>
      <TopBar title="Notifikasi" />
      <div className="p-4 lg:p-8 space-y-4">
        {/* Desktop header */}
        <div className="hidden lg:block">
          <h1 className="text-2xl font-bold text-gray-900">Pengaturan Notifikasi</h1>
          <p className="text-sm text-gray-500 mt-1">
            Atur notifikasi yang ingin kamu terima.
          </p>
        </div>

        {/* Stats */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Notifikasi Aktif</p>
              <p className="text-2xl font-bold text-gray-900">
                {enabledCount} <span className="text-sm font-normal text-gray-400">/ {settings.length}</span>
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-2xl">
              🔔
            </div>
          </div>
        </div>

        {/* Notification toggles */}
        <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
          {settings.map((setting) => (
            <div
              key={setting.id}
              className="flex items-start gap-4 p-4 lg:px-6 lg:py-5"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 text-xl shrink-0 mt-0.5">
                {setting.icon}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-900">
                    {setting.label}
                  </h3>
                  <ChannelBadge channel={setting.channel} />
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {setting.description}
                </p>
              </div>

              <div className="shrink-0 mt-1">
                <Toggle
                  checked={setting.enabled}
                  onChange={() => toggleSetting(setting.id)}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Save button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-all"
          >
            💾 Simpan Pengaturan
          </button>

          {saved && (
            <span className="text-sm text-green-600 font-medium animate-pulse">
              ✓ Berhasil disimpan!
            </span>
          )}
        </div>

        {/* Channel info */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 lg:p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900">
            📬 Kanal Notifikasi
          </h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-lg shrink-0">
                📧
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Email</h3>
                <p className="text-xs text-gray-500">
                  Notifikasi dikirim ke alamat email yang terdaftar di akun kamu.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-lg shrink-0">
                📱
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Telegram</h3>
                <p className="text-xs text-gray-500">
                  Notifikasi dikirim ke akun Telegram yang sudah terhubung.
                  Hubungkan akun Telegram di halaman{" "}
                  <a href="/telegram" className="text-blue-600 hover:underline">
                    Telegram
                  </a>
                  .
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quiet hours */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 lg:p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900">
            🌙 Jam Senyap
          </h2>
          <p className="text-xs text-gray-500">
            Matikan notifikasi selama jam-jam tertentu untuk menghindari gangguan.
          </p>
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Dari
              </label>
              <input
                type="time"
                defaultValue="22:00"
                className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="text-gray-400 mt-5">→</div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Sampai
              </label>
              <input
                type="time"
                defaultValue="07:00"
                className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
