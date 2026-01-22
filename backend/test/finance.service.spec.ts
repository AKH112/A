import { BadRequestException, NotFoundException } from "@nestjs/common";
import { FinanceService } from "../src/finance/finance.service";

describe("FinanceService", () => {
  const prisma = {
    wallet: { findFirst: jest.fn(), update: jest.fn() },
    transaction: { create: jest.fn(), findMany: jest.fn(), aggregate: jest.fn() },
    $transaction: jest.fn()
  } as any;
  const walletsService = {
    ensureDefault: jest.fn()
  };

  let service: FinanceService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new FinanceService(prisma, walletsService as any);
  });

  it("rejects invalid amount", () => {
    expect(() => (service as any).parseAmount("abc")).toThrow(BadRequestException);
  });

  it("throws if wallet not found", async () => {
    prisma.wallet.findFirst.mockResolvedValue(null);
    await expect(service.addIncome("user-1", { walletId: "w1", amount: 10 } as any)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("creates transfer transactions", async () => {
    prisma.wallet.findFirst.mockResolvedValue({ id: "w1" });
    prisma.$transaction.mockImplementation(async (fn: any) => fn({
      transaction: { create: jest.fn() },
      wallet: { update: jest.fn() }
    }));

    await service.transfer("user-1", { fromWalletId: "w1", toWalletId: "w2", amount: 10 } as any);

    expect(prisma.$transaction).toHaveBeenCalled();
  });
});
