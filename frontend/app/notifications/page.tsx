"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { Modal } from "@/components/ui/Modal";
import { Toggle } from "@/components/ui/Toggle";
import { getNotifications, remindPayment, type Notification, type NotificationChannel } from "@/services/notifications.api";
import { getMe, updateMe } from "@/services/users.api";
import { getStudents } from "@/services/students.api";

type NotifSettings = {
  teacher: {
    enabled: boolean;
    studentAcceptedInvite: boolean;
    studentActivatedBot: boolean;
    homeworkSubmitted: boolean;
    lessonBookedOrCanceled: boolean;
  };
  students: {
    enabled: boolean;
    homeworkAssigned: boolean;
    homeworkGraded: boolean;
    newSubscription: boolean;
    lessonChanges: boolean;
  };
  teacherSchedule: {
    upcomingEnabled: boolean;
    upcomingWhen: "event" | "15m" | "1h";
    repeatEnabled: boolean;
    repeatAfter: "15m" | "30m" | "1h";
    dailyEnabled: boolean;
    dailyTime: string;
  };
  studentSchedule: {
    upcomingEnabled: boolean;
    upcomingWhen: "event" | "1h";
    repeatEnabled: boolean;
    repeatAfter: "1h" | "2h";
    homeworkPaymentEnabled: boolean;
    homeworkPaymentHours: number;
  };
};

type StudentOption = {
  id: string;
  name: string;
};

const DEFAULT_SETTINGS: NotifSettings = {
  teacher: {
    enabled: true,
    studentAcceptedInvite: true,
    studentActivatedBot: true,
    homeworkSubmitted: true,
    lessonBookedOrCanceled: true,
  },
  students: {
    enabled: true,
    homeworkAssigned: true,
    homeworkGraded: true,
    newSubscription: true,
    lessonChanges: true,
  },
  teacherSchedule: {
    upcomingEnabled: true,
    upcomingWhen: "event",
    repeatEnabled: true,
    repeatAfter: "15m",
    dailyEnabled: true,
    dailyTime: "09:00",
  },
  studentSchedule: {
    upcomingEnabled: true,
    upcomingWhen: "event",
    repeatEnabled: true,
    repeatAfter: "1h",
    homeworkPaymentEnabled: true,
    homeworkPaymentHours: 24,
  },
};

const humanType = (t: string) => {
  if (t === "LESSON_REMINDER") return "О занятии";
  if (t === "PAYMENT_REMINDER") return "Об оплате";
  if (t === "HOMEWORK_ASSIGNED") return "О домашнем задании";
  return t;
};

const humanStatus = (s: string) => {
  if (s === "PENDING") return "В очереди";
  if (s === "SENT") return "Отправлено";
  if (s === "FAILED") return "Ошибка";
  return s;
};

const humanChannel = (c: string) => {
  if (c === "TELEGRAM") return "Telegram";
  if (c === "EMAIL") return "Email";
  return c;
};

const utcOffsetLabel = (timeZone: string) => {
  try {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "2-digit",
      timeZoneName: "shortOffset",
    });
    const parts = dtf.formatToParts(new Date());
    const name = parts.find((p) => p.type === "timeZoneName")?.value ?? "";
    const m = name.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
    if (!m) return name ? name.replace("GMT", "UTC") : "UTC";
    const sign = m[1] === "-" ? "-" : "+";
    const hh = String(Number(m[2]));
    const mm = m[3] ?? "00";
    if (mm === "00") return `UTC${sign}${hh}`;
    return `UTC${sign}${hh}:${mm}`;
  } catch {
    return "UTC";
  }
};

const Crown = ({ onClick }: { onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex h-7 w-7 items-center justify-center rounded-full bg-lime-100 text-sm text-lime-700 hover:bg-lime-200"
    aria-label="Доступно на тарифе Эксперт"
    title="Доступно на тарифе Эксперт"
  >
    👑
  </button>
);

function InlineSelect<T extends string>({
  value,
  options,
  onChange,
  disabled,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const selected = options.find((o) => o.value === value)?.label ?? value;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return;
      if (e.target instanceof Node && ref.current.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 shadow-sm ring-1 ring-gray-50 ${
          disabled ? "opacity-50" : "hover:bg-gray-50"
        }`}
      >
        <span className="whitespace-nowrap">{selected}</span>
        <span className="text-gray-400">›</span>
      </button>
      {open && !disabled && (
        <div className="absolute right-0 top-[42px] z-[60] w-52 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl ring-1 ring-gray-100">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-gray-50 ${
                o.value === value ? "text-purple-700" : "text-gray-700"
              }`}
            >
              <span className="truncate">{o.label}</span>
              {o.value === value && <span className="text-purple-500">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NotificationsPage() {
  const { user, loading: authLoading } = useRequireAuth();

  const [profile, setProfile] = useState<{ timezone: string; tariff?: "FREE" | "EXPERT" } | null>(null);
  const tariff = profile?.tariff ?? (user?.tariff as any) ?? "FREE";
  const isExpert = tariff === "EXPERT";

  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const [settings, setSettings] = useState<NotifSettings | null>(null);
  useEffect(() => {
    if (authLoading) return;
    try {
      const raw = window.localStorage.getItem("notifSettings:v1");
      if (raw) {
        setSettings(JSON.parse(raw));
        return;
      }
    } catch {}
    setSettings(DEFAULT_SETTINGS);
  }, [authLoading]);

  useEffect(() => {
    if (!settings) return;
    try {
      window.localStorage.setItem("notifSettings:v1", JSON.stringify(settings));
    } catch {}
  }, [settings]);

  useEffect(() => {
    if (authLoading) return;
    getMe()
      .then((res) => setProfile({ timezone: res.data.timezone, tariff: res.data.tariff }))
      .catch(() => setProfile({ timezone: "Europe/Moscow", tariff: "FREE" }));
  }, [authLoading]);

  useEffect(() => {
    if (authLoading) return;
    getStudents()
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        const normalized = list
          .map((student) => ({
            id: typeof student?.id === "string" ? student.id : "",
            name: typeof student?.name === "string" ? student.name : "",
          }))
          .filter((student) => student.id && student.name);
        setStudents(normalized);
      })
      .catch(() => setStudents([]));
  }, [authLoading]);

  const [timezoneOpen, setTimezoneOpen] = useState(false);
  const [timezoneSearch, setTimezoneSearch] = useState("");
  const timezones = useMemo(() => {
    const fallback = ["Europe/Moscow", "Europe/Kiev", "Europe/Minsk", "Asia/Riyadh", "Europe/Istanbul"];
    const anyIntl = Intl as any;
    const list: string[] = typeof anyIntl.supportedValuesOf === "function" ? anyIntl.supportedValuesOf("timeZone") : fallback;
    return Array.from(new Set(list));
  }, []);
  const filteredTimezones = useMemo(() => {
    const q = timezoneSearch.trim().toLowerCase();
    if (!q) return timezones.slice(0, 40);
    return timezones.filter((z) => z.toLowerCase().includes(q)).slice(0, 80);
  }, [timezones, timezoneSearch]);

  const [savingTimezone, setSavingTimezone] = useState(false);
  const changeTimezone = async (tz: string) => {
    if (savingTimezone) return;
    setSavingTimezone(true);
    try {
      const { data } = await updateMe({ timezone: tz });
      setProfile((p) => ({ ...(p ?? { timezone: tz, tariff: "FREE" }), timezone: data.timezone, tariff: data.tariff }));
      setToast("Часовой пояс сохранён");
      setTimezoneOpen(false);
    } catch {
      setToast("Не удалось сохранить часовой пояс");
    } finally {
      setSavingTimezone(false);
    }
  };

  const [helpOpen, setHelpOpen] = useState(false);
  const [lastOpen, setLastOpen] = useState(false);
  const [lastLoading, setLastLoading] = useState(false);
  const [lastError, setLastError] = useState("");
  const [lastItems, setLastItems] = useState<Notification[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [remindStudentId, setRemindStudentId] = useState<string>("all");
  const [remindChannel, setRemindChannel] = useState<NotificationChannel>("TELEGRAM");

  const studentOptions = useMemo(() => {
    return [{ value: "all", label: "Все ученики" }, ...students.map((student) => ({ value: student.id, label: student.name }))];
  }, [students]);

  const channelOptions = useMemo(
    () => [
      { value: "TELEGRAM" as const, label: "Telegram" },
      { value: "EMAIL" as const, label: "Email" },
    ],
    [],
  );

  useEffect(() => {
    if (remindStudentId === "all") return;
    if (!students.some((student) => student.id === remindStudentId)) {
      setRemindStudentId("all");
    }
  }, [remindStudentId, students]);

  const openLast = async () => {
    setLastOpen(true);
    setLastLoading(true);
    setLastError("");
    try {
      const { data } = await getNotifications({ limit: 10 });
      setLastItems(data ?? []);
    } catch {
      setLastError("Не удалось загрузить уведомления");
    } finally {
      setLastLoading(false);
    }
  };

  const [remindPending, setRemindPending] = useState(false);
  const handleRemindPayment = async () => {
    if (remindPending) return;
    setRemindPending(true);
    const payload: { studentId?: string; channel?: NotificationChannel } = { channel: remindChannel };
    if (remindStudentId !== "all") payload.studentId = remindStudentId;
    try {
      await remindPayment(payload);
      setToast("Напоминание отправлено");
    } catch {
      setToast("Не удалось отправить напоминание");
    } finally {
      setRemindPending(false);
    }
  };

  if (authLoading || !settings) {
    return <div className="text-gray-500">Загрузка...</div>;
  }

  return (
    <div className="space-y-5">
      {toast && (
        <div className="fixed left-1/2 top-6 z-[80] -translate-x-1/2 rounded-full bg-black px-4 py-2 text-sm text-white shadow-xl">
          {toast}
        </div>
      )}

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={handleRemindPayment}
            disabled={remindPending}
            className="flex items-center justify-between gap-3 rounded-full bg-black px-5 py-3 text-sm font-medium text-white shadow-sm hover:bg-gray-900 disabled:opacity-60"
          >
            <span>Напомнить об оплате</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10">🔔</span>
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <InlineSelect value={remindChannel} options={channelOptions} onChange={setRemindChannel} disabled={remindPending} />
            <InlineSelect value={remindStudentId} options={studentOptions} onChange={setRemindStudentId} disabled={remindPending} />
          </div>
        </div>

        <div className="relative flex-1">
          <button
            type="button"
            onClick={() => setTimezoneOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-3 rounded-full bg-white px-5 py-3 text-sm text-gray-700 shadow-sm ring-1 ring-gray-100 hover:bg-gray-50"
          >
            <span className="truncate">Часовой пояс для уведомлений</span>
            <span className="text-gray-400">›</span>
          </button>
          {timezoneOpen && (
            <div className="absolute left-0 top-[52px] z-[60] w-full overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-gray-100">
              <div className="p-3">
                <input
                  value={timezoneSearch}
                  onChange={(e) => setTimezoneSearch(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-100"
                  placeholder="Поиск"
                />
              </div>
              <div className="max-h-64 overflow-auto">
                {filteredTimezones.map((tz) => (
                  <button
                    key={tz}
                    type="button"
                    onClick={() => changeTimezone(tz)}
                    disabled={savingTimezone}
                    className={`flex w-full items-center justify-between px-5 py-3 text-left text-sm hover:bg-gray-50 ${
                      profile?.timezone === tz ? "text-purple-700" : "text-gray-700"
                    }`}
                  >
                    <span className="truncate">{tz}</span>
                    <span className="text-xs text-gray-400">{utcOffsetLabel(tz)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={openLast}
            className="flex items-center justify-between gap-3 rounded-full bg-white px-5 py-3 text-sm text-gray-700 shadow-sm ring-1 ring-gray-100 hover:bg-gray-50"
          >
            <span className="truncate">Последние 10 уведомлений ученикам</span>
            <span className="text-gray-400">›</span>
          </button>
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-gray-500 shadow-sm ring-1 ring-gray-100 hover:bg-gray-50"
            aria-label="Справка"
            title="Справка"
          >
            i
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm ring-2 ring-purple-200">
          <div className="mb-4">
            <div className="text-sm font-semibold text-gray-900">Учителю</div>
            <div className="mt-1 text-xs text-gray-500">Расскажите, о чем вас оповещать</div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4 rounded-2xl px-3 py-3 hover:bg-gray-50">
              <div className="text-sm text-gray-800">Включить все уведомления для учителя</div>
              <Toggle
                checked={settings.teacher.enabled}
                onCheckedChange={(v) =>
                  setSettings((s) => ({
                    ...s!,
                    teacher: {
                      ...s!.teacher,
                      enabled: v,
                      studentAcceptedInvite: v,
                      studentActivatedBot: v,
                      homeworkSubmitted: v,
                      lessonBookedOrCanceled: v,
                    },
                  }))
                }
              />
            </div>

            <div className="px-3 py-2 text-xs font-semibold text-gray-500">Начало работы</div>
            <div className="flex items-center justify-between gap-4 rounded-2xl px-3 py-3 hover:bg-gray-50">
              <div>
                <div className="text-sm text-gray-800">Ученик принял приглашение на связку аккаунтов</div>
              </div>
              <Toggle
                checked={settings.teacher.studentAcceptedInvite && settings.teacher.enabled}
                onCheckedChange={(v) =>
                  setSettings((s) => ({ ...s!, teacher: { ...s!.teacher, studentAcceptedInvite: v } }))
                }
                disabled={!settings.teacher.enabled}
              />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-2xl px-3 py-3 hover:bg-gray-50">
              <div className="text-sm text-gray-800">Ученик активировал Telegram-бот</div>
              <Toggle
                checked={settings.teacher.studentActivatedBot && settings.teacher.enabled}
                onCheckedChange={(v) =>
                  setSettings((s) => ({ ...s!, teacher: { ...s!.teacher, studentActivatedBot: v } }))
                }
                disabled={!settings.teacher.enabled}
              />
            </div>

            <div className="px-3 py-2 text-xs font-semibold text-gray-500">Учебный процесс</div>
            <div className="flex items-center justify-between gap-4 rounded-2xl px-3 py-3 hover:bg-gray-50">
              <div className="text-sm text-gray-800">Ученик сдал домашнее задание</div>
              <Toggle
                checked={settings.teacher.homeworkSubmitted && settings.teacher.enabled}
                onCheckedChange={(v) =>
                  setSettings((s) => ({ ...s!, teacher: { ...s!.teacher, homeworkSubmitted: v } }))
                }
                disabled={!settings.teacher.enabled}
              />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-2xl px-3 py-3 hover:bg-gray-50">
              <div>
                <div className="text-sm text-gray-800">Ученик забронировал или отменил занятие</div>
              </div>
              <Toggle
                checked={settings.teacher.lessonBookedOrCanceled && settings.teacher.enabled}
                onCheckedChange={(v) =>
                  setSettings((s) => ({ ...s!, teacher: { ...s!.teacher, lessonBookedOrCanceled: v } }))
                }
                disabled={!settings.teacher.enabled}
              />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm ring-2 ring-pink-200">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-gray-900">ученикам</div>
              <div className="mt-1 text-xs text-gray-500">Расскажите, о чем оповещать ваших учеников</div>
            </div>
            <div className="rounded-full bg-lime-100 px-3 py-1 text-xs font-semibold text-lime-700">На тарифе Эксперт</div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4 rounded-2xl px-3 py-3 hover:bg-gray-50">
              <div className="text-sm text-gray-800">Включить все уведомления для ученика</div>
              <Crown
                onClick={() => {
                  if (!isExpert) setHelpOpen(true);
                  else setToast("Доступно");
                }}
              />
            </div>

            <div className="px-3 py-2 text-xs font-semibold text-gray-500">Начало работы</div>
            <div className="flex items-center justify-between gap-4 rounded-2xl px-3 py-3 hover:bg-gray-50">
              <div className="text-sm text-gray-800">О новом домашнем задании</div>
              <Crown onClick={() => setHelpOpen(true)} />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-2xl px-3 py-3 hover:bg-gray-50">
              <div className="text-sm text-gray-800">Об оценке по домашнему заданию</div>
              <Crown onClick={() => setHelpOpen(true)} />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-2xl px-3 py-3 hover:bg-gray-50">
              <div className="text-sm text-gray-800">О новом абонементе</div>
              <Crown onClick={() => setHelpOpen(true)} />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-2xl px-3 py-3 hover:bg-gray-50">
              <div className="text-sm text-gray-800">О новых занятиях, отменах и переносах</div>
              <Crown onClick={() => setHelpOpen(true)} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm ring-2 ring-purple-200">
          <div className="mb-4 text-sm font-semibold text-gray-900">Учителю: работа с расписанием</div>

          <div className="rounded-3xl border border-gray-100 bg-white p-4">
            <div className="flex items-center justify-between gap-4 px-3 py-3">
              <div className="text-sm text-gray-800">Уведомить о предстоящих делах и занятиях</div>
              <Toggle
                checked={settings.teacherSchedule.upcomingEnabled}
                onCheckedChange={(v) => setSettings((s) => ({ ...s!, teacherSchedule: { ...s!.teacherSchedule, upcomingEnabled: v } }))}
              />
            </div>
            <div className="flex items-center justify-between gap-4 px-3 py-3">
              <div className="text-sm text-gray-500">Когда?</div>
              <InlineSelect
                value={settings.teacherSchedule.upcomingWhen}
                options={[
                  { value: "event", label: "В момент события" },
                  { value: "15m", label: "За 15 минут" },
                  { value: "1h", label: "За 1 час" },
                ]}
                onChange={(v) => setSettings((s) => ({ ...s!, teacherSchedule: { ...s!.teacherSchedule, upcomingWhen: v } }))}
                disabled={!settings.teacherSchedule.upcomingEnabled}
              />
            </div>
            <div className="flex items-center justify-between gap-4 px-3 py-3">
              <div className="text-sm text-gray-800">Уведомить повторно</div>
              <Toggle
                checked={settings.teacherSchedule.repeatEnabled}
                onCheckedChange={(v) => setSettings((s) => ({ ...s!, teacherSchedule: { ...s!.teacherSchedule, repeatEnabled: v } }))}
              />
            </div>
            <div className="flex items-center justify-between gap-4 px-3 py-3">
              <div className="text-sm text-gray-500">Когда?</div>
              <InlineSelect
                value={settings.teacherSchedule.repeatAfter}
                options={[
                  { value: "15m", label: "За 15 минут" },
                  { value: "30m", label: "За 30 минут" },
                  { value: "1h", label: "За 1 час" },
                ]}
                onChange={(v) => setSettings((s) => ({ ...s!, teacherSchedule: { ...s!.teacherSchedule, repeatAfter: v } }))}
                disabled={!settings.teacherSchedule.repeatEnabled}
              />
            </div>
          </div>

          <div className="mt-4 rounded-3xl border border-gray-100 bg-white p-4">
            <div className="flex items-center justify-between gap-4 px-3 py-3">
              <div className="text-sm text-gray-800">Присылать ежедневную сводку с расписанием на сутки</div>
              <Toggle
                checked={settings.teacherSchedule.dailyEnabled}
                onCheckedChange={(v) => setSettings((s) => ({ ...s!, teacherSchedule: { ...s!.teacherSchedule, dailyEnabled: v } }))}
              />
            </div>
            <div className="flex items-center justify-between gap-4 px-3 py-3">
              <div className="text-sm text-gray-500">Когда?</div>
              <button
                type="button"
                disabled={!settings.teacherSchedule.dailyEnabled}
                onClick={() => {
                  const next = settings.teacherSchedule.dailyTime === "09:00" ? "08:00" : "09:00";
                  setSettings((s) => ({ ...s!, teacherSchedule: { ...s!.teacherSchedule, dailyTime: next } }));
                }}
                className={`rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 shadow-sm ring-1 ring-gray-50 ${
                  settings.teacherSchedule.dailyEnabled ? "hover:bg-gray-50" : "opacity-50"
                }`}
              >
                {settings.teacherSchedule.dailyTime}
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm ring-2 ring-pink-200">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-gray-900">ученикам: двойные напоминания</div>
            <div className="rounded-full bg-lime-100 px-3 py-1 text-xs font-semibold text-lime-700">На тарифе Эксперт</div>
          </div>

          <div className="rounded-3xl border border-gray-100 bg-white p-4">
            <div className="flex items-center justify-between gap-4 px-3 py-3">
              <div className="text-sm text-gray-800">Уведомить о предстоящих занятиях</div>
              <Crown onClick={() => setHelpOpen(true)} />
            </div>
            <div className="flex items-center justify-between gap-4 px-3 py-3">
              <div className="text-sm text-gray-400">Когда?</div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-400">В момент события ›</div>
            </div>
            <div className="flex items-center justify-between gap-4 px-3 py-3">
              <div className="text-sm text-gray-800">Уведомить повторно</div>
              <Crown onClick={() => setHelpOpen(true)} />
            </div>
            <div className="flex items-center justify-between gap-4 px-3 py-3">
              <div className="text-sm text-gray-400">Когда?</div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-400">За 1 час ›</div>
            </div>
          </div>

          <div className="mt-4 rounded-3xl border border-gray-100 bg-white p-4">
            <div className="flex items-center justify-between gap-4 px-3 py-3">
              <div className="text-sm text-gray-800">Напомнить о неоплаченном домашнем задании</div>
              <Crown onClick={() => setHelpOpen(true)} />
            </div>
            <div className="flex items-center justify-between gap-4 px-3 py-3">
              <div className="text-sm text-gray-400">За сколько часов до?</div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-400">{settings.studentSchedule.homeworkPaymentHours}</div>
            </div>
            <div className="flex items-center justify-between gap-4 px-3 py-3">
              <div className="text-sm text-gray-800">Уведомить повторно</div>
              <Crown onClick={() => setHelpOpen(true)} />
            </div>
          </div>
        </div>
      </div>

      <Modal open={helpOpen} onClose={() => setHelpOpen(false)} title="Справка" side="right">
        <div className="space-y-4">
          <div className="text-xs text-gray-500">
            Если у вас подключен тариф Эксперт, ученик может получать уведомления от SecRep. Здесь можно увидеть, какие именно уведомления
            вы будете получать.
          </div>

          <div className="space-y-3 text-sm">
            <div className="border-b border-gray-100 pb-3">
              <div className="font-semibold">О долгах (стандартное уведомление)</div>
              <div className="mt-1 text-xs text-gray-500">На вебхуке оплаты репетитор получает уведомления.</div>
            </div>
            <div className="border-b border-gray-100 pb-3">
              <div className="font-semibold">О новом домашнем задании</div>
              <div className="mt-1 text-xs text-gray-500">Учитель создал новое домашнее задание.</div>
            </div>
            <div className="border-b border-gray-100 pb-3">
              <div className="font-semibold">Об изменениях в домашнем задании</div>
              <div className="mt-1 text-xs text-gray-500">Учитель изменил домашнее задание.</div>
            </div>
            <div className="border-b border-gray-100 pb-3">
              <div className="font-semibold">О дедлайне по домашнему заданию</div>
              <div className="mt-1 text-xs text-gray-500">У ученика осталось мало времени на выполнение ДЗ.</div>
            </div>
            <div className="border-b border-gray-100 pb-3">
              <div className="font-semibold">Об оценке по домашнему заданию</div>
              <div className="mt-1 text-xs text-gray-500">Учитель выставил оценку домашнему заданию.</div>
            </div>
            <div className="border-b border-gray-100 pb-3">
              <div className="font-semibold">О новом абонементе</div>
              <div className="mt-1 text-xs text-gray-500">Учитель создал новый абонемент.</div>
            </div>
            <div>
              <div className="font-semibold">О новых занятиях</div>
              <div className="mt-1 text-xs text-gray-500">Учитель назначил/отменил/перенес занятие.</div>
            </div>
          </div>

          {!isExpert && (
            <div className="pt-3">
              <Link
                href="/pricing"
                className="inline-flex w-full items-center justify-center rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white"
              >
                Перейти к тарифам
              </Link>
            </div>
          )}
        </div>
      </Modal>

      <Modal open={lastOpen} onClose={() => setLastOpen(false)} title="Последние 10 уведомлений ученикам" side="right">
        <div className="space-y-4">
          {lastLoading && <div className="text-sm text-gray-500">Загрузка...</div>}
          {!!lastError && <div className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{lastError}</div>}
          {!lastLoading && !lastError && lastItems.length === 0 && (
            <div className="flex h-[70vh] items-center justify-center text-sm text-gray-400">Уведомлений пока не было</div>
          )}
          {!lastLoading && !lastError && lastItems.length > 0 && (
            <div className="space-y-2">
              {lastItems.map((n) => (
                <div key={n.id} className="rounded-2xl border border-gray-100 bg-white p-4">
                  <div className="text-sm font-semibold text-gray-900">{humanType(n.type)}</div>
                  <div className="mt-1 text-xs text-gray-500">
                    {humanStatus(n.status)} • {humanChannel(n.channel)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
