import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import request from "supertest";
import { AuthController } from "../../src/auth/auth.controller";
import { AuthService } from "../../src/auth/auth.service";

describe("AuthController (e2e)", () => {
  let app: INestApplication;

  const user = { id: "user-1", email: "test@example.com", tariff: "FREE" };
  const authService = {
    loginWithPassword: jest.fn(),
    register: jest.fn(),
    createAccessToken: jest.fn(),
    createRefreshToken: jest.fn(),
    verifyRefreshToken: jest.fn(),
    getSafeUserById: jest.fn()
  };
  const configService = {
    get: jest.fn((key: string) => {
      if (key === "NODE_ENV") return "test";
      if (key === "COOKIE_SAMESITE") return "lax";
      if (key === "COOKIE_SECURE") return "0";
      if (key === "COOKIE_DOMAIN") return "";
      return undefined;
    })
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: ConfigService, useValue: configService }
      ]
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const getCookieHeader = (response: request.Response) => {
    const setCookie = response.headers["set-cookie"];
    return Array.isArray(setCookie) ? setCookie.join(";") : setCookie ?? "";
  };

  it("POST /auth/login sets cookies", async () => {
    authService.loginWithPassword.mockResolvedValue(user);
    authService.createAccessToken.mockReturnValue("access-token");
    authService.createRefreshToken.mockReturnValue("refresh-token");

    const response = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: "test@example.com", password: "pass" })
      .expect(201);

    expect(authService.loginWithPassword).toHaveBeenCalledWith("test@example.com", "pass");
    expect(response.body).toEqual({ ok: true, user });

    const cookies = getCookieHeader(response);
    expect(cookies).toContain("secrep_access=access-token");
    expect(cookies).toContain("secrep_refresh=refresh-token");
  });

  it("POST /auth/register sets cookies", async () => {
    authService.register.mockResolvedValue(user);
    authService.createAccessToken.mockReturnValue("access-token");
    authService.createRefreshToken.mockReturnValue("refresh-token");

    const response = await request(app.getHttpServer())
      .post("/auth/register")
      .send({ email: "test@example.com", password: "pass", name: "Test" })
      .expect(201);

    expect(authService.register).toHaveBeenCalledWith({ email: "test@example.com", password: "pass", name: "Test" });
    const cookies = getCookieHeader(response);
    expect(cookies).toContain("secrep_access=access-token");
    expect(cookies).toContain("secrep_refresh=refresh-token");
  });

  it("POST /auth/refresh rotates cookies", async () => {
    authService.verifyRefreshToken.mockReturnValue({ sub: user.id, type: "refresh" });
    authService.getSafeUserById.mockResolvedValue(user);
    authService.createAccessToken.mockReturnValue("new-access");
    authService.createRefreshToken.mockReturnValue("new-refresh");

    const response = await request(app.getHttpServer())
      .post("/auth/refresh")
      .set("Cookie", ["secrep_refresh=refresh-token"])
      .expect(201);

    expect(authService.verifyRefreshToken).toHaveBeenCalledWith("refresh-token");
    const cookies = getCookieHeader(response);
    expect(cookies).toContain("secrep_access=new-access");
    expect(cookies).toContain("secrep_refresh=new-refresh");
  });

  it("POST /auth/logout clears cookies", async () => {
    const response = await request(app.getHttpServer()).post("/auth/logout").expect(201);

    expect(response.body).toEqual({ ok: true });
    const cookies = getCookieHeader(response);
    expect(cookies).toContain("secrep_access=");
    expect(cookies).toContain("secrep_refresh=");
  });
});
