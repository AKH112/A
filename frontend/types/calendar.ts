export type CalendarColorId = "black" | "purple" | "lime" | "yellow" | "pink" | "blue" | "gray" | "orange";

export type CalendarSettings = {
  cancelWindowMinutes: number;
  showStudentTimezone: boolean;
  rowHeight: number;
  taskColor: CalendarColorId;
  lessonColor: CalendarColorId;
  dimPastEvents: boolean;
};

export const DEFAULT_CALENDAR_SETTINGS: CalendarSettings = {
  cancelWindowMinutes: 24 * 60,
  showStudentTimezone: false,
  rowHeight: 60,
  taskColor: "gray",
  lessonColor: "purple",
  dimPastEvents: true,
};

