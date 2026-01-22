import { NotFoundException } from "@nestjs/common";
import { NotificationChannel, NotificationType } from "@prisma/client";
import { NotificationsService } from "../src/notifications/notifications.service";

describe("NotificationsService", () => {
  const prisma = {
    student: {
      findFirst: jest.fn()
    },
    notification: {
      create: jest.fn(),
      findMany: jest.fn()
    }
  } as any;

  let service: NotificationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationsService(prisma);
  });

  it("throws when student does not belong to user", async () => {
    prisma.student.findFirst.mockResolvedValue(null);
    await expect(service.createPaymentReminder("user-1", { studentId: "student-1" })).rejects.toBeInstanceOf(
      NotFoundException
    );
  });

  it("creates payment reminder with default channel", async () => {
    prisma.student.findFirst.mockResolvedValue({ id: "student-1" });
    prisma.notification.create.mockResolvedValue({ id: "notif-1" });

    await service.createPaymentReminder("user-1", { studentId: "student-1" });

    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        channel: NotificationChannel.TELEGRAM,
        type: NotificationType.PAYMENT_REMINDER
      })
    });
  });

  it("returns nextCursor when list is full", async () => {
    prisma.notification.findMany.mockResolvedValue([{ id: "n1" }, { id: "n2" }]);

    const result = await service.findAll("user-1", { take: 2 } as any);

    expect(result.items).toHaveLength(2);
    expect(result.nextCursor).toBe("n2");
  });

  it("returns null nextCursor when list is short", async () => {
    prisma.notification.findMany.mockResolvedValue([{ id: "n1" }]);

    const result = await service.findAll("user-1", { take: 2 } as any);

    expect(result.nextCursor).toBeNull();
  });
});
