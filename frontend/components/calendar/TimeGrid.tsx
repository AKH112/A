import { FC } from "react";
import { format, getHours, getMinutes, isSameDay, parseISO } from "date-fns";
import { Lesson } from "@/types/lesson";

interface TimeGridProps {
  date: Date;
  lessons: Lesson[];
  onSlotClick: (date: Date) => void;
  onLessonClick: (lesson: Lesson) => void;
}

export const TimeGrid: FC<TimeGridProps> = ({ date, lessons, onSlotClick, onLessonClick }) => {
  const startHour = 8;
  const endHour = 22;
  const slots: Date[] = [];

  for (let h = startHour; h < endHour; h++) {
    slots.push(new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, 0, 0, 0));
    slots.push(new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, 30, 0, 0));
  }

  return (
    <div className="relative h-[600px] overflow-y-auto rounded-2xl bg-transparent">
      {slots.map((slot, i) => (
        <div
          key={i}
          className="group relative h-12 cursor-pointer border-b border-gray-100 hover:bg-gray-50"
          onClick={() => onSlotClick(slot)}
        >
          <span className="absolute left-2 -top-2 text-xs text-gray-400">{format(slot, "HH:mm")}</span>
        </div>
      ))}

      {lessons.map((lesson) => {
        const start = parseISO(lesson.startTime);
        if (!isSameDay(start, date)) return null;

        const startMin = (getHours(start) - startHour) * 60 + getMinutes(start);
        const top = (startMin / 30) * 48;
        const duration = (parseISO(lesson.endTime).getTime() - start.getTime()) / 60000;
        const height = (duration / 30) * 48;

        const colorClass =
          lesson.type === "LESSON"
            ? "bg-green-100 border-green-300 text-green-800"
            : "bg-purple-100 border-purple-300 text-purple-800";

        return (
          <div
            key={lesson.id}
            onClick={(e) => {
              e.stopPropagation();
              onLessonClick(lesson);
            }}
            className={`absolute left-10 right-2 cursor-pointer overflow-hidden rounded border px-2 py-1 text-sm shadow-sm ${colorClass}`}
            style={{ top: `${top}px`, height: `${height}px` }}
          >
            <div className="font-bold">{format(start, "HH:mm")}</div>
            <div>{lesson.type === "LESSON" ? lesson.student?.name ?? "Урок" : "Личное"}</div>
          </div>
        );
      })}
    </div>
  );
};
