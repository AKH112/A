import { FC } from "react";
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  isSameDay
} from "date-fns";
import { ru } from "date-fns/locale";
import { Lesson } from "@/types/lesson";
import { CalendarColorTheme } from "@/components/calendar/calendarTheme";

interface MonthViewProps {
  date: Date;
  lessons: Lesson[];
  personalTitles: Record<string, string>;
  taskTheme: CalendarColorTheme;
  lessonTheme: CalendarColorTheme;
  onDateClick: (date: Date) => void;
  onLessonClick: (lesson: Lesson) => void;
}

export const MonthView: FC<MonthViewProps> = ({
  date,
  lessons,
  personalTitles,
  taskTheme,
  lessonTheme,
  onDateClick,
  onLessonClick,
}) => {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { locale: ru });
  const endDate = endOfWeek(monthEnd, { locale: ru });

  const days = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const weekDays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

  return (
    <div className="flex h-full flex-col bg-white rounded-3xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
      <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/50">
        {weekDays.map((day) => (
          <div key={day} className="py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
            {day}
          </div>
        ))}
      </div>
      <div className="flex-1 grid grid-cols-7 grid-rows-6">
        {days.map((day, idx) => {
          const isCurrentMonth = isSameMonth(day, monthStart);
          const dayLessons = lessons.filter((l) => isSameDay(parseISO(l.startTime), day));
          const isCurrentDay = isToday(day);

          return (
            <div
              key={day.toISOString()}
              onClick={() => onDateClick(day)}
              className={`min-h-[100px] border-b border-r border-gray-100 p-2 transition-colors hover:bg-gray-50 cursor-pointer ${
                !isCurrentMonth ? "bg-gray-50/30 text-gray-400" : ""
              } ${idx % 7 === 6 ? "border-r-0" : ""}`}
            >
              <div className="flex justify-between items-start">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium ${
                    isCurrentDay
                      ? "bg-lime-400 text-gray-900 shadow-sm"
                      : "text-gray-700"
                  }`}
                >
                  {format(day, "d")}
                </span>
              </div>
              <div className="mt-1 space-y-1">
                {dayLessons.slice(0, 3).map((lesson) => (
                  <div
                    key={lesson.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onLessonClick(lesson);
                    }}
                    className={`truncate rounded px-1.5 py-0.5 text-xs font-medium ${
                      lesson.type === "LESSON"
                        ? `${lessonTheme.badgeBg} ${lessonTheme.badgeText}`
                        : `${taskTheme.badgeBg} ${taskTheme.badgeText}`
                    }`}
                  >
                    {lesson.type === "LESSON" ? lesson.student?.name : personalTitles[lesson.id] ?? "Личное"}
                  </div>
                ))}
                {dayLessons.length > 3 && (
                  <div className="text-xs text-gray-400 pl-1">
                    Еще {dayLessons.length - 3}...
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
