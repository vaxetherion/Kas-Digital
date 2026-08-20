"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { TopBar } from "@/components/layout/top-bar";
import { TelegramIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import type { TelegramLink } from "@/types/database";

// ── PIN Generator ────────────────────────────────────────────────────────

function generatePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ── Component ────────────────────────────────────────────────────────────

export default function TelegramPage() {
  const [supabase, setSupabase] = useState<ReturnType<typeof createClient> | null>(null);
  const [loading, setLoading] = useState(true);
  const [telegramLink, setTelegramLink] = useState<TelegramLink | null>(null);
  const [pin, setPin] = useState<string | null>(null);
  const [pinExpiry, setPinExpiry] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  // Init supabase
  useEffect(() => {
    const client = createClient();
    setSupabase(client);
  }, []);

  // Fetch existing telegram link
  const fetchLink = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const { data } = await supabase
      .from("telegram_links")
      .select("*")
      .eq("is_active", true)
      .maybeSingle();

    setTelegramLink((data as TelegramLink) ?? null);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchLink();
  }, [fetchLink]);

  // Countdown timer
  useEffect(() => {
    if (!pinExpiry) return;
    const interval = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.floor((pinExpiry.getTime() - Date.now()) / 1000),
      );
      setCountdown(remaining);
      if (remaining <= 0) {
        setPin(null);
        setPinExpiry(null);
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [pinExpiry]);

  // Generate PIN
  const handleGeneratePin = async () => {
    if (!supabase) return;
    setGenerating(true);

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Anda harus login terlebih dahulu.");
      setGenerating(false);
      return;
    }

    const newPin = generatePin();

    // Store PIN as a pending connection attempt in the database
    const { error } = await supabase.from("telegram_links").upsert(
      {
        user_id: user.id,
        telegram_id: 0, // Temporary
        chat_id: 0, // Temporary
        is_active: false, // Will be activated when Telegram bot confirms
      },
      { onConflict: "user_id" },
    );

    if (error) {
      console.error("Error storing PIN:", error);
    }

    setPin(newPin);
    setPinExpiry(new Date(Date.now() + 5 * 60 * 1000)); // 5 minutes
    setGenerating(false);
  };

  // Disconnect
  const handleDisconnect = async () => {
    if (!supabase || !telegramLink) return;
    setDisconnecting(true);

    const { error } = await supabase
      .from("telegram_links")
      .update({ is_active: false })
      .eq("id", telegramLink.id);

    if (!error) {
      setTelegramLink(null);
    }
    setDisconnecting(false);
  };

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <>
      <TopBar title="Telegram" />
      <div className="p-4 lg:p-8 space-y-4">
        {/* Desktop header */}
        <div className="hidden lg:block">
          <h1 className="text-2xl font-bold text-gray-900">Telegram Bot</h1>
          <p className="text-sm text-gray-500 mt-1">
            Hubungkan akun Telegram untuk mencatat transaksi langsung dari chat.
          </p>
        </div>

        {loading ? (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
            <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-3" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm text-gray-500">Memeriksa status koneksi...</p>
          </div>
        ) : telegramLink ? (
          /* ── Connected State ──────────────────────────────────────── */
          <div className="space-y-4">
            <div className="rounded-xl border border-green-200 bg-green-50 p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-2xl shrink-0">
                  ✅
                </div>
                <div className="flex-1">
                  <h2 className="text-base font-semibold text-green-900">
                    Terhubung
                  </h2>
                  <p className="text-sm text-green-700 mt-1">
                    Akun Telegram Anda sudah terhubung.
                    {telegramLink.telegram_username && (
                      <span className="font-medium">
                        {" "}(@{telegramLink.telegram_username})
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-green-600 mt-2">
                    Terhubung sejak{" "}
                    {new Date(telegramLink.connected_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Usage guide */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 lg:p-6 space-y-4">
              <h2 className="text-base font-semibold text-gray-900">
                Perintah Bot
              </h2>
              <div className="space-y-2">
                {[
                  { cmd: "/start", desc: "Mulai menggunakan bot" },
                  { cmd: "/tambah <nominal> <deskripsi>", desc: "Catat pengeluaran" },
                  { cmd: "/pemasukan <nominal> <deskripsi>", desc: "Catat pemasukan" },
                  { cmd: "/saldo", desc: "Cek saldo saat ini" },
                  { cmd: "/riwayat", desc: "Lihat 5 transaksi terakhir" },
                  { cmd: "/kategori", desc: "Lihat daftar kategori" },
                  { cmd: "/help", desc: "Bantuan semua perintah" },
                ].map((item) => (
                  <div
                    key={item.cmd}
                    className="flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-2.5"
                  >
                    <code className="text-xs font-mono font-semibold text-blue-600 whitespace-nowrap">
                      {item.cmd}
                    </code>
                    <span className="text-xs text-gray-500">{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Disconnect */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    Putuskan Koneksi
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Bot tidak akan bisa menerima perintah dari Telegram.
                  </p>
                </div>
                <button
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                >
                  {disconnecting ? "Memutuskan..." : "Putuskan"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ── Not Connected State ──────────────────────────────────── */
          <div className="space-y-4">
            {/* Bot info card */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <div className="text-center py-6">
                <div className="flex justify-center mb-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
                    <TelegramIcon size={32} className="text-blue-600" />
                  </div>
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  Hubungkan Telegram
                </h2>
                <p className="text-sm text-gray-400 max-w-sm mx-auto">
                  Generate PIN, kirim ke bot Telegram, dan akun Anda akan
                  otomatis terhubung.
                </p>
              </div>
            </div>

            {/* Steps */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 lg:p-6 space-y-4">
              <h2 className="text-base font-semibold text-gray-900">
                Cara Menghubungkan
              </h2>
              <div className="space-y-3">
                {/* Step 1 */}
                <div className="flex gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600 shrink-0">
                    1
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Buka bot Telegram
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Cari{" "}
                      <code className="bg-gray-100 px-1.5 py-0.5 rounded text-blue-600">
                        @MIMO25Bot
                      </code>{" "}
                      di Telegram dan kirim perintah{" "}
                      <code className="bg-gray-100 px-1.5 py-0.5 rounded">
                        /start
                      </code>
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600 shrink-0">
                    2
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Generate PIN di sini
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Klik tombol &quot;Generate PIN&quot; di bawah untuk
                      mendapatkan kode 6 digit
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600 shrink-0">
                    3
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Kirim PIN ke bot
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Ketik{" "}
                      <code className="bg-gray-100 px-1.5 py-0.5 rounded">
                        /connect &lt;PIN&gt;
                      </code>{" "}
                      di chat bot Telegram
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* PIN Generator */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 lg:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900">
                  Generate PIN
                </h2>
                {pin && (
                  <span className="text-xs text-gray-400">
                    Berlaku {countdown} detik
                  </span>
                )}
              </div>

              {pin ? (
                <div className="text-center space-y-4">
                  <div className="bg-gray-50 rounded-xl p-6">
                    <p className="text-xs text-gray-400 mb-2">
                      PIN koneksi Anda
                    </p>
                    <p className="text-4xl font-mono font-bold tracking-[0.5em] text-gray-900">
                      {pin}
                    </p>
                    <div className="mt-3 w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-1000"
                        style={{
                          width: `${(countdown / 300) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Kirim ini ke bot Telegram:{" "}
                    <code className="bg-gray-100 px-1.5 py-0.5 rounded font-semibold">
                      /connect {pin}
                    </code>
                  </p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`/connect ${pin}`);
                    }}
                    className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    📋 Salin Perintah
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-4">
                    Klik tombol di bawah untuk menghasilkan PIN 6 digit yang
                    berlaku selama 5 menit.
                  </p>
                  <button
                    onClick={handleGeneratePin}
                    disabled={generating}
                    className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-all"
                  >
                    {generating ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Membuat PIN...
                      </span>
                    ) : (
                      "🔑 Generate PIN"
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Usage guide (collapsed) */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 lg:p-6 space-y-3">
              <h2 className="text-sm font-semibold text-gray-900">
                Perintah yang Tersedia Setelah Terhubung
              </h2>
              <div className="rounded-lg bg-gray-50 p-4 text-xs font-mono text-gray-600 space-y-1">
                <p>
                  <span className="text-gray-400">/</span>connect{" "}
                  &lt;PIN&gt; — Hubungkan akun
                </p>
                <p>
                  <span className="text-gray-400">/</span>tambah 50000 makan
                  siang — Catat pengeluaran
                </p>
                <p>
                  <span className="text-gray-400">/</span>pemasukan 1000000
                  gaji — Catat pemasukan
                </p>
                <p>
                  <span className="text-gray-400">/</span>saldo — Cek saldo
                </p>
                <p>
                  <span className="text-gray-400">/</span>riwayat — 5
                  transaksi terakhir
                </p>
                <p>
                  <span className="text-gray-400">/</span>help — Bantuan
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
