"use client";

import Link from "next/link";
import { useRequireAuth } from "@/hooks/useRequireAuth";

export default function DashboardPage() {
  const { loading } = useRequireAuth();
  const currentDate = new Date().toLocaleDateString("ru-RU");

  if (loading) return <div className="text-gray-500">Загрузка...</div>;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-purple-100 px-4 py-2 text-xs font-bold text-purple-700">
          Первые шаги <span>↗</span>
        </div>

        <div className="relative flex min-h-[240px] flex-col justify-between overflow-hidden rounded-3xl bg-[#1f2937] p-8 text-white">
          <div className="relative z-10">
            <h2 className="mb-2 text-xl font-bold">Уроки и дела на {currentDate}</h2>
            <p className="mb-6 text-gray-400">На сегодня ничего не запланировано</p>
            <div className="flex gap-3">
              <Link href="/calendar">
                <button
                  className="rounded-full bg-white px-6 py-2 font-medium text-black transition hover:bg-gray-100"
                  type="button"
                >
                  Добавить урок
                </button>
              </Link>
              <button
                className="rounded-full border border-gray-600 px-6 py-2 font-medium text-white transition hover:bg-gray-800"
                type="button"
              >
                Добавить дело
              </button>
            </div>
          </div>
          <div className="absolute -bottom-10 -right-10 h-48 w-48 rounded-full bg-pink-400 opacity-50 blur-xl" />
          <div className="absolute bottom-0 right-0 h-32 w-32 rounded-tl-full bg-pink-500" />
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="flex items-center justify-center">
              <div className="flex h-32 w-32 flex-col items-center justify-center rounded-full border border-gray-100 bg-white">
                <div className="text-lg font-bold">0</div>
                <div className="text-xs text-gray-500">занятий</div>
                <div className="text-[11px] text-gray-400">проведено</div>
              </div>
            </div>
            <div className="flex items-center justify-center">
              <div className="flex h-32 w-32 flex-col items-center justify-center rounded-full border border-gray-100 bg-white">
                <div className="text-lg font-bold">0ч 0м</div>
                <div className="text-xs text-gray-500">занятий</div>
                <div className="text-[11px] text-gray-400">проведено</div>
              </div>
            </div>
            <div className="flex flex-col justify-center">
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">Заработано за неделю</div>
                <div className="text-2xl font-bold">0 ₽</div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="text-xs text-gray-500">Ожидаемый недельный заработок</div>
                <div className="text-lg font-semibold">0 ₽</div>
              </div>
              <div className="mt-3 flex items-center justify-end">
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-600"
                >
                  RUB <span className="text-gray-300">›</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="relative min-h-[200px] overflow-hidden rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <div className="mb-4 flex items-start justify-between">
              <h3 className="font-bold">Долги по оплате</h3>
              <span className="text-gray-300">›</span>
            </div>
            <p className="mt-2 text-sm text-gray-500">Пока все ученики платят в срок</p>
            <div className="absolute -bottom-8 -left-6 h-28 w-28 rounded-full bg-blue-200 opacity-60" />
            <div className="absolute bottom-6 left-10 text-2xl">👀</div>
          </div>

          <div className="relative min-h-[200px] overflow-hidden rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold">Заметки на сегодня</h3>
              <button
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
                type="button"
              >
                +
              </button>
            </div>
            <p className="text-sm text-gray-500">Заметки в SecRep могут заменить вам планировщик задач</p>
            <div className="absolute -bottom-6 -right-6 h-28 w-28 rounded-full bg-lime-300 opacity-60" />
            <div className="absolute bottom-6 right-10 text-2xl">👀</div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="min-h-[200px] rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <h3 className="mb-4 font-bold">Домашние задания</h3>
          <p className="text-sm text-gray-500">У вас пока нет учеников</p>
          <Link href="/students" className="mt-4 inline-flex">
            <button className="rounded-full bg-gray-100 px-5 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200" type="button">
              Добавить ученика
            </button>
          </Link>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <div className="mb-4 flex items-center gap-2">
            <span className="font-bold text-purple-600">🚀 Первые шаги</span>
          </div>
          <div className="space-y-3">
            <Link
              href="/students"
              className="flex items-center gap-3 rounded-2xl border border-gray-100 p-3 text-sm font-medium transition hover:bg-gray-50"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-xs">1</div>
              Добавим первого ученика
            </Link>
            <div className="flex items-center gap-3 rounded-2xl border border-gray-100 p-3 text-sm font-medium opacity-50">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-xs">2</div>
              Подключаем Telegram-бота
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
