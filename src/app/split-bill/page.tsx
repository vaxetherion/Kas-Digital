"use client";

import { useState, useCallback } from "react";
import { TopBar } from "@/components/layout/top-bar";
import { formatRupiah, cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────

type Participant = {
  id: string;
  name: string;
  share: number;
};

// ── Component ──────────────────────────────────────────────────────────

export default function SplitBillPage() {
  const [totalAmount, setTotalAmount] = useState(0);
  const [description, setDescription] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([
    { id: "1", name: "", share: 1 },
    { id: "2", name: "", share: 1 },
  ]);
  const [splitMethod, setSplitMethod] = useState<"equal" | "custom">("equal");

  const addParticipant = () => {
    setParticipants((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        name: "",
        share: 1,
      },
    ]);
  };

  const removeParticipant = (id: string) => {
    if (participants.length <= 2) return;
    setParticipants((prev) => prev.filter((p) => p.id !== id));
  };

  const updateParticipant = (id: string, field: "name" | "share", value: string | number) => {
    setParticipants((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, [field]: value } : p,
      ),
    );
  };

  const totalShares = participants.reduce((sum, p) => sum + p.share, 0);

  const calculateShares = useCallback(() => {
    if (splitMethod === "equal") {
      const shareAmount = totalShares > 0 ? totalAmount / totalShares : 0;
      return participants.map((p) => ({
        ...p,
        amount: shareAmount * p.share,
      }));
    }
    // Custom split - distribute proportionally by share
    const shareAmount = totalShares > 0 ? totalAmount / totalShares : 0;
    return participants.map((p) => ({
      ...p,
      amount: shareAmount * p.share,
    }));
  }, [participants, totalAmount, totalShares, splitMethod]);

  const results = calculateShares();
  const totalDistributed = results.reduce((sum, r) => sum + r.amount, 0);
  const roundingDiff = totalAmount - totalDistributed;

  return (
    <>
      <TopBar title="Split Bill" />
      <div className="p-4 lg:p-8 space-y-4 max-w-2xl mx-auto">
        {/* Desktop header */}
        <div className="hidden lg:block">
          <h1 className="text-2xl font-bold text-gray-900">Smart Split Bill</h1>
          <p className="text-sm text-gray-500 mt-1">
            Bagi tagihan kelompok dengan mudah dan akurat.
          </p>
        </div>

        {/* Bill details */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 lg:p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Detail Tagihan</h2>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Deskripsi
            </label>
            <input
              type="text"
              placeholder="Contoh: Makan malam di Warung Padang"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Total Tagihan (Rp) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              placeholder="0"
              value={totalAmount || ""}
              onChange={(e) => setTotalAmount(parseFloat(e.target.value) || 0)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-lg font-semibold"
            />
            {totalAmount > 0 && (
              <p className="text-xs text-gray-400 mt-1">
                {formatRupiah(totalAmount)}
              </p>
            )}
          </div>
        </div>

        {/* Split method */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 lg:p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Cara Pembagian</h2>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setSplitMethod("equal")}
              className={cn(
                "rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all",
                splitMethod === "equal"
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300",
              )}
            >
              ⚖️ Bagi Rata
            </button>
            <button
              onClick={() => setSplitMethod("custom")}
              className={cn(
                "rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all",
                splitMethod === "custom"
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300",
              )}
            >
              📊 Custom Share
            </button>
          </div>
          <p className="text-xs text-gray-400">
            {splitMethod === "equal"
              ? "Setiap orang membayar sesuai jumlah share mereka. Default 1 share per orang."
              : "Atur jumlah share per orang untuk pembagian proporsional."}
          </p>
        </div>

        {/* Participants */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 lg:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">
              Peserta ({participants.length})
            </h2>
            <button
              onClick={addParticipant}
              className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
            >
              + Tambah
            </button>
          </div>

          <div className="space-y-3">
            {participants.map((p, index) => (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-lg bg-gray-50 p-3"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600 shrink-0">
                  {index + 1}
                </span>
                <input
                  type="text"
                  placeholder="Nama"
                  value={p.name}
                  onChange={(e) => updateParticipant(p.id, "name", e.target.value)}
                  className="flex-1 min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                />
                {splitMethod === "custom" && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() =>
                        updateParticipant(p.id, "share", Math.max(1, p.share - 1))
                      }
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-200 text-gray-600 hover:bg-gray-300 transition-colors text-sm font-bold"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-sm font-semibold text-gray-900">
                      {p.share}
                    </span>
                    <button
                      onClick={() => updateParticipant(p.id, "share", p.share + 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-200 text-gray-600 hover:bg-gray-300 transition-colors text-sm font-bold"
                    >
                      +
                    </button>
                  </div>
                )}
                <button
                  onClick={() => removeParticipant(p.id)}
                  disabled={participants.length <= 2}
                  className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 transition-all"
                >
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Results */}
        {totalAmount > 0 && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 lg:p-6 space-y-4">
            <h2 className="text-base font-semibold text-blue-900">
              Hasil Pembagian
            </h2>

            <div className="space-y-2">
              {results.map((r, index) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-lg bg-white p-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-600">
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {r.name || `Peserta ${index + 1}`}
                    </span>
                    {splitMethod === "custom" && (
                      <span className="text-[10px] text-gray-400">
                        ({r.share} share{r.share > 1 ? "s" : ""})
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-bold text-blue-700">
                    {formatRupiah(r.amount)}
                  </span>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="border-t border-blue-200 pt-3 space-y-1">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Total Tagihan</span>
                <span>{formatRupiah(totalAmount)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Total Didistribusikan</span>
                <span>{formatRupiah(totalDistributed)}</span>
              </div>
              {Math.abs(roundingDiff) > 0.5 && (
                <div className="flex items-center justify-between text-xs text-amber-600">
                  <span>Selisih pembulatan</span>
                  <span>{formatRupiah(Math.abs(roundingDiff))}</span>
                </div>
              )}
            </div>

            {/* Copy results */}
            <button
              onClick={() => {
                const text = [
                  description ? `📋 ${description}` : "📋 Split Bill",
                  `💰 Total: ${formatRupiah(totalAmount)}`,
                  "",
                  ...results.map(
                    (r, i) =>
                      `${r.name || `Peserta ${i + 1}`}: ${formatRupiah(r.amount)}${splitMethod === "custom" ? ` (${r.share} share)` : ""}`,
                  ),
                  "",
                  `Dibuat dengan MIMO 2.5 Split Bill`,
                ].join("\n");
                navigator.clipboard.writeText(text);
              }}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-all"
            >
              📋 Salin Hasil
            </button>
          </div>
        )}
      </div>
    </>
  );
}
