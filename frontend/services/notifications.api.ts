import api from "@/services/api";

export type NotificationChannel = "EMAIL" | "TELEGRAM";

export type Notification = {
  id: string;
  userId: string;
  studentId: string | null;
  type: "LESSON_REMINDER" | "PAYMENT_REMINDER" | "HOMEWORK_ASSIGNED" | string;
  channel: NotificationChannel | string;
  status: "PENDING" | "SENT" | "FAILED" | string;
  scheduledAt: string;
  sentAt?: string | null;
  createdAt: string;
};

export type RemindPaymentPayload = {
  studentId?: string;
  channel?: NotificationChannel;
};

export const getNotifications = async (opts?: { limit?: number; cursor?: string | null }) => {
  const take = opts?.limit;
  const cursor = opts?.cursor ?? undefined;
  const res = await api.get<{ items: Notification[]; nextCursor: string | null } | Notification[]>("/notifications", {
    params: { take, cursor: cursor || undefined },
  });

  if (Array.isArray(res.data)) {
    const limit = opts?.limit ?? res.data.length;
    return { data: res.data.slice(0, limit), nextCursor: null as string | null };
  }

  const items = Array.isArray((res.data as any)?.items) ? (res.data as any).items : [];
  const nextCursor = typeof (res.data as any)?.nextCursor === "string" ? (res.data as any).nextCursor : null;
  return { data: items, nextCursor };
};

export const remindPayment = (payload?: RemindPaymentPayload) => {
  const body: Record<string, string> = {};
  if (payload?.studentId) body.studentId = payload.studentId;
  if (payload?.channel) body.channel = payload.channel;
  return api.post("/notifications/remind-payment", body);
};
