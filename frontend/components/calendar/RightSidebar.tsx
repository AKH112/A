"use client";

import { FC, useEffect, useMemo, useState } from "react";
import { differenceInMinutes, format, isSameDay, parse, parseISO, set as setDate } from "date-fns";
import { ru } from "date-fns/locale";
import { ChevronLeft, Plus } from "lucide-react";
import { Toggle } from "@/components/ui/Toggle";
import { getStudents } from "@/services/students.api";
import { Lesson } from "@/types/lesson";
import { CalendarSettings, DEFAULT_CALENDAR_SETTINGS } from "@/types/calendar";
import { CALENDAR_COLOR_THEMES, getCalendarTheme } from "@/components/calendar/calendarTheme";
import { MiniCalendar } from "./MiniCalendar";

type CalendarPanel = "overview" | "addChooser" | "addLesson" | "addTask" | "addWindows";
type Student = { id: string; name: string };

interface RightSidebarProps {
  date: Date;
  onDateChange: (date: Date) => void;
  view: "calendar" | "notes" | "settings";
  calendarPanel: CalendarPanel;
  onCalendarPanelChange: (panel: CalendarPanel) => void;
  miniCalendarOpen: boolean;
  onMiniCalendarOpenChange: (open: boolean) => void;
  calendarSettings: CalendarSettings;
  onCalendarSettingsChange: (next: CalendarSettings) => void;
  onResetCalendarSettings: () => void;
  onExitSettings: () => void;
  initialStart: Date;
  initialEnd: Date;
  lessons: Lesson[];
  personalTitles: Record<string, string>;
  onCreateLesson: (data: any) => Promise<Lesson>;
  onSetPersonalTitle: (lessonId: string, title: string) => void;
  onOpenAddChooser: () => void;
  onOpenAddLesson: (start: Date) => void;
  onOpenAddTask: (start: Date) => void;
  onOpenAddWindows: () => void;
}

export const RightSidebar: FC<RightSidebarProps> = ({
  date,
  onDateChange,
  view,
  calendarPanel,
  onCalendarPanelChange,
  miniCalendarOpen,
  onMiniCalendarOpenChange,
  calendarSettings,
  onCalendarSettingsChange,
  onResetCalendarSettings,
  onExitSettings,
  initialStart,
  initialEnd,
  lessons,
  personalTitles,
  onCreateLesson,
  onSetPersonalTitle,
  onOpenAddChooser,
  onOpenAddLesson,
  onOpenAddTask,
  onOpenAddWindows,
}) => {
  const dayItems = useMemo(() => {
    return lessons.filter((l) => isSameDay(parseISO(l.startTime), date));
  }, [lessons, date]);
  const lessonsCount = useMemo(() => dayItems.filter((l) => l.type === "LESSON").length, [dayItems]);
  const tasksCount = useMemo(() => dayItems.filter((l) => l.type !== "LESSON").length, [dayItems]);

  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const [title, setTitle] = useState("");
  const [studentId, setStudentId] = useState("");
  const [priceRub, setPriceRub] = useState<number>(1000);
  const [repeat, setRepeat] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [startDate, setStartDateStr] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDateStr] = useState("");
  const [endTime, setEndTime] = useState("");
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState("");

  const [windowsSettings, setWindowsSettings] = useState<{
    workStart: string;
    workEnd: string;
    minDuration: number;
    maxDuration: number;
    step: 10 | 15 | 20 | 30 | 60;
    bookingDays: number;
  }>({ workStart: "08:00", workEnd: "20:00", minDuration: 30, maxDuration: 1440, step: 30, bookingDays: 24 });

  const [cancelAmount, setCancelAmount] = useState<number>(1);
  const [cancelUnit, setCancelUnit] = useState<"days" | "hours">("days");

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("calendar.windows.v1");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return;
      setWindowsSettings((prev) => ({
        ...prev,
        ...parsed,
      }));
    } catch {}
  }, []);

  useEffect(() => {
    if (calendarPanel !== "addLesson" && calendarPanel !== "addTask") return;
    setFormError("");
    setPending(false);
    setRepeat(false);
    setAdvancedOpen(false);
    setTitle("");
    setStudentId("");
    setPriceRub(1000);
    setStartDateStr(format(initialStart, "yyyy-MM-dd"));
    setStartTime(format(initialStart, "HH:mm"));
    setEndDateStr(format(initialEnd, "yyyy-MM-dd"));
    setEndTime(format(initialEnd, "HH:mm"));
  }, [calendarPanel, initialStart, initialEnd]);

  useEffect(() => {
    if (calendarPanel !== "addLesson") return;
    setLoadingStudents(true);
    getStudents()
      .then((res) => setStudents((res.data ?? []).map((s: any) => ({ id: s.id, name: s.name }))))
      .catch(() => setStudents([]))
      .finally(() => setLoadingStudents(false));
  }, [calendarPanel]);

  useEffect(() => {
    if (view !== "settings") return;
    const m = Math.max(0, Math.floor(calendarSettings.cancelWindowMinutes));
    if (m % (24 * 60) === 0) {
      setCancelUnit("days");
      setCancelAmount(Math.max(0, Math.round(m / (24 * 60))));
      return;
    }
    setCancelUnit("hours");
    setCancelAmount(Math.max(0, Math.round(m / 60)));
  }, [view, calendarSettings.cancelWindowMinutes]);

  const closePanel = () => onCalendarPanelChange("overview");

  const parseDateTime = (dateStr: string, timeStr: string) => {
    const base = parse(dateStr, "yyyy-MM-dd", new Date());
    const t = parse(timeStr, "HH:mm", base);
    return setDate(base, { hours: t.getHours(), minutes: t.getMinutes(), seconds: 0, milliseconds: 0 });
  };

  const submit = async () => {
    setFormError("");
    setPending(true);
    try {
      const start = parseDateTime(startDate, startTime);
      const end = parseDateTime(endDate, endTime);
      const duration = differenceInMinutes(end, start);
      if (!Number.isFinite(duration) || duration <= 0) {
        setFormError("Время окончания должно быть позже начала");
        setPending(false);
        return;
      }

      if (calendarPanel === "addLesson") {
        if (!studentId) {
          setFormError("Выберите ученика");
          setPending(false);
          return;
        }
        await onCreateLesson({
          type: "LESSON",
          studentId,
          duration,
          startTime: start.toISOString(),
          price: Math.max(0, Math.round(Number(priceRub)) * 100),
        });
        closePanel();
        return;
      }

      const created = await onCreateLesson({
        type: "PERSONAL",
        studentId: null,
        duration,
        startTime: start.toISOString(),
        price: null,
      });
      const trimmed = title.trim();
      if (trimmed) onSetPersonalTitle(created.id, trimmed);
      closePanel();
    } catch {
      setFormError("Не удалось сохранить");
      setPending(false);
    }
  };

  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      return d;
    });
  }, []);

  if (view === "notes") {
    return (
      <div className="flex w-80 flex-col gap-6 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100 h-full">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">Заметки</h3>
          <button className="text-gray-400 hover:text-gray-600" type="button">
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-4">
          {weekDates.map((d, i) => (
            <div
              key={i}
              className={`flex items-center justify-between ${i === 2 ? "bg-lime-200 rounded-full px-3 py-1" : ""}`}
            >
              <span className="text-sm font-medium">{format(d, "d MMMM yyyy, EEE", { locale: ru })}</span>
              <button
                className="h-8 w-8 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-400 hover:text-gray-600"
                type="button"
              >
                +
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (view === "settings") {
    const lessonTheme = getCalendarTheme(calendarSettings.lessonColor);
    const taskTheme = getCalendarTheme(calendarSettings.taskColor);

    const applyCancelWindow = (amount: number, unit: "days" | "hours") => {
      const safeAmount = Math.max(0, Math.round(Number(amount)));
      const minutes = unit === "days" ? safeAmount * 24 * 60 : safeAmount * 60;
      onCalendarSettingsChange({ ...calendarSettings, cancelWindowMinutes: minutes });
    };

    const ColorPicker = ({
      value,
      onChange,
    }: {
      value: CalendarSettings["lessonColor"] | CalendarSettings["taskColor"];
      onChange: (id: any) => void;
    }) => (
      <div className="flex flex-wrap gap-2">
        {CALENDAR_COLOR_THEMES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={`h-7 w-7 rounded-full ${t.dotBg} ${value === t.id ? "ring-2 ring-gray-900 ring-offset-2" : "ring-1 ring-gray-200"}`}
            aria-label={t.id}
            title={t.id}
          />
        ))}
      </div>
    );

    return (
      <div className="flex w-80 flex-col gap-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100 h-full">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">Настройки</h3>
          <button className="text-gray-400 hover:text-gray-600" type="button" onClick={onExitSettings}>
            ×
          </button>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="text-sm text-gray-700">Отмена занятий ученикам</div>
          <div className="flex items-center gap-2">
            <div className="text-xs text-gray-500">За</div>
            <input
              type="number"
              min={0}
              value={String(cancelAmount)}
              onChange={(e) => {
                const v = Number(e.target.value);
                setCancelAmount(v);
                applyCancelWindow(v, cancelUnit);
              }}
              className="w-16 rounded-xl border border-gray-200 bg-white px-2 py-1 text-sm outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-100"
            />
            <select
              value={cancelUnit}
              onChange={(e) => {
                const unit = e.target.value as "days" | "hours";
                setCancelUnit(unit);
                applyCancelWindow(cancelAmount, unit);
              }}
              className="rounded-xl border border-gray-200 bg-white px-2 py-1 text-sm outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-100"
            >
              <option value="days">дня</option>
              <option value="hours">часа</option>
            </select>
            <div className="text-xs text-gray-500">до занятия</div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">Отображать часовой пояс</div>
          <Toggle
            checked={calendarSettings.showStudentTimezone}
            onCheckedChange={(checked) => onCalendarSettingsChange({ ...calendarSettings, showStudentTimezone: checked })}
          />
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">Масштаб</div>
            <div className="text-xs text-gray-500">{calendarSettings.rowHeight}</div>
          </div>
          <input
            type="range"
            min={40}
            max={90}
            step={5}
            value={calendarSettings.rowHeight}
            onChange={(e) => onCalendarSettingsChange({ ...calendarSettings, rowHeight: Number(e.target.value) })}
          />
        </div>

        <div className="grid gap-2">
          <div className="text-sm text-gray-700">Цвет дела по умолчанию</div>
          <ColorPicker value={calendarSettings.taskColor} onChange={(id) => onCalendarSettingsChange({ ...calendarSettings, taskColor: id })} />
        </div>

        <div className="grid gap-2">
          <div className="text-sm text-gray-700">Цвет занятия по умолчанию</div>
          <ColorPicker
            value={calendarSettings.lessonColor}
            onChange={(id) => onCalendarSettingsChange({ ...calendarSettings, lessonColor: id })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">Окружать прошедшие события серым цветом</div>
          <Toggle
            checked={calendarSettings.dimPastEvents}
            onCheckedChange={(checked) => onCalendarSettingsChange({ ...calendarSettings, dimPastEvents: checked })}
          />
        </div>

        <div className="rounded-2xl bg-gray-50 p-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-gray-500">Пример</div>
            <div className="flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full ${lessonTheme.dotBg}`} />
              <div className={`h-2.5 w-2.5 rounded-full ${taskTheme.dotBg}`} />
            </div>
          </div>
          <div className={`mt-3 rounded-xl border px-3 py-2 text-xs ${lessonTheme.eventBg} ${lessonTheme.eventBorder} ${lessonTheme.eventText}`}>
            Занятие
          </div>
          <div className={`mt-2 rounded-xl border px-3 py-2 text-xs ${taskTheme.eventBg} ${taskTheme.eventBorder} ${taskTheme.eventText}`}>
            Дело
          </div>
        </div>

        <div className="mt-auto grid gap-2">
          <button type="button" className="w-full rounded-2xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white" onClick={onExitSettings}>
            Сохранить изменения
          </button>
          <button
            type="button"
            className="w-full rounded-2xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-900"
            onClick={() => {
              onResetCalendarSettings();
              setCancelAmount(Math.round(DEFAULT_CALENDAR_SETTINGS.cancelWindowMinutes / (24 * 60)));
              setCancelUnit("days");
            }}
          >
            Сбросить настройки
          </button>
        </div>
      </div>
    );
  }

  const startForSelectedDate = () => {
    const start = new Date(date);
    start.setHours(9, 0, 0, 0);
    return start;
  };

  if (calendarPanel === "addChooser") {
    return (
      <div className="flex w-80 flex-col gap-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100 h-full">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">Добавить событие</h3>
          <button className="text-gray-400 hover:text-gray-600" type="button" onClick={closePanel}>
            ×
          </button>
        </div>
        <div className="space-y-3">
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-2xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white"
            onClick={() => onOpenAddLesson(initialStart)}
          >
            <span>Занятие</span>
            <span>→</span>
          </button>
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-2xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-900"
            onClick={() => onOpenAddTask(initialStart)}
          >
            <span>Дело</span>
            <span>→</span>
          </button>
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-2xl bg-lime-200 px-4 py-3 text-sm font-semibold text-gray-900"
            onClick={onOpenAddWindows}
          >
            <span>Окна</span>
            <span>→</span>
          </button>
        </div>
      </div>
    );
  }

  if (calendarPanel === "addLesson" || calendarPanel === "addTask") {
    const isLesson = calendarPanel === "addLesson";
    return (
      <div className="flex w-80 flex-col gap-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100 h-full">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">{isLesson ? "Добавить занятие" : "Добавить дело"}</h3>
          <button className="text-gray-400 hover:text-gray-600" type="button" onClick={closePanel}>
            ×
          </button>
        </div>

        {formError ? <div className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{formError}</div> : null}

        {isLesson ? (
          <div className="flex gap-2">
            <button type="button" className="flex-1 rounded-full bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-400" disabled>
              Группа
            </button>
            <button type="button" className="flex-1 rounded-full bg-white px-3 py-2 text-xs font-semibold text-gray-900 ring-1 ring-gray-200">
              Ученик
            </button>
          </div>
        ) : null}

        {!isLesson ? (
          <div className="grid gap-2">
            <div className="text-xs font-semibold text-gray-500">Название</div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-100"
              placeholder="Название"
            />
          </div>
        ) : null}

        {isLesson ? (
          <div className="grid gap-2">
            <div className="text-xs font-semibold text-gray-500">Ученик</div>
            <select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-100"
              disabled={loadingStudents}
            >
              <option value="">{loadingStudents ? "Загрузка..." : "Выберите ученика"}</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="grid gap-3">
          <div className="grid grid-cols-[64px_1fr_1fr] items-center gap-2">
            <div className="text-xs font-semibold text-gray-500">Начало</div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDateStr(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-100"
            />
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-100"
            />
          </div>

          <div className="grid grid-cols-[64px_1fr_1fr] items-center gap-2">
            <div className="text-xs font-semibold text-gray-500">Конец</div>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDateStr(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-100"
            />
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-100"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">Повторять</div>
          <Toggle checked={repeat} onCheckedChange={setRepeat} />
        </div>

        {isLesson ? (
          <button
            type="button"
            className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700"
            onClick={() => setAdvancedOpen((v) => !v)}
          >
            <span>Доп. опции</span>
            <span>{advancedOpen ? "▾" : "▸"}</span>
          </button>
        ) : null}

        {isLesson && advancedOpen ? (
          <div className="grid gap-2">
            <div className="text-xs font-semibold text-gray-500">Цена (₽)</div>
            <input
              type="number"
              min={0}
              value={String(priceRub)}
              onChange={(e) => setPriceRub(Number(e.target.value))}
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-100"
            />
          </div>
        ) : null}

        <div className="mt-auto grid gap-2">
          <button
            type="button"
            className="w-full rounded-2xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            onClick={submit}
            disabled={pending}
          >
            {pending ? "Сохраняем..." : "Сохранить"}
          </button>
          <button type="button" className="w-full rounded-2xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-900" onClick={closePanel}>
            Отменить
          </button>
        </div>
      </div>
    );
  }

  if (calendarPanel === "addWindows") {
    const saveWindows = () => {
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem("calendar.windows.v1", JSON.stringify(windowsSettings));
        } catch {}
      }
      closePanel();
    };

    const StepItem = ({ value }: { value: 10 | 15 | 20 | 30 | 60 }) => (
      <label className="flex items-center gap-3 text-sm text-gray-700">
        <input
          type="radio"
          name="step"
          checked={windowsSettings.step === value}
          onChange={() => setWindowsSettings((p) => ({ ...p, step: value }))}
        />
        <span>{value} минут</span>
      </label>
    );

    return (
      <div className="flex w-80 flex-col gap-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100 h-full">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">Добавить окно</h3>
          <button className="text-gray-400 hover:text-gray-600" type="button" onClick={closePanel}>
            ×
          </button>
        </div>

        <div className="rounded-2xl bg-lime-200 p-4 text-xs text-gray-800">
          Настройки. Здесь можно настроить рабочий день и длительность слотов. Данные сохраняются локально.
        </div>

        <div className="grid gap-2">
          <div className="text-xs font-semibold text-gray-500">Рабочий день</div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="time"
              value={windowsSettings.workStart}
              onChange={(e) => setWindowsSettings((p) => ({ ...p, workStart: e.target.value }))}
              className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-lime-300 focus:ring-2 focus:ring-lime-100"
            />
            <input
              type="time"
              value={windowsSettings.workEnd}
              onChange={(e) => setWindowsSettings((p) => ({ ...p, workEnd: e.target.value }))}
              className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-lime-300 focus:ring-2 focus:ring-lime-100"
            />
          </div>
        </div>

        <div className="grid gap-2">
          <div className="text-xs font-semibold text-gray-500">Допустимая продолжительность</div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              min={15}
              value={String(windowsSettings.minDuration)}
              onChange={(e) => setWindowsSettings((p) => ({ ...p, minDuration: Number(e.target.value) }))}
              className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-lime-300 focus:ring-2 focus:ring-lime-100"
            />
            <input
              type="number"
              min={15}
              value={String(windowsSettings.maxDuration)}
              onChange={(e) => setWindowsSettings((p) => ({ ...p, maxDuration: Number(e.target.value) }))}
              className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-lime-300 focus:ring-2 focus:ring-lime-100"
            />
          </div>
        </div>

        <div className="grid gap-2">
          <div className="text-xs font-semibold text-gray-500">Шаг бронирования</div>
          <div className="grid gap-2">
            <StepItem value={10} />
            <StepItem value={15} />
            <StepItem value={20} />
            <StepItem value={30} />
            <StepItem value={60} />
          </div>
        </div>

        <div className="grid gap-2">
          <div className="text-xs font-semibold text-gray-500">Возможность бронирования (дней)</div>
          <input
            type="number"
            min={1}
            value={String(windowsSettings.bookingDays)}
            onChange={(e) => setWindowsSettings((p) => ({ ...p, bookingDays: Number(e.target.value) }))}
            className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-lime-300 focus:ring-2 focus:ring-lime-100"
          />
        </div>

        <div className="mt-auto">
          <button type="button" className="w-full rounded-2xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white" onClick={saveWindows}>
            Сохранить
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-80 flex-col gap-6">
      <div className="flex items-center gap-2 px-2">
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-500 shadow-sm ring-1 ring-gray-100 hover:text-gray-900"
          onClick={() => onMiniCalendarOpenChange(!miniCalendarOpen)}
          aria-label="Календарь"
          title="Календарь"
        >
          <ChevronLeft size={18} className={`${miniCalendarOpen ? "" : "rotate-180"}`} />
        </button>
        <div className="text-sm font-medium text-gray-900">Календарь</div>
      </div>

      {miniCalendarOpen ? <MiniCalendar date={date} onChange={onDateChange} /> : null}

      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <h3 className="mb-4 text-sm font-medium text-gray-900 capitalize">{`${format(date, "EEE", { locale: ru })} сегодня`}</h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Занятия</span>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-900 text-xs text-white">{lessonsCount}</span>
            </div>
            <button
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-900"
              type="button"
              onClick={() => onOpenAddLesson(startForSelectedDate())}
            >
              <Plus size={16} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Дела</span>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-900 text-xs text-white">{tasksCount}</span>
            </div>
            <button
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-900"
              type="button"
              onClick={() => onOpenAddTask(startForSelectedDate())}
            >
              <Plus size={16} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Заметки</span>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-900 text-xs text-white">0</span>
            </div>
            <button
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-900"
              type="button"
              onClick={onOpenAddChooser}
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <div className="space-y-2">
          {dayItems.slice(0, 6).map((l) => (
            <div key={l.id} className="flex items-center justify-between rounded-2xl bg-gray-50 px-3 py-2">
              <div className="min-w-0">
                <div className="truncate text-xs font-semibold text-gray-900">
                  {l.type === "LESSON" ? l.student?.name ?? "Урок" : personalTitles[l.id] ?? "Личное"}
                </div>
                <div className="text-[11px] text-gray-500">{format(parseISO(l.startTime), "HH:mm")}</div>
              </div>
              <div
                className={`h-2.5 w-2.5 rounded-full ${l.type === "LESSON" ? getCalendarTheme(calendarSettings.lessonColor).dotBg : getCalendarTheme(calendarSettings.taskColor).dotBg}`}
                aria-hidden="true"
              />
            </div>
          ))}
          {dayItems.length === 0 ? <div className="px-2 py-6 text-center text-sm text-gray-500">На этот день ничего нет</div> : null}
        </div>
      </div>
    </div>
  );
};
