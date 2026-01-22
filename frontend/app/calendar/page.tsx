"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  addMinutes,
  endOfDay,
  endOfMonth,
  endOfWeek,
  isSameDay,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ru } from "date-fns/locale";
import { CalendarHeader } from "@/components/calendar/CalendarHeader";
import { MonthView } from "@/components/calendar/MonthView";
import { WeekView } from "@/components/calendar/WeekView";
import { DayView } from "@/components/calendar/DayView";
import { RightSidebar } from "@/components/calendar/RightSidebar";
import { CreateLessonModal } from "@/components/lessons/CreateLessonModal";
import { LessonDetailsModal } from "@/components/lessons/LessonDetailsModal";
import { Modal } from "@/components/ui/Modal";
import { completeLesson, createLesson, deleteLesson, getLessons } from "@/services/lessons.api";
import { getMyTeachers } from "@/services/users.api";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useRole } from "@/hooks/useRole";
import { Lesson } from "@/types/lesson";
import { CalendarSettings, DEFAULT_CALENDAR_SETTINGS } from "@/types/calendar";
import { getCalendarTheme } from "@/components/calendar/calendarTheme";

type CalendarPanel = "overview" | "addChooser" | "addLesson" | "addTask" | "addWindows";

export default function CalendarPage() {
  const { loading: authLoading, user } = useRequireAuth();
  const { role } = useRole();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [date, setDate] = useState<Date>(() => new Date());
  const [view, setView] = useState<"month" | "week" | "day">("week");
  const [rightView, setRightView] = useState<"calendar" | "notes" | "settings">("calendar");
  const [miniCalendarOpen, setMiniCalendarOpen] = useState(true);
  const [calendarSettings, setCalendarSettings] = useState<CalendarSettings>(DEFAULT_CALENDAR_SETTINGS);
  const [calendarPanel, setCalendarPanel] = useState<CalendarPanel>("overview");
  const [addContext, setAddContext] = useState<{ start: Date; end: Date }>(() => {
    const start = new Date();
    return { start, end: addMinutes(start, 60) };
  });
  const [personalTitles, setPersonalTitles] = useState<Record<string, string>>({});
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingTeacherId, setBookingTeacherId] = useState("");
  const [bookingTeachers, setBookingTeachers] = useState<any[]>([]);
  const [bookingLoadingTeachers, setBookingLoadingTeachers] = useState(false);
  const [bookingWeekStart, setBookingWeekStart] = useState<Date>(() => startOfWeek(new Date(), { locale: ru }));

  const [createOpen, setCreateOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  const range = useMemo(() => {
    if (view === "month") {
      const start = startOfWeek(startOfMonth(date), { locale: ru });
      const end = endOfWeek(endOfMonth(date), { locale: ru });
      return { from: start, to: end };
    }
    if (view === "week") {
      return { 
        from: startOfWeek(date, { locale: ru }), 
        to: endOfWeek(date, { locale: ru }) 
      };
    }
    return { from: startOfDay(date), to: endOfDay(date) };
  }, [date, view]);

  const reload = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await getLessons(range.from, range.to);
      setLessons(res.data);
    } catch {
      setError("Не удалось загрузить уроки");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    reload();
  }, [range, user]);

  useEffect(() => {
    if (rightView !== "calendar") setCalendarPanel("overview");
  }, [rightView]);

  useEffect(() => {
    if (!user) return;
    if (role !== "Ученик") return;
    const fromQuery = searchParams?.get("bookTeacherId") ?? "";
    let fromStorage = "";
    try {
      fromStorage = window.localStorage.getItem("calendar.booking.teacherId") ?? "";
    } catch {}
    const teacherId = fromQuery || fromStorage;
    if (!teacherId) return;
    setBookingTeacherId(teacherId);
    setBookingWeekStart(startOfWeek(new Date(), { locale: ru }));
    setBookingOpen(true);
  }, [role, searchParams, user]);

  useEffect(() => {
    if (!user) return;
    if (role !== "Ученик") return;
    if (!bookingOpen) return;
    setBookingLoadingTeachers(true);
    getMyTeachers()
      .then((res) => setBookingTeachers(res.data ?? []))
      .catch(() => setBookingTeachers([]))
      .finally(() => setBookingLoadingTeachers(false));
  }, [bookingOpen, role, user]);

  useEffect(() => {
    if (role !== "Ученик") return;
    if (!bookingOpen) return;
    if (bookingTeacherId) return;
    if (bookingTeachers.length === 0) return;
    setBookingTeacherId(String(bookingTeachers[0]?.id ?? ""));
  }, [bookingOpen, bookingTeacherId, bookingTeachers, role]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("calendar.settings.v1");
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<CalendarSettings>;
      if (!parsed || typeof parsed !== "object") return;
      setCalendarSettings((prev) => ({ ...prev, ...parsed }));
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("calendar.settings.v1", JSON.stringify(calendarSettings));
    } catch {}
  }, [calendarSettings]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("calendar.miniCalendarOpen.v1");
      if (raw === "0") setMiniCalendarOpen(false);
      if (raw === "1") setMiniCalendarOpen(true);
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("calendar.miniCalendarOpen.v1", miniCalendarOpen ? "1" : "0");
    } catch {}
  }, [miniCalendarOpen]);

  const timeZoneLabel = useMemo(() => {
    try {
      const parts = new Intl.DateTimeFormat("ru-RU", { timeZoneName: "short" }).formatToParts(new Date());
      return parts.find((p) => p.type === "timeZoneName")?.value ?? "";
    } catch {
      return "";
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("calendar.personalTitles.v1");
      if (raw) setPersonalTitles(JSON.parse(raw));
    } catch {
      setPersonalTitles({});
    }
  }, []);

  const onSlotClick = (slot: Date) => {
    if (role === "Ученик") return;
    setSelectedSlot(slot);
    setCreateOpen(true);
  };

  const onLessonClick = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setDetailsOpen(true);
  };

  const onCreate = async (data: any) => {
    await createLesson(data);
    setCreateOpen(false);
    await reload();
  };

  const onCreateFromSidebar = async (data: any) => {
    const res = await createLesson(data);
    await reload();
    return res.data as Lesson;
  };

  const setPersonalTitle = (lessonId: string, title: string) => {
    setPersonalTitles((prev) => {
      const next = { ...prev, [lessonId]: title };
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem("calendar.personalTitles.v1", JSON.stringify(next));
        } catch {}
      }
      return next;
    });
  };

  const openAddPanel = (panel: CalendarPanel, start: Date) => {
    const startAt = new Date(start);
    const endAt = addMinutes(startAt, 60);
    setAddContext({ start: startAt, end: endAt });
    setRightView("calendar");
    setCalendarPanel(panel);
  };

  const openAddChooser = () => {
    if (role === "Ученик") {
      setBookingOpen(true);
      return;
    }
    const now = new Date();
    const start = new Date(date);
    if (isSameDay(start, now)) {
      const nextHour = new Date(now);
      nextHour.setMinutes(0, 0, 0);
      nextHour.setHours(nextHour.getHours() + 1);
      start.setHours(nextHour.getHours(), 0, 0, 0);
    } else {
      start.setHours(9, 0, 0, 0);
    }
    if (typeof window !== "undefined" && !window.matchMedia("(min-width: 1280px)").matches) {
      setSelectedSlot(start);
      setCreateOpen(true);
      return;
    }
    openAddPanel("addChooser", start);
  };

  const onRightViewChange = (next: "calendar" | "notes" | "settings") => {
    if (next === rightView) {
      if (next === "calendar") setMiniCalendarOpen((v) => !v);
      return;
    }
    setRightView(next);
    if (next === "calendar") setMiniCalendarOpen(true);
  };

  const resetCalendarSettings = () => {
    setCalendarSettings(DEFAULT_CALENDAR_SETTINGS);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem("calendar.settings.v1");
      } catch {}
    }
  };

  const onComplete = async (id: string) => {
    await completeLesson(id);
    await reload();
  };

  const onDelete = async (id: string) => {
    await deleteLesson(id);
    await reload();
  };

  if (authLoading) return <div className="text-gray-500">Загрузка...</div>;

  return (
    <div className="flex flex-col xl:flex-row gap-6 h-[calc(100vh-140px)]">
      <div className="flex-1 flex flex-col min-w-0">
        <CalendarHeader
          view={view}
          onViewChange={setView}
          date={date}
          onDateChange={setDate}
          onToday={() => setDate(new Date())}
          onAddClick={openAddChooser}
          addText={role === "Ученик" ? "Записаться" : undefined}
          rightView={rightView}
          onRightViewChange={onRightViewChange}
        />

        {error && <div className="mb-4 rounded-2xl bg-red-100 p-3 text-red-700">{error}</div>}

        <div className="flex-1 min-h-0">
          {view === "month" && (
            <MonthView
              date={date}
              lessons={lessons}
              personalTitles={personalTitles}
              taskTheme={getCalendarTheme(calendarSettings.taskColor)}
              lessonTheme={getCalendarTheme(calendarSettings.lessonColor)}
              onDateClick={(d) => {
                setDate(d);
                setView("day");
              }}
              onLessonClick={onLessonClick}
            />
          )}
          {view === "week" && (
            <WeekView
              date={date}
              lessons={lessons}
              personalTitles={personalTitles}
              taskTheme={getCalendarTheme(calendarSettings.taskColor)}
              lessonTheme={getCalendarTheme(calendarSettings.lessonColor)}
              rowHeight={calendarSettings.rowHeight}
              dimPastEvents={calendarSettings.dimPastEvents}
              showTimezone={calendarSettings.showStudentTimezone}
              timeZoneLabel={timeZoneLabel}
              onSlotClick={onSlotClick}
              onLessonClick={onLessonClick}
            />
          )}
          {view === "day" && (
            <DayView
              date={date}
              lessons={lessons}
              personalTitles={personalTitles}
              taskTheme={getCalendarTheme(calendarSettings.taskColor)}
              lessonTheme={getCalendarTheme(calendarSettings.lessonColor)}
              rowHeight={calendarSettings.rowHeight}
              dimPastEvents={calendarSettings.dimPastEvents}
              showTimezone={calendarSettings.showStudentTimezone}
              timeZoneLabel={timeZoneLabel}
              onSlotClick={onSlotClick}
              onLessonClick={onLessonClick}
            />
          )}
        </div>
      </div>

      <div className="hidden xl:block">
        <RightSidebar
          date={date}
          onDateChange={setDate}
          view={rightView}
          calendarPanel={calendarPanel}
          onCalendarPanelChange={setCalendarPanel}
          miniCalendarOpen={miniCalendarOpen}
          onMiniCalendarOpenChange={setMiniCalendarOpen}
          calendarSettings={calendarSettings}
          onCalendarSettingsChange={setCalendarSettings}
          onResetCalendarSettings={resetCalendarSettings}
          onExitSettings={() => setRightView("calendar")}
          initialStart={addContext.start}
          initialEnd={addContext.end}
          lessons={lessons}
          personalTitles={personalTitles}
          onCreateLesson={onCreateFromSidebar}
          onSetPersonalTitle={setPersonalTitle}
          onOpenAddChooser={openAddChooser}
          onOpenAddLesson={(start) => openAddPanel("addLesson", start)}
          onOpenAddTask={(start) => openAddPanel("addTask", start)}
          onOpenAddWindows={() => {
            setRightView("calendar");
            setCalendarPanel("addWindows");
          }}
        />
      </div>

      <Modal
        open={bookingOpen && role === "Ученик"}
        onClose={() => {
          setBookingOpen(false);
          try {
            window.localStorage.removeItem("calendar.booking.teacherId");
          } catch {}
          router.replace("/calendar");
        }}
        title="Записаться на занятие"
        side="right"
        widthClassName="max-w-[560px]"
      >
        <div className="space-y-4">
          <label className="block">
            <div className="mb-2 text-xs font-semibold text-gray-500">Учитель</div>
            <select
              value={bookingTeacherId}
              onChange={(e) => {
                setBookingTeacherId(e.target.value);
                try {
                  window.localStorage.setItem("calendar.booking.teacherId", e.target.value);
                } catch {}
              }}
              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none"
              disabled={bookingLoadingTeachers}
            >
              <option value="" disabled>
                {bookingLoadingTeachers ? "Загрузка..." : "Выберите учителя"}
              </option>
              {bookingTeachers.map((t: any) => (
                <option key={t.id} value={t.id}>
                  {t.name?.trim() || t.email}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-center justify-between rounded-2xl bg-white p-3 ring-1 ring-gray-100">
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-50 text-gray-700 hover:bg-gray-100"
              onClick={() => {
                const d = new Date(bookingWeekStart);
                d.setDate(d.getDate() - 7);
                setBookingWeekStart(d);
              }}
              aria-label="Назад"
            >
              ‹
            </button>
            <div className="text-sm font-medium text-gray-700">
              {`${bookingWeekStart.toLocaleDateString("ru-RU")} — ${(() => {
                const d = new Date(bookingWeekStart);
                d.setDate(d.getDate() + 6);
                return d.toLocaleDateString("ru-RU");
              })()}`}
            </div>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-50 text-gray-700 hover:bg-gray-100"
              onClick={() => {
                const d = new Date(bookingWeekStart);
                d.setDate(d.getDate() + 7);
                setBookingWeekStart(d);
              }}
              aria-label="Вперед"
            >
              ›
            </button>
          </div>

          <div className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-500 ring-1 ring-gray-100">
            У данного учителя нет свободных слотов бронирования на выбранной неделе
          </div>
        </div>
      </Modal>

      <CreateLessonModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={onCreate}
        initialDate={selectedSlot}
      />

      <LessonDetailsModal
        isOpen={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        lesson={selectedLesson}
        onComplete={onComplete}
        onDelete={onDelete}
        onReload={reload}
      />
    </div>
  );
}
