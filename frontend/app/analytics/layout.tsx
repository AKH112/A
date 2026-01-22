"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/analytics", label: "Аналитика" },
  { href: "/analytics/wallets", label: "Кошельки" },
  { href: "/analytics/finance", label: "Доходы и расходы" },
];

const isActive = (pathname: string, href: string) => {
  if (href === "/analytics") return pathname === "/analytics";
  return pathname === href || pathname.startsWith(`${href}/`);
};

export default function AnalyticsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <div className="inline-flex rounded-full bg-white p-1 shadow-sm ring-1 ring-gray-100">
        {tabs.map((t) => {
          const active = isActive(pathname, t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                active ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
      {children}
    </div>
  );
}

