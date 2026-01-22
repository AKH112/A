"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRole } from "@/hooks/useRole";

type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
  onTelegramClick: () => void;
};

export const Sidebar = ({ collapsed, onToggle, onTelegramClick }: SidebarProps) => {
  const pathname = usePathname();
  const { role, setRole } = useRole();

  const mainMenu =
    role === "Ученик"
      ? [
          { label: "Главная", href: "/", icon: "🏠" },
          { label: "Мои учителя", href: "/teachers", icon: "👤" },
          { label: "Расписание", href: "/calendar", icon: "📅" },
        ]
      : [
          { label: "Главная", href: "/", icon: "🏠" },
          { label: "Ученики", href: "/students", icon: "🎓" },
          { label: "Расписание", href: "/calendar", icon: "📅" },
          { label: "Аналитика и финансы", href: "/analytics", icon: "📊" },
          { label: "Уведомления", href: "/notifications", icon: "🔔" },
        ];

  return (
    <aside className={`fixed left-0 top-0 z-50 h-screen ${collapsed ? "w-20" : "w-72"} p-4`}>
      <div className="h-full rounded-3xl bg-white p-3 shadow-sm ring-1 ring-gray-100">
        <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"} px-2 py-2`}>
          <div className={`flex items-center gap-2 ${collapsed ? "justify-center" : ""}`}>
            <div className="h-8 w-8 rounded-lg bg-black" />
            {!collapsed && <span className="text-lg font-bold tracking-tight">SecRep</span>}
          </div>
          {!collapsed && (
            <button
              type="button"
              onClick={onToggle}
              className="rounded-lg px-2 py-1 text-sm text-gray-400 hover:bg-gray-50 hover:text-gray-700"
              aria-label="Свернуть меню"
            >
              «
            </button>
          )}
          {collapsed && (
            <button
              type="button"
              onClick={onToggle}
              className="rounded-lg px-2 py-1 text-sm text-gray-400 hover:bg-gray-50 hover:text-gray-700"
              aria-label="Развернуть меню"
            >
              »
            </button>
          )}
        </div>

        <nav className="mt-4 space-y-1">
          {mainMenu.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition ${
                  isActive ? "bg-purple-50 text-purple-600" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                } ${collapsed ? "justify-center" : ""}`}
              >
                <span className="text-base">{item.icon}</span>
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {!collapsed && (
          <div className="mt-6 rounded-2xl bg-gray-50 p-4">
            <p className="mb-2 text-xs font-medium text-gray-500">Телеграм-бот</p>
            <button className="flex items-center gap-2 text-xs font-bold text-purple-600" type="button" onClick={onTelegramClick}>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100">✈️</span>
              Активировать
            </button>
          </div>
        )}

        {!collapsed && (
          <div className="mt-4 space-y-2 px-2 text-xs text-gray-400">
            <p>Приложение</p>
            {role === "Ученик" && <p>Приглашения</p>}
            <p>Чат поддержки</p>
            <p>Частые вопросы</p>
            <p>О нас</p>
          </div>
        )}

        {!collapsed && (
          <div className="mt-5 px-2">
            <p className="mb-2 text-xs text-gray-400">Режим</p>
            <div className="flex items-center justify-between rounded-2xl bg-gray-50 p-2">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setRole("Ученик")}
                  className={`rounded-xl px-3 py-2 text-xs font-medium ${
                    role === "Ученик" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  Ученик
                </button>
                <button
                  type="button"
                  onClick={() => setRole("Учитель")}
                  className={`rounded-xl px-3 py-2 text-xs font-medium ${
                    role === "Учитель" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  Учитель
                </button>
              </div>
              <div className={`h-2.5 w-2.5 rounded-full ${role === "Учитель" ? "bg-purple-500" : "bg-pink-400"}`} />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
