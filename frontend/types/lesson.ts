export interface Lesson {
  id: string;
  startTime: string;
  endTime: string;
  type: "LESSON" | "PERSONAL";
  student?: { id: string; name: string } | null;
  status: string;
  price?: number | null;
  isPaid?: boolean;
}
