import { NextRequest, NextResponse } from "next/server";
import { getBot } from "@/lib/telegram/bot";

// ---------------------------------------------------------------------------
// POST /api/telegram/webhook
//
// Telegram sends updates here. We verify the request using the
// X-Telegram-Bot-Api-Secret-Token header, then forward the update to grammY.
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  // ── 1. Verify secret token ──────────────────────────────────────────────
  const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET;
  const receivedToken = request.headers.get(
    "X-Telegram-Bot-Api-Secret-Token",
  );

  if (!secretToken) {
    console.error("TELEGRAM_WEBHOOK_SECRET is not configured");
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 500 },
    );
  }

  if (!receivedToken || receivedToken !== secretToken) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  // ── 2. Parse the update ─────────────────────────────────────────────────
  let update: unknown;
  try {
    update = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  // ── 3. Forward to grammY bot ────────────────────────────────────────────
  try {
    const bot = getBot();
    await bot.handleUpdate(update as Parameters<typeof bot.handleUpdate>[0]);
  } catch (err) {
    console.error("Telegram bot error:", err);
    return NextResponse.json(
      { error: "Bot processing error" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

// ── GET handler for health checks ───────────────────────────────────────────
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "MIMO 2.5 Telegram Webhook",
    timestamp: new Date().toISOString(),
  });
}
