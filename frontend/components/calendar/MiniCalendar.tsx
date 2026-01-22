import { FC } from "react";
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  addMonths
} from "date-fns";
import { ru } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface MiniCalendarProps {
  date: Date;
  onChange: (date: Date) => void;
}

export const MiniCalendar: FC<MiniCalendarProps> = ({ date, onChange }) => {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { locale: ru });
  const endDate = endOfWeek(monthEnd, { locale: ru });

  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

  const nextMonth = () => onChange(addMonths(date, 1));
  const prevMonth = () => onChange(addMonths(date, -1));

  return (
    <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
      <div className="mb-4 flex items-center justify-between">
        <button onClick={prevMonth} className="text-gray-400 hover:text-gray-900">
          <ChevronLeft size={20} />
        </button>
        <span className="text-sm font-medium capitalize text-gray-900">
          {format(date, "LLLL yyyy", { locale: ru })}
        </span>
        <button onClick={nextMonth} className="text-gray-400 hover:text-gray-900">
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="grid grid-cols-7 text-center mb-2">
        {weekDays.map((day) => (
          <div key={day} className="text-xs text-gray-400">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-2 text-center">
        {days.map((day) => {
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isSelected = isSameDay(day, date);
          const isCurrentDay = isToday(day);

          return (
            <button
              key={day.toISOString()}
              onClick={() => onChange(day)}
              className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm transition-colors
                ${isSelected ? "bg-lime-400 font-medium text-gray-900" : ""}
                ${!isSelected && isCurrentDay ? "bg-gray-100 font-medium text-gray-900" : ""}
                ${!isSelected && !isCurrentDay && isCurrentMonth ? "text-gray-700 hover:bg-gray-50" : ""}
                ${!isSelected && !isCurrentDay && !isCurrentMonth ? "text-gray-300" : ""}
              `}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
};
