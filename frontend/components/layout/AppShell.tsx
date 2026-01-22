"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { TelegramConnectModal } from "@/components/telegram/TelegramConnectModal";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { acceptStudentInvite } from "@/services/invites.api";

const getTitle = (pathname: string) => {
  if (pathname === "/") return "Главная";
  if (pathname === "/calendar") return "Расписание";
  if (pathname === "/students") return "Ученики";
  if (pathname.startsWith("/students/")) return "Профиль ученика";
  if (pathname === "/notifications") return "Менеджмент уведомлений";
  if (pathname === "/teachers") return "Мои учителя";
  if (pathname === "/invitations") return "Приглашения";
  if (pathname === "/analytics" || pathname.startsWith("/analytics/")) return "Аналитика и финансы";
  return "SecRep";
};

export const AppShell = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();
  const { role, setRole } = useRole();
  const [collapsed, setCollapsed] = useState(false);
  const [tgOpen, setTgOpen] = useState(false);

  const isAuthPage = pathname === "/login" || pathname === "/register" || pathname.startsWith("/invite/");
  const title = useMemo(() => getTitle(pathname), [pathname]);

  useEffect(() => {
    if (isAuthPage) return;
    if (loading) return;
    if (!user) return;

    const pendingInviteToken = window.localStorage.getItem("invite:pending");
    if (pendingInviteToken) {
      window.localStorage.removeItem("invite:pending");
      setRole("Ученик");
      acceptStudentInvite(pendingInviteToken)
        .catch(() => null)
        .finally(() => router.replace("/teachers"));
      return;
    }

    const isTeacherOnly =
      pathname === "/students" ||
      pathname.startsWith("/students/") ||
      pathname === "/analytics" ||
      pathname.startsWith("/analytics/") ||
      pathname === "/notifications";

    const isStudentOnly = pathname === "/teachers" || pathname === "/invitations";

    if (role === "Ученик" && isTeacherOnly) router.replace("/teachers");
    if (role === "Учитель" && isStudentOnly) router.replace("/students");
  }, [isAuthPage, loading, pathname, role, router, setRole, user]);

  useEffect(() => {
    const saved = window.localStorage.getItem("sidebar:collapsed");
    setCollapsed(saved === "1");
  }, []);

  useEffect(() => {
    window.localStorage.setItem("sidebar:collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  if (isAuthPage) {
    return <div className="min-h-screen bg-[#f3f4f6] text-gray-900">{children}</div>;
  }

  if (loading) {
    return <div className="min-h-screen bg-[#f3f4f6] p-8 text-gray-500">Загрузка...</div>;
  }

  if (!user) {
    return <div className="min-h-screen bg-[#f3f4f6] text-gray-900">{children}</div>;
  }

  const initial = (user.email?.trim()?.[0] || "U").toUpperCase();

  return (
    <div className="flex min-h-screen bg-[#f3f4f6] text-gray-900">
      <div className="hidden md:block">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} onTelegramClick={() => setTgOpen(true)} />
      </div>
      <MobileNav />

      <main
        className={`min-h-screen flex-1 p-4 pb-20 md:p-8 md:pb-8 ${collapsed ? "md:ml-20" : "md:ml-72"}`}
      >
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="hidden w-full max-w-lg items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm text-gray-500 shadow-sm ring-1 ring-gray-100 md:flex">
            <span className="text-gray-300">🔎</span>
            <input className="w-full bg-transparent outline-none" placeholder="Поиск" />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">{title}</span>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-500 text-white shadow-sm"
              title="Telegram"
              onClick={() => setTgOpen(true)}
            >
              ✈️
            </button>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-200 font-bold text-purple-700"
              title={user.email}
              onClick={logout}
            >
              {initial}
            </button>
          </div>
        </div>
        {children}
      </main>
      <TelegramConnectModal open={tgOpen} onClose={() => setTgOpen(false)} />
    </div>
  );
};
