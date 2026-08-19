import { Bot, Context } from "grammy";

// ---------------------------------------------------------------------------
// Supabase admin client (service role — bypasses RLS for bot operations)
// Created lazily so env vars are available at runtime, not build time.
// ---------------------------------------------------------------------------

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars are not set");

  // Dynamic import to avoid build-time resolution
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require("@supabase/supabase-js");
  return createClient(url, key);
}

// ---------------------------------------------------------------------------
// Bot instance — created lazily so env vars are available at runtime
// ---------------------------------------------------------------------------

let _bot: Bot | null = null;

export function getBot(): Bot {
  if (_bot) return _bot;

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not set");

  _bot = new Bot(token);

  // ── /start ──────────────────────────────────────────────────────────────
  _bot.command("start", async (ctx: Context) => {
    const tg = ctx.from;
    if (!tg) return;

  const supabase = getSupabaseAdmin();

  await supabase.from("users").upsert(
      {
        id: `tg_${tg.id}`,
        telegram_id: tg.id,
        telegram_username: tg.username ?? null,
        full_name: [tg.first_name, tg.last_name].filter(Boolean).join(" "),
        role: "staff",
        is_active: true,
      },
      { onConflict: "telegram_id" },
    );

    await ctx.reply(
      [
        `👋 Halo, ${tg.first_name}!`,
        "",
        "Selamat datang di **Kas Digital MIMO 2.5**.",
        "",
        "Perintah yang tersedia:",
        "• `/connect` — Hubungkan akun Telegram",
        "• `/tambah <nominal> <deskripsi>` — Catat transaksi",
        "• `/saldo` — Cek saldo saat ini",
      ].join("\n"),
      { parse_mode: "Markdown" },
    );
  });

  // ── /connect ────────────────────────────────────────────────────────────
  _bot.command("connect", async (ctx: Context) => {
    const tg = ctx.from;
    if (!tg) return;

    const chatId = ctx.chat?.id;
    if (!chatId) {
      await ctx.reply("⚠️ Tidak dapat mengidentifikasi chat ini.");
      return;
    }

  const supabase = getSupabaseAdmin();

  const { error } = await supabase.from("telegram_links").upsert(
      {
        user_id: `tg_${tg.id}`,
        telegram_id: tg.id,
        telegram_username: tg.username ?? null,
        chat_id: chatId,
        is_active: true,
        connected_at: new Date().toISOString(),
        last_interaction_at: new Date().toISOString(),
      },
      { onConflict: "telegram_id" },
    );

    if (error) {
      await ctx.reply("❌ Gagal menghubungkan akun. Silakan coba lagi.");
      console.error("Telegram connect error:", error);
      return;
    }

    await ctx.reply(
      "✅ Akun Telegram berhasil terhubung!\n\nSekarang Anda bisa mencatat transaksi langsung dari chat ini.",
    );
  });

  // ── /tambah ─────────────────────────────────────────────────────────────
  _bot.command("tambah", async (ctx: Context) => {
    const tg = ctx.from;
    if (!tg) return;

    const text = ctx.message?.text ?? "";
    // Parse: /tambah <nominal> <deskripsi...>
    const match = text.match(/^\/tambah\s+(\d+)\s*(.*)/);

    if (!match) {
      await ctx.reply(
        "📝 Format: `/tambah <nominal> <deskripsi>`\n\nContoh: `/tambah 50000 makan siang`",
        { parse_mode: "Markdown" },
      );
      return;
    }

    const amount = parseInt(match[1], 10);
    const description = match[2]?.trim() || "Transaksi tanpa deskripsi";

    if (amount <= 0) {
      await ctx.reply("⚠️ Nominal harus lebih besar dari 0.");
      return;
    }

    // Determine income vs expense (amount > 0 = expense by default)
    const type = "expense";

    const supabase = getSupabaseAdmin();

  const { error } = await supabase.from("transactions").insert({
      user_id: `tg_${tg.id}`,
      type,
      amount,
      description,
      status: "confirmed",
      transaction_date: new Date().toISOString(),
    });

    if (error) {
      await ctx.reply("❌ Gagal mencatat transaksi. Silakan coba lagi.");
      console.error("Transaction insert error:", error);
      return;
    }

    const formatted = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);

    await ctx.reply(
      `✅ Transaksi tercatat!\n\n` +
        `💰 *${formatted}*\n` +
        `📝 ${description}\n` +
        `📅 ${new Date().toLocaleDateString("id-ID")}`,
      { parse_mode: "Markdown" },
    );
  });

  // ── /saldo ──────────────────────────────────────────────────────────────
  _bot.command("saldo", async (ctx: Context) => {
    const tg = ctx.from;
    if (!tg) return;

  const supabase = getSupabaseAdmin();

  // Fetch all confirmed transactions for this user
  const { data, error } = await supabase
      .from("transactions")
      .select("type, amount")
      .eq("user_id", `tg_${tg.id}`)
      .eq("status", "confirmed");

    if (error) {
      await ctx.reply("❌ Gagal mengambil data saldo.");
      console.error("Saldo query error:", error);
      return;
    }

    let income = 0;
    let expense = 0;
    for (const tx of data ?? []) {
      if (tx.type === "income") income += tx.amount;
      else if (tx.type === "expense") expense += tx.amount;
    }
    const balance = income - expense;

    const fmt = (n: number) =>
      new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
      }).format(n);

    await ctx.reply(
      [
        "📊 *Ringkasan Saldo*",
        "",
        `💵 Pemasukan: ${fmt(income)}`,
        `💸 Pengeluaran: ${fmt(expense)}`,
        `🏦 *Saldo: ${fmt(balance)}*`,
      ].join("\n"),
      { parse_mode: "Markdown" },
    );
  });

  // ── Default text handler ────────────────────────────────────────────────
  _bot.on("message:text", async (ctx: Context) => {
    await ctx.reply(
      "🤖 Perintah tidak dikenal. Ketik /start untuk melihat daftar perintah.",
    );
  });

  return _bot;
}
