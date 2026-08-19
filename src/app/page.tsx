import { TopBar } from "@/components/layout/top-bar";
import {
  TrendingUpIcon,
  TrendingDownIcon,
  TransactionIcon,
  CategoryIcon,
} from "@/components/ui/icons";
import { formatRupiah } from "@/lib/utils";

const SUMMARY_CARDS = [
  {
    label: "Total Pemasukan",
    value: 12_500_000,
    icon: TrendingUpIcon,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    label: "Total Pengeluaran",
    value: 8_750_000,
    icon: TrendingDownIcon,
    color: "text-red-600",
    bg: "bg-red-50",
  },
  {
    label: "Saldo Bersih",
    value: 3_750_000,
    icon: TransactionIcon,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    label: "Total Transaksi",
    value: 0,
    icon: CategoryIcon,
    color: "text-purple-600",
    bg: "bg-purple-50",
    display: "count" as const,
  },
];

export default function DashboardPage() {
  return (
    <>
      <TopBar title="Dashboard" />
      <div className="p-4 lg:p-8 space-y-6">
        {/* Page header (desktop) */}
        <div className="hidden lg:block">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Ringkasan aktivitas kas digital Anda.
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          {SUMMARY_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="rounded-xl border border-gray-200 bg-white p-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${card.bg}`}>
                    <Icon size={18} className={card.color} />
                  </div>
                </div>
                <p className="text-xs font-medium text-gray-500">
                  {card.label}
                </p>
                <p className="text-lg font-bold text-gray-900 mt-0.5">
                  {card.display === "count"
                    ? "0"
                    : formatRupiah(card.value)}
                </p>
              </div>
            );
          })}
        </div>

        {/* Quick actions */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 lg:p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">
            Transaksi Terbaru
          </h2>
          <div className="text-center py-8">
            <p className="text-sm text-gray-400">
              Belum ada transaksi. Mulai catat transaksi pertama Anda!
            </p>
            <a
              href="/transactions/new"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Tambah Transaksi
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
