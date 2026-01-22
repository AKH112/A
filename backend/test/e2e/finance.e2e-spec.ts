import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { AuthGuard } from "@nestjs/passport";
import request from "supertest";
import { FinanceController } from "../../src/finance/finance.controller";
import { FinanceService } from "../../src/finance/finance.service";

describe("FinanceController (e2e)", () => {
  let app: INestApplication;

  const financeService = {
    transfer: jest.fn(),
    getSummary: jest.fn(),
    listTransactions: jest.fn()
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [FinanceController],
      providers: [{ provide: FinanceService, useValue: financeService }]
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

  it("POST /finance/transfer returns transfer result", async () => {
    financeService.transfer.mockResolvedValue({ out: { id: "out" }, in: { id: "in" } });

    const payload = { fromWalletId: "wallet-1", toWalletId: "wallet-2", amount: 100 };
    const response = await request(app.getHttpServer())
      .post("/finance/transfer")
      .send(payload)
      .expect(201);

    expect(financeService.transfer).toHaveBeenCalledWith("user-1", payload);
    expect(response.body).toEqual({ out: { id: "out" }, in: { id: "in" } });
  });

  it("GET /finance/summary returns totals", async () => {
    financeService.getSummary.mockResolvedValue({ income: 100, expense: 40, net: 60 });

    const response = await request(app.getHttpServer())
      .get("/finance/summary")
      .query({ from: "2024-01-01", to: "2024-01-31", walletId: "wallet-1" })
      .expect(200);

    expect(financeService.getSummary).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ walletId: "wallet-1" })
    );
    expect(response.body).toEqual({ income: 100, expense: 40, net: 60 });
  });

  it("GET /finance/transactions returns list", async () => {
    financeService.listTransactions.mockResolvedValue([{ id: "tx-1" }]);

    const response = await request(app.getHttpServer())
      .get("/finance/transactions")
      .query({ walletId: "wallet-1" })
      .expect(200);

    expect(financeService.listTransactions).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ walletId: "wallet-1" })
    );
    expect(response.body).toEqual([{ id: "tx-1" }]);
  });
});
