import { CalendarColorId } from "@/types/calendar";

export type CalendarColorTheme = {
  id: CalendarColorId;
  dotBg: string;
  badgeBg: string;
  badgeText: string;
  eventBg: string;
  eventBorder: string;
  eventText: string;
};

export const CALENDAR_COLOR_THEMES: CalendarColorTheme[] = [
  {
    id: "black",
    dotBg: "bg-gray-900",
    badgeBg: "bg-gray-900",
    badgeText: "text-white",
    eventBg: "bg-gray-900/10",
    eventBorder: "border-gray-900/20",
    eventText: "text-gray-900",
  },
  {
    id: "purple",
    dotBg: "bg-purple-500",
    badgeBg: "bg-purple-100",
    badgeText: "text-purple-700",
    eventBg: "bg-purple-100",
    eventBorder: "border-purple-200",
    eventText: "text-purple-800",
  },
  {
    id: "lime",
    dotBg: "bg-lime-500",
    badgeBg: "bg-lime-100",
    badgeText: "text-lime-800",
    eventBg: "bg-lime-100",
    eventBorder: "border-lime-200",
    eventText: "text-lime-900",
  },
  {
    id: "yellow",
    dotBg: "bg-yellow-400",
    badgeBg: "bg-yellow-100",
    badgeText: "text-yellow-800",
    eventBg: "bg-yellow-100",
    eventBorder: "border-yellow-200",
    eventText: "text-yellow-900",
  },
  {
    id: "pink",
    dotBg: "bg-pink-500",
    badgeBg: "bg-pink-100",
    badgeText: "text-pink-800",
    eventBg: "bg-pink-100",
    eventBorder: "border-pink-200",
    eventText: "text-pink-900",
  },
  {
    id: "blue",
    dotBg: "bg-sky-500",
    badgeBg: "bg-sky-100",
    badgeText: "text-sky-800",
    eventBg: "bg-sky-100",
    eventBorder: "border-sky-200",
    eventText: "text-sky-900",
  },
  {
    id: "gray",
    dotBg: "bg-gray-400",
    badgeBg: "bg-gray-100",
    badgeText: "text-gray-700",
    eventBg: "bg-gray-100",
    eventBorder: "border-gray-200",
    eventText: "text-gray-800",
  },
  {
    id: "orange",
    dotBg: "bg-orange-500",
    badgeBg: "bg-orange-100",
    badgeText: "text-orange-800",
    eventBg: "bg-orange-100",
    eventBorder: "border-orange-200",
    eventText: "text-orange-900",
  },
];

export const getCalendarTheme = (id: CalendarColorId): CalendarColorTheme => {
  return CALENDAR_COLOR_THEMES.find((t) => t.id === id) ?? CALENDAR_COLOR_THEMES[1];
};

