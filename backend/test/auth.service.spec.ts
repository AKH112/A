import { AuthService } from "../src/auth/auth.service";

describe("AuthService", () => {
  const usersService = {
    findOne: jest.fn(),
    findById: jest.fn()
  };
  const jwtService = {
    sign: jest.fn(),
    verify: jest.fn()
  };
  const configService = {
    get: jest.fn()
  };

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    configService.get.mockImplementation((key: string) => {
      if (key === "JWT_REFRESH_SECRET") return "refresh-secret";
      if (key === "JWT_SECRET") return "access-secret";
      return undefined;
    });
    service = new AuthService(usersService as any, jwtService as any, configService as any);
  });

  it("creates access tokens with access secret", () => {
    jwtService.sign.mockReturnValue("access-token");
    const token = service.createAccessToken({ id: "user-1", email: "test@example.com", tariff: "FREE" });
    expect(token).toBe("access-token");
    expect(jwtService.sign).toHaveBeenCalledWith(
      { email: "test@example.com", sub: "user-1", tariff: "FREE", type: "access" },
      expect.objectContaining({ expiresIn: "15m", secret: "access-secret" })
    );
  });

  it("creates refresh tokens with refresh secret", () => {
    jwtService.sign.mockReturnValue("refresh-token");
    const token = service.createRefreshToken({ id: "user-1", email: "test@example.com", tariff: "FREE" });
    expect(token).toBe("refresh-token");
    expect(jwtService.sign).toHaveBeenCalledWith(
      { sub: "user-1", type: "refresh" },
      expect.objectContaining({ expiresIn: "7d", secret: "refresh-secret" })
    );
  });

  it("returns safe user without passwordHash", async () => {
    usersService.findById.mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      tariff: "FREE",
      passwordHash: "hashed"
    });
    await expect(service.getSafeUserById("user-1")).resolves.toEqual({
      id: "user-1",
      email: "test@example.com",
      tariff: "FREE"
    });
  });
});
