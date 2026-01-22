import { FC } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock, Calendar as CalendarIcon, FileText, Settings, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface CalendarHeaderProps {
  view: "month" | "week" | "day";
  onViewChange: (view: "month" | "week" | "day") => void;
  date: Date;
  onDateChange: (date: Date) => void;
  onToday: () => void;
  onAddClick: () => void;
  addDisabled?: boolean;
  addText?: string;
  rightView: "calendar" | "notes" | "settings";
  onRightViewChange: (view: "calendar" | "notes" | "settings") => void;
}

export const CalendarHeader: FC<CalendarHeaderProps> = ({
  view,
  onViewChange,
  date,
  onDateChange,
  onToday,
  onAddClick,
  addDisabled,
  addText,
  rightView,
  onRightViewChange,
}) => {
  const navigate = (direction: "prev" | "next") => {
    const newDate = new Date(date);
    if (view === "month") {
      newDate.setMonth(date.getMonth() + (direction === "next" ? 1 : -1));
    } else if (view === "week") {
      newDate.setDate(date.getDate() + (direction === "next" ? 7 : -7));
    } else {
      newDate.setDate(date.getDate() + (direction === "next" ? 1 : -1));
    }
    onDateChange(newDate);
  };

  const getTitle = () => {
    if (view === "month") {
      return format(date, "LLLL yyyy", { locale: ru });
    }
    if (view === "week") {
      return format(date, "LLLL yyyy", { locale: ru });
    }
    return format(date, "d MMMM yyyy, EEE", { locale: ru });
  };

  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-4">
        <div className="flex overflow-hidden rounded-full bg-white p-1 shadow-sm ring-1 ring-gray-100">
          {(["month", "week", "day"] as const).map((v) => (
            <button
              key={v}
              onClick={() => onViewChange(v)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                view === v ? "bg-white text-gray-900 shadow-sm ring-1 ring-gray-200" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {v === "month" ? "Месяц" : v === "week" ? "Неделя" : "День"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("prev")}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-500 shadow-sm ring-1 ring-gray-100 hover:text-gray-900"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="min-w-[140px] text-center font-medium capitalize text-gray-900">
            {getTitle()}
          </span>
          <button
            onClick={() => navigate("next")}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-500 shadow-sm ring-1 ring-gray-100 hover:text-gray-900"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <button
          onClick={onToday}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-500 shadow-sm ring-1 ring-gray-100 hover:text-gray-900"
          title="Сегодня"
        >
          <Clock size={16} />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onRightViewChange("calendar")}
          className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
            rightView === "calendar"
              ? "bg-gray-900 text-white shadow-sm"
              : "bg-white text-gray-500 shadow-sm ring-1 ring-gray-100 hover:text-gray-900"
          }`}
        >
          <CalendarIcon size={20} />
        </button>
        <button
          onClick={() => onRightViewChange("notes")}
          className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
            rightView === "notes"
              ? "bg-gray-900 text-white shadow-sm"
              : "bg-white text-gray-500 shadow-sm ring-1 ring-gray-100 hover:text-gray-900"
          }`}
        >
          <FileText size={20} />
        </button>
        <button
          onClick={() => onRightViewChange("settings")}
          className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
            rightView === "settings"
              ? "bg-gray-900 text-white shadow-sm"
              : "bg-white text-gray-500 shadow-sm ring-1 ring-gray-100 hover:text-gray-900"
          }`}
        >
          <Settings size={20} />
        </button>
        <Button
          onClick={onAddClick}
          disabled={!!addDisabled}
          className="rounded-full bg-gray-900 px-6 text-white hover:bg-gray-800"
        >
          {addText ?? "Добавить"} <Plus size={16} className="ml-2" />
        </Button>
      </div>
    </div>
  );
};
