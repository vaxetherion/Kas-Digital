import { TopBar } from "@/components/layout/top-bar";

export default function CategoriesPage() {
  return (
    <>
      <TopBar title="Kategori" />
      <div className="p-4 lg:p-8 space-y-4">
        <div className="hidden lg:block">
          <h1 className="text-2xl font-bold text-gray-900">Kategori</h1>
          <p className="text-sm text-gray-500 mt-1">
            Kelola kategori transaksi.
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="text-center py-12">
            <p className="text-sm text-gray-400">
              Halaman kategori — Coming soon.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
