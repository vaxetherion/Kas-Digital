import { TopBar } from "@/components/layout/top-bar";
import { TelegramIcon } from "@/components/ui/icons";

export default function TelegramPage() {
  return (
    <>
      <TopBar title="Telegram" />
      <div className="p-4 lg:p-8 space-y-4">
        <div className="hidden lg:block">
          <h1 className="text-2xl font-bold text-gray-900">Telegram Bot</h1>
          <p className="text-sm text-gray-500 mt-1">
            Kelola integrasi bot Telegram untuk pencatatan cepat.
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="text-center py-12">
            <div className="flex justify-center mb-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
                <TelegramIcon size={32} className="text-blue-600" />
              </div>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Integrasi Telegram
            </h2>
            <p className="text-sm text-gray-400 max-w-sm mx-auto">
              Hubungkan akun Telegram Anda untuk mencatat transaksi langsung
              dari chat. Kirim perintah <code>/start</code> di bot untuk
              memulai.
            </p>
            <div className="mt-6 rounded-lg bg-gray-50 p-4 text-left text-xs font-mono text-gray-600 max-w-md mx-auto">
              <p className="text-gray-400 mb-2">// Contoh perintah bot:</p>
              <p>/connect — Hubungkan akun Telegram</p>
              <p>/tambah 50000 makan siang — Catat pengeluaran</p>
              <p>/saldo — Cek saldo saat ini</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
