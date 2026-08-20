"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { BottomNav } from "./bottom-nav";

const HIDE_NAV_ROUTES = ["/login"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideNav = HIDE_NAV_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r + "/"),
  );

  return (
    <>
      {!hideNav && <Sidebar />}
      <div className={hideNav ? "" : "lg:pl-64"}>
        {!hideNav && <BottomNav />}
        <main className={hideNav ? "" : "pb-20 lg:pb-0"}>{children}</main>
      </div>
    </>
  );
}
