"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRole } from "@/hooks/useRole";

export const MobileNav = () => {
  const pathname = usePathname();
  const { role } = useRole();

  const items =
    role === "Ученик"
      ? [
          { href: "/", label: "Главная", icon: "🏠" },
          { href: "/teachers", label: "Учителя", icon: "👤" },
          { href: "/calendar", label: "Расписание", icon: "📅" },
          { href: "/invitations", label: "Пригл.", icon: "✉️" },
        ]
      : [
          { href: "/", label: "Главная", icon: "🏠" },
          { href: "/calendar", label: "Расписание", icon: "📅" },
          { href: "/students", label: "Ученики", icon: "🎓" },
          { href: "/notifications", label: "Уведомления", icon: "🔔" },
        ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-4 gap-1 px-2 py-2">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs ${
                active ? "bg-purple-50 text-purple-700" : "text-gray-500"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
