"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Suspense } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";
  const [supabase, setSupabase] = useState<ReturnType<typeof createClient> | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const client = createClient();
    setSupabase(client);

    // Check if already logged in
    client.auth.getSession().then((res: { data: { session: { user: unknown } | null } }) => {
      if (res.data.session) {
        router.replace(redirectTo);
      } else {
        setCheckingSession(false);
      }
    });
  }, [router, redirectTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!supabase) {
      setError("Sistem belum siap.");
      setLoading(false);
      return;
    }

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError) {
      setError(
        authError.message.includes("Invalid login")
          ? "Email atau password salah."
          : authError.message,
      );
      setLoading(false);
      return;
    }

    router.replace(redirectTo);
  };

  const handleMagicLink = async () => {
    setError(null);
    if (!email.trim()) {
      setError("Masukkan email terlebih dahulu.");
      return;
    }
    if (!supabase) return;

    setLoading(true);
    const { error: magicError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}${redirectTo}`,
      },
    });

    if (magicError) {
      setError(magicError.message);
    } else {
      setError(null);
      alert("Link login telah dikirim ke email Anda! Cek inbox/spam.");
    }
    setLoading(false);
  };

  // Don't render form while checking existing session
  if (checkingSession) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-gray-50">
        <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white font-bold text-xl mx-auto mb-4 shadow-lg shadow-blue-600/20">
            M
          </div>
          <h1 className="text-xl font-bold text-gray-900">MIMO 2.5</h1>
          <p className="text-sm text-gray-500 mt-1">Kas Digital</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 mb-1">
            Masuk ke akun Anda
          </h2>
          <p className="text-xs text-gray-500 mb-5">
            Gunakan email dan password, atau magic link.
          </p>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <input
                type="email"
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? "Masuk..." : "Masuk"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">atau</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Magic link */}
          <button
            onClick={handleMagicLink}
            disabled={loading}
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-all"
          >
            📧 Kirim Magic Link ke Email
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Belum punya akun?{" "}
          <Link href="/settings" className="text-blue-600 hover:underline">
            Hubungi admin
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh flex items-center justify-center bg-gray-50">
        <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
