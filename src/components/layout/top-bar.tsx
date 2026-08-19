"use client";

import { useState } from "react";
import Link from "next/link";
import { MenuIcon, CloseIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

interface TopBarProps {
  title?: string;
  rightAction?: React.ReactNode;
}

export function TopBar({ title = "Kas Digital", rightAction }: TopBarProps) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-gray-200 bg-white/80 px-4 backdrop-blur-lg lg:hidden">
      <div className="flex items-center gap-2">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-white font-bold text-xs">
            M
          </div>
          <span className="text-sm font-bold text-gray-900">{title}</span>
        </Link>
      </div>
      {rightAction}
    </header>
  );
}
