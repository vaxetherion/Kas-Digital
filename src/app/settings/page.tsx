import Link from "next/link";
import { TopBar } from "@/components/layout/top-bar";

const settingMenus = [
  {
    href: "/settings/profile",
    icon: "👤",
    title: "Profil",
    description: "Kelola informasi profil akun kamu.",
  },
  {
    href: "/settings/notifications",
    icon: "🔔",
    title: "Notifikasi",
    description: "Atur notifikasi email dan Telegram.",
  },
  {
    href: "/settings/api-keys",
    icon: "🔑",
    title: "API Keys",
    description: "Lihat dan salin Project URL serta API keys Supabase.",
  },
];

export default function SettingsPage() {
  return (
    <>
      <TopBar title="Pengaturan" />
      <div className="p-4 lg:p-8 space-y-4">
        <div className="hidden lg:block">
          <h1 className="text-2xl font-bold text-gray-900">Pengaturan</h1>
          <p className="text-sm text-gray-500 mt-1">
            Kelola pengaturan akun dan aplikasi.
          </p>
        </div>
        <div className="space-y-3">
          {settingMenus.map((menu) => (
            <Link
              key={menu.href}
              href={menu.href}
              className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-4 lg:p-6 hover:border-blue-200 hover:bg-blue-50/30 transition-colors"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-2xl shrink-0">
                {menu.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold text-gray-900">
                  {menu.title}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {menu.description}
                </p>
              </div>
              <svg
                className="h-5 w-5 text-gray-300 shrink-0 mt-3"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
