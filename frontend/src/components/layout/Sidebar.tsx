"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  LayoutDashboard,
  Shield,
  Users,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import { useHealth } from "@/hooks/useHealth";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/risk", label: "Risk", icon: Shield },
  { href: "/segments", label: "Segments", icon: Users },
  { href: "/forecast", label: "Forecast", icon: TrendingUp },
  { href: "/retrain", label: "Retrain", icon: RefreshCw },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isOnline, isLoading } = useHealth();

  return (
    <aside className="hidden md:flex flex-col w-60 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
      <div className="p-5 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          COD-CRM
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          AI Dashboard
        </p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800"
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <span
            className={clsx(
              "h-2.5 w-2.5 rounded-full",
              isLoading
                ? "bg-gray-400 animate-pulse"
                : isOnline
                ? "bg-green-500"
                : "bg-red-500"
            )}
          />
          <span className="text-xs text-gray-500 dark:text-gray-400">
            ML Service {isLoading ? "..." : isOnline ? "Online" : "Offline"}
          </span>
        </div>
      </div>
    </aside>
  );
}
