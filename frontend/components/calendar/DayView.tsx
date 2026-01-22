import { FC, useEffect, useRef } from "react";
import { format, getHours, getMinutes, isSameDay, parseISO } from "date-fns";
import { Lesson } from "@/types/lesson";
import { CalendarColorTheme } from "@/components/calendar/calendarTheme";

interface DayViewProps {
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

export const DayView: FC<DayViewProps> = ({
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
  const startHour = 0;
  const endHour = 24;
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const pxPerMinute = rowHeight / 60;

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 8 * rowHeight;
    }
  }, [rowHeight]);

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
      <div ref={containerRef} className="flex-1 overflow-y-auto relative">
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

          <div className="flex-1 relative">
            {hours.map((h) => (
              <div
                key={h}
                className="absolute w-full border-b border-gray-100"
                style={{ top: `${(h - startHour) * rowHeight}px` }}
              />
            ))}

            {hours.map((h) => (
              <div
                key={h}
                className="cursor-pointer hover:bg-gray-50"
                style={{ height: `${rowHeight}px` }}
                onClick={() => {
                  const slotDate = new Date(date);
                  slotDate.setHours(h);
                  onSlotClick(slotDate);
                }}
              />
            ))}

            {lessons.map((lesson) => {
              const start = parseISO(lesson.startTime);
              if (!isSameDay(start, date)) return null;

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
                  className={`absolute left-2 right-2 rounded-lg border px-4 py-2 shadow-sm cursor-pointer overflow-hidden z-10 ${theme.eventBg} ${theme.eventBorder} ${theme.eventText} ${
                    dimPastEvents && isPast ? "opacity-60" : ""
                  }`}
                  style={{ top: `${top}px`, height: `${height}px` }}
                >
                  <div className="flex items-center justify-between">
                     <span className="font-bold text-sm">
                       {format(start, "HH:mm")} - {format(parseISO(lesson.endTime), "HH:mm")}
                       {showTimezone && timeZoneLabel ? <span className="ml-1 text-[10px] opacity-70">{timeZoneLabel}</span> : null}
                     </span>
                  </div>
                  <div className="mt-1 font-medium">
                    {lesson.type === "LESSON" ? lesson.student?.name : personalTitles[lesson.id] ?? "Личное дело"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
