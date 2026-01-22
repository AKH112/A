import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { AuthGuard } from "@nestjs/passport";
import request from "supertest";
import { NotificationsController } from "../../src/notifications/notifications.controller";
import { NotificationsService } from "../../src/notifications/notifications.service";

describe("NotificationsController (e2e)", () => {
  let app: INestApplication;

  const notificationsService = {
    createPaymentReminder: jest.fn(),
    findAll: jest.fn()
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [{ provide: NotificationsService, useValue: notificationsService }]
    })
      .overrideGuard(AuthGuard("jwt"))
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          req.user = { userId: "user-1" };
          return true;
        }
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("POST /notifications/remind-payment returns notification id", async () => {
    notificationsService.createPaymentReminder.mockResolvedValue({ id: "notif-1" });

    const response = await request(app.getHttpServer())
      .post("/notifications/remind-payment")
      .send({ studentId: "student-1" })
      .expect(201);

    expect(notificationsService.createPaymentReminder).toHaveBeenCalledWith("user-1", { studentId: "student-1" });
    expect(response.body).toEqual({ ok: true, notificationId: "notif-1" });
  });

  it("GET /notifications returns list with cursor", async () => {
    notificationsService.findAll.mockResolvedValue({ items: [{ id: "n1" }], nextCursor: "n1" });

    const response = await request(app.getHttpServer())
      .get("/notifications")
      .query({ take: 10, cursor: "n0" })
      .expect(200);

    expect(notificationsService.findAll).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ cursor: "n0" })
    );
    expect(response.body).toEqual({ items: [{ id: "n1" }], nextCursor: "n1" });
  });
});
