"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { deleteMyTeacher, getMyTeachers, getTeacherHomework } from "@/services/users.api";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { getApiErrorMessage } from "@/services/apiError";

type Teacher = {
  id: string;
  email: string;
  name?: string | null;
  tariff?: string;
  studentRecordId?: string | null;
  balance?: number;
  rateAmount?: number | null;
  rateMinutes?: number | null;
  subscription?: { id: string; title: string; lessonsLeft: number; lessonsTotal: number } | null;
};

const badgeClassName =
  "inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-900 px-1.5 text-xs font-semibold text-white";

const startOfWeek = (d: Date) => {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
};

const addDays = (d: Date, days: number) => {
  const date = new Date(d);
  date.setDate(date.getDate() + days);
  return date;
};

const formatRangeRu = (start: Date) => {
  const end = addDays(start, 6);
  const fmt = (x: Date) => x.toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "numeric" });
  return `${fmt(start)} — ${fmt(end)}`;
};

export default function TeachersPage() {
  const { loading: authLoading, user } = useRequireAuth();
  const router = useRouter();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [homeworkOpen, setHomeworkOpen] = useState(false);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [homeworkLoading, setHomeworkLoading] = useState(false);
  const [homework, setHomework] = useState<any[]>([]);

  const [deleting, setDeleting] = useState(false);

  const selectedTeacher = useMemo(
    () => teachers.find((t) => t.id === selectedTeacherId) ?? null,
    [selectedTeacherId, teachers],
  );

  const filteredTeachers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return teachers;
    return teachers.filter((t) => (t.name ?? t.email).toLowerCase().includes(q) || t.email.toLowerCase().includes(q));
  }, [query, teachers]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getMyTeachers();
      setTeachers(res.data ?? []);
    } catch (e) {
      setError(getApiErrorMessage(e, "Не удалось загрузить учителей"));
    } finally {
      setLoading(false);
    }
  };

  const loadHomework = async (teacherId: string) => {
    setHomeworkLoading(true);
    setError("");
    try {
      const res = await getTeacherHomework(teacherId, {
        status: "ASSIGNED",
        from: fromDate || undefined,
        to: toDate || undefined,
      });
      setHomework(res.data ?? []);
    } catch (e) {
      setError(getApiErrorMessage(e, "Не удалось загрузить домашние задания"));
      setHomework([]);
    } finally {
      setHomeworkLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    load();
  }, [user]);

  if (authLoading) return <div className="text-gray-500">Загрузка...</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex h-11 w-full max-w-[420px] items-center gap-2 rounded-2xl bg-white px-4 shadow-sm ring-1 ring-gray-100">
          <span className="text-gray-300">🔎</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
            placeholder="Поиск"
          />
        </div>
      </div>

      {error ? <div className="rounded-2xl bg-red-100 p-3 text-red-700">{error}</div> : null}

      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-gray-900">Мои учителя</h2>
          <span className={badgeClassName}>{filteredTeachers.length}</span>
        </div>

        {loading ? (
          <div className="text-gray-500">Загрузка...</div>
        ) : filteredTeachers.length === 0 ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-gray-100">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-purple-50 ring-1 ring-purple-100">
              <div className="text-4xl">👤</div>
            </div>
            <div className="text-sm font-semibold text-gray-900">Учителей пока нет</div>
            <div className="max-w-md text-sm text-gray-500">Учителя появятся после того, как вы примете приглашение.</div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredTeachers.map((t) => {
              const title = t.name?.trim() || t.email;
              const balance = Number(t.balance ?? 0);
              const subscriptionText = t.subscription
                ? `${t.subscription.title} • ${t.subscription.lessonsLeft}/${t.subscription.lessonsTotal}`
                : "Абонемента нет";

              return (
                <div key={t.id} className="rounded-3xl border border-transparent bg-white p-5 shadow-sm ring-1 ring-gray-100">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-base font-bold text-gray-500">
                        {(title?.[0] || "U").toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-gray-900">{title}</div>
                        <div className="mt-1 text-xs text-gray-500">{t.tariff ? `Тариф: ${t.tariff}` : ""}</div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gray-50 text-gray-700 ring-1 ring-gray-100 transition hover:bg-gray-100"
                      onClick={() => {
                        setSelectedTeacherId(t.id);
                        setSettingsOpen(true);
                      }}
                      aria-label="Настройки"
                    >
                      →
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-2xl bg-gray-50 px-4 py-3 ring-1 ring-gray-100">
                      <div className="text-xs font-medium text-gray-500">На счету</div>
                      <div className="mt-1 text-sm font-bold text-gray-900">{balance.toFixed(0)} ₽</div>
                    </div>
                    <div className="rounded-2xl bg-gray-50 px-4 py-3 ring-1 ring-gray-100">
                      <div className="text-xs font-medium text-gray-500">Абонемент</div>
                      <div className="mt-1 truncate text-sm font-semibold text-gray-700">{subscriptionText}</div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      className="flex h-9 flex-1 items-center justify-center rounded-2xl bg-gray-50 text-xs font-semibold text-gray-700 ring-1 ring-gray-100 transition hover:bg-gray-100"
                      onClick={() => {
                        try {
                          window.localStorage.setItem("calendar.booking.teacherId", t.id);
                        } catch {}
                        router.push(`/calendar?bookTeacherId=${encodeURIComponent(t.id)}`);
                      }}
                    >
                      Записаться
                    </button>
                    <button
                      type="button"
                      className="flex h-9 flex-1 items-center justify-center rounded-2xl bg-gray-50 text-xs font-semibold text-gray-700 ring-1 ring-gray-100 transition hover:bg-gray-100"
                      onClick={async () => {
                        setSelectedTeacherId(t.id);
                        setHomeworkOpen(true);
                        await loadHomework(t.id);
                      }}
                    >
                      ДЗ
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <Modal
        open={homeworkOpen && !!selectedTeacher}
        onClose={() => setHomeworkOpen(false)}
        title="Домашние задания"
        side="right"
        widthClassName="max-w-[560px]"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
            <label className="block">
              <div className="mb-1 text-xs font-medium text-gray-600">Период</div>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none"
              />
            </label>
            <label className="block">
              <div className="mb-1 text-xs font-medium text-gray-600"> </div>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none"
              />
            </label>
            <Button
              type="button"
              variant="secondary"
              className="h-10 w-auto rounded-xl px-4"
              disabled={homeworkLoading || !selectedTeacher}
              onClick={() => selectedTeacher && loadHomework(selectedTeacher.id)}
            >
              Применить
            </Button>
          </div>

          {homeworkLoading ? (
            <div className="text-sm text-gray-500">Загрузка...</div>
          ) : homework.length === 0 ? (
            <div className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-500 ring-1 ring-gray-100">
              За выбранный промежуток времени домашних заданий нет
            </div>
          ) : (
            <div className="space-y-2">
              {homework.map((t) => (
                <div key={t.id} className="rounded-2xl bg-white p-4 ring-1 ring-gray-100">
                  <div className="text-xs text-gray-500">{new Date(t.createdAt).toLocaleString()}</div>
                  <div className="mt-2 text-sm font-semibold text-gray-900">{t.title}</div>
                  <div className="mt-1 whitespace-pre-wrap text-sm text-gray-600">{t.text}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={settingsOpen && !!selectedTeacher}
        onClose={() => setSettingsOpen(false)}
        title={selectedTeacher?.name?.trim() || "Учитель"}
        side="right"
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="text-sm font-semibold text-gray-900">Условия брони и отмены занятий</div>
            <div className="text-sm text-gray-600">Занятие может длиться минимум 30 мин и максимум 1440 мин</div>
            <div className="text-sm text-gray-600">Записаться на занятие можно за 24 ч.</div>
            <div className="text-sm text-gray-600">Отменить занятие можно за 3 ч.</div>
          </div>

          <div className="rounded-3xl border border-red-200 bg-red-50 p-5">
            <div className="text-sm font-semibold text-gray-900">Удаление карточки учителя</div>
            <div className="mt-2 text-sm text-gray-600">
              Внимание! Это действие разорвет связь с этим учителем и удалит из расписания ваши совместные занятия
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                type="button"
                className="w-auto rounded-full bg-red-600 px-6 hover:bg-red-700 focus:ring-red-200"
                disabled={deleting}
                onClick={async () => {
                  if (!selectedTeacher) return;
                  setDeleting(true);
                  setError("");
                  try {
                    await deleteMyTeacher(selectedTeacher.id);
                    setSettingsOpen(false);
                    setSelectedTeacherId("");
                    await load();
                  } catch (e) {
                    setError(getApiErrorMessage(e, "Не удалось удалить учителя"));
                  } finally {
                    setDeleting(false);
                  }
                }}
              >
                {deleting ? "Удаляем..." : "Удалить"}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
