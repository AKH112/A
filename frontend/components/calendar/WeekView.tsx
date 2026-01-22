import { FC, useEffect, useRef } from "react";
import {
  eachDayOfInterval,
  endOfWeek,
  format,
  getHours,
  getMinutes,
  isSameDay,
  isToday,
  parseISO,
  startOfWeek,
} from "date-fns";
import { ru } from "date-fns/locale";
import { Lesson } from "@/types/lesson";
import { CalendarColorTheme } from "@/components/calendar/calendarTheme";

interface WeekViewProps {
  date: Date;
  lessons: Lesson[];
  personalTitles: Record<string, string>;
  taskTheme: CalendarColorTheme;
  lessonTheme: CalendarColorTheme;
  rowHeight: number;
  dimPastEvents: boolean;
  showTimezone: boolean;
  timeZoneLabel: string;
  onSlotClick: (date: Date) => void;
  onLessonClick: (lesson: Lesson) => void;
}

export const WeekView: FC<WeekViewProps> = ({
  date,
  lessons,
  personalTitles,
  taskTheme,
  lessonTheme,
  rowHeight,
  dimPastEvents,
  showTimezone,
  timeZoneLabel,
  onSlotClick,
  onLessonClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const weekStart = startOfWeek(date, { locale: ru });
  const weekEnd = endOfWeek(date, { locale: ru });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const startHour = 0;
  const endHour = 24;
  const pxPerMinute = rowHeight / 60;
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.scrollTop = 8 * rowHeight;
  }, [rowHeight]);

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
      <div ref={containerRef} className="flex-1 overflow-y-auto relative">
        <div className="flex border-b border-gray-100 bg-white sticky top-0 z-20">
          <div className="w-16 flex-shrink-0 border-r border-gray-100 bg-white" />
          <div className="flex flex-1">
            {days.map((day) => {
               const isCurrentDay = isToday(day);
               return (
                <div
                  key={day.toISOString()}
                  className={`flex-1 flex flex-col items-center justify-center py-3 border-r border-gray-100 last:border-r-0 ${
                      isCurrentDay ? "bg-lime-50" : ""
                  }`}
                >
                  <span className={`text-xs font-medium uppercase ${isCurrentDay ? "text-lime-700" : "text-gray-500"}`}>
                    {format(day, "EEE", { locale: ru })}
                  </span>
                  <span
                    className={`mt-1 flex h-8 w-8 items-center justify-center rounded-full text-lg font-semibold ${
                      isCurrentDay ? "bg-lime-400 text-gray-900 shadow-sm" : "text-gray-900"
                    }`}
                  >
                    {format(day, "d")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex" style={{ minHeight: `${(endHour - startHour) * rowHeight}px` }}>
          <div className="w-16 flex-shrink-0 border-r border-gray-100 bg-white sticky left-0 z-10">
            {hours.map((h) => (
              <div key={h} className="relative" style={{ height: `${rowHeight}px` }}>
                <span className="absolute -top-3 right-2 text-xs text-gray-400">
                  {h.toString().padStart(2, "0")}:00
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-1 relative">
             {hours.map((h) => (
               <div
                 key={h}
                 className="absolute w-full border-b border-gray-100"
                 style={{ top: `${(h - startHour) * rowHeight}px` }}
               />
             ))}

            {days.map((day) => (
              <div
                key={day.toISOString()}
                className="flex-1 border-r border-gray-100 last:border-r-0 relative"
              >
                {hours.map((h) => (
                  <div
                    key={h}
                    className="cursor-pointer hover:bg-gray-50"
                    style={{ height: `${rowHeight}px` }}
                    onClick={() => {
                        const slotDate = new Date(day);
                        slotDate.setHours(h);
                        onSlotClick(slotDate);
                    }}
                  />
                ))}

                {lessons.map((lesson) => {
                  const start = parseISO(lesson.startTime);
                  if (!isSameDay(start, day)) return null;

                  const startMin = (getHours(start) - startHour) * 60 + getMinutes(start);
                  const top = startMin * pxPerMinute;
                  const duration = (parseISO(lesson.endTime).getTime() - start.getTime()) / 60000;
                  const height = duration * pxPerMinute;
                  const isPast = parseISO(lesson.endTime).getTime() < Date.now();
                  const theme = lesson.type === "LESSON" ? lessonTheme : taskTheme;

                  return (
                    <div
                      key={lesson.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onLessonClick(lesson);
                      }}
                      className={`absolute left-1 right-1 rounded border px-2 py-1 text-xs shadow-sm cursor-pointer overflow-hidden z-10 ${theme.eventBg} ${theme.eventBorder} ${theme.eventText} ${
                        dimPastEvents && isPast ? "opacity-60" : ""
                      }`}
                      style={{ top: `${top}px`, height: `${height}px` }}
                    >
                      <div className="font-bold">
                        {format(start, "HH:mm")}
                        {showTimezone && timeZoneLabel ? <span className="ml-1 text-[10px] opacity-70">{timeZoneLabel}</span> : null}
                      </div>
                      <div>
                        {lesson.type === "LESSON" ? lesson.student?.name : personalTitles[lesson.id] ?? "Личное"}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
