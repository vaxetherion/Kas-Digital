"use client";

import { useState } from "react";
import { TopBar } from "@/components/layout/top-bar";

function maskKey(key: string): string {
  if (!key || key.length < 12) return "••••••••••••";
  return key.slice(0, 6) + "••••••••" + key.slice(-4);
}

export default function ApiKeysPage() {
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  const [showAnon, setShowAnon] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const items = [
    {
      label: "Project URL",
      value: projectUrl,
      secret: false,
      description: "URL dasar Supabase project kamu, digunakan oleh client dan REST API.",
    },
    {
      label: "Anon Key (Public)",
      value: anonKey,
      secret: true,
      description: "Key publik untuk client-side. Aman diekspos di browser, dikontrol oleh Row Level Security (RLS).",
    },
  ];

  const handleCopy = async (label: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <>
      <TopBar title="API Keys" />
      <div className="p-4 lg:p-8 space-y-4">
        {/* Desktop header */}
        <div className="hidden lg:block">
          <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
          <p className="text-sm text-gray-500 mt-1">
            Konfigurasi API keys untuk koneksi ke Supabase.
          </p>
        </div>

        {/* Warning banner */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <div className="flex items-start gap-3">
            <span className="text-lg shrink-0">⚠️</span>
            <div>
              <p className="font-semibold">Jangan bagikan API keys ke publik</p>
              <p className="text-amber-700 mt-0.5">
                Anon key aman untuk client-side karena dilindungi RLS, tetapi{" "}
                <strong>service role key</strong> tidak boleh pernah diekspos ke browser.
              </p>
            </div>
          </div>
        </div>

        {/* API Keys list */}
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-gray-200 bg-white p-4 lg:p-6 space-y-3"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-semibold text-gray-900">
                    {item.label}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {item.description}
                  </p>
                </div>
              </div>

              {/* Value display */}
              <div className="flex items-center gap-2 rounded-lg bg-gray-50 border border-gray-100 px-3 py-2.5">
                <code className="flex-1 text-xs text-gray-800 font-mono break-all truncate">
                  {!item.value ? (
                    <span className="text-red-500 italic">
                      Belum diatur — set env variable di Vercel
                    </span>
                  ) : item.secret && !showAnon ? (
                    maskKey(item.value)
                  ) : (
                    item.value
                  )}
                </code>

                <div className="flex items-center gap-1 shrink-0">
                  {/* Toggle visibility (only for secret keys) */}
                  {item.secret && item.value && (
                    <button
                      onClick={() => setShowAnon(!showAnon)}
                      className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                      title={showAnon ? "Sembunyikan" : "Tampilkan"}
                    >
                      {showAnon ? (
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                          <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  )}

                  {/* Copy button */}
                  <button
                    onClick={() => handleCopy(item.label, item.value)}
                    disabled={!item.value}
                    className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Salin"
                  >
                    {copied === item.label ? (
                      <svg className="h-4 w-4 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* How to find keys guide */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 lg:p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900">
            📖 Cara Mendapatkan API Keys
          </h2>
          <ol className="text-sm text-gray-600 space-y-3 list-decimal list-inside">
            <li>
              Buka{" "}
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline font-medium"
              >
                Supabase Dashboard
              </a>{" "}
              → pilih project kamu.
            </li>
            <li>
              Klik <strong>Settings</strong> (⚙️) → <strong>Configuration</strong>{" "}
              → <strong>API</strong> di sidebar kiri.
            </li>
            <li>
              Di bagian <strong>Project URL</strong>, salin URL (format:{" "}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-xs font-mono">
                https://xxxxx.supabase.co
              </code>
              ).
            </li>
            <li>
              Di bagian <strong>Project API Keys</strong>, cari key bernama{" "}
              <strong>anon</strong> <strong>public</strong> dan salin nilainya.
            </li>
            <li>
              Set kedua environment variable di{" "}
              <strong>Vercel Dashboard</strong> → Settings → Environment Variables.
            </li>
          </ol>
        </div>

        {/* Env variable reference */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 lg:p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900">
            🔧 Environment Variables
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="py-2 pr-4 font-medium text-gray-500">Variable</th>
                  <th className="py-2 pr-4 font-medium text-gray-500">Required</th>
                  <th className="py-2 font-medium text-gray-500">Deskripsi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-gray-600">
                <tr>
                  <td className="py-2 pr-4 font-mono text-xs text-blue-600">
                    NEXT_PUBLIC_SUPABASE_URL
                  </td>
                  <td className="py-2 pr-4 text-green-600 font-medium">Ya</td>
                  <td className="py-2">URL dasar project Supabase</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-mono text-xs text-blue-600">
                    NEXT_PUBLIC_SUPABASE_ANON_KEY
                  </td>
                  <td className="py-2 pr-4 text-green-600 font-medium">Ya</td>
                  <td className="py-2">Public anon key dari Supabase</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
