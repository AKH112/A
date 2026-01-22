import { Body, Controller, Get, Post, Request, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { OtpRequestDto } from './dto/otp-request.dto';
import { OtpVerifyDto } from './dto/otp-verify.dto';
import { RegisterDto } from './dto/register.dto';
import { getCookieValue } from './auth.cookies';

type AuthenticatedRequest = { user: { userId: string; email: string; tariff: string } };
type ResponseLike = { cookie: (name: string, value: string, options?: any) => unknown; clearCookie: (name: string, options?: any) => unknown };

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private config: ConfigService,
  ) {}

  private getCookieOptions() {
    const env = this.config.get<string>('NODE_ENV');
    const rawSameSite = this.config.get<string>('COOKIE_SAMESITE');
    const sameSite = rawSameSite === 'none' || rawSameSite === 'strict' || rawSameSite === 'lax' ? rawSameSite : 'lax';
    const domain = this.config.get<string>('COOKIE_DOMAIN');
    const forceSecure = this.config.get<string>('COOKIE_SECURE') === '1';
    const secure = forceSecure || env === 'production' || sameSite === 'none';
    return {
      httpOnly: true,
      sameSite,
      secure,
      path: '/',
      domain: typeof domain === 'string' && domain.trim().length > 0 ? domain.trim() : undefined,
    };
  }

  @Post('login')
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) res: ResponseLike) {
    const user = await this.authService.loginWithPassword(body.email, body.password);
    const accessToken = this.authService.createAccessToken(user);
    const refreshToken = this.authService.createRefreshToken(user);
    const options = this.getCookieOptions();
    res.cookie('secrep_access', accessToken, { ...options, maxAge: 15 * 60 * 1000 });
    res.cookie('secrep_refresh', refreshToken, { ...options, maxAge: 7 * 24 * 60 * 60 * 1000 });
    return { ok: true, user };
  }

  @Post('register')
  async register(@Body() body: RegisterDto, @Res({ passthrough: true }) res: ResponseLike) {
    const user = await this.authService.register(body);
    const accessToken = this.authService.createAccessToken(user);
    const refreshToken = this.authService.createRefreshToken(user);
    const options = this.getCookieOptions();
    res.cookie('secrep_access', accessToken, { ...options, maxAge: 15 * 60 * 1000 });
    res.cookie('secrep_refresh', refreshToken, { ...options, maxAge: 7 * 24 * 60 * 60 * 1000 });
    return { ok: true, user };
  }

  @Post('otp/request')
  async requestOtp(@Body() body: OtpRequestDto) {
    return this.authService.requestEmailOtp(body.email);
  }

  @Post('otp/verify')
  async verifyOtp(@Body() body: OtpVerifyDto, @Res({ passthrough: true }) res: ResponseLike) {
    const user = await this.authService.verifyEmailOtp(body.email, body.code);
    const accessToken = this.authService.createAccessToken(user);
    const refreshToken = this.authService.createRefreshToken(user);
    const options = this.getCookieOptions();
    res.cookie('secrep_access', accessToken, { ...options, maxAge: 15 * 60 * 1000 });
    res.cookie('secrep_refresh', refreshToken, { ...options, maxAge: 7 * 24 * 60 * 60 * 1000 });
    return { ok: true, user };
  }

  @Post('refresh')
  async refresh(@Request() req: any, @Res({ passthrough: true }) res: ResponseLike) {
    const refreshToken = getCookieValue(req, 'secrep_refresh');
    if (!refreshToken) throw new UnauthorizedException();
    const payload = this.authService.verifyRefreshToken(refreshToken);
    if (payload.type && payload.type !== 'refresh') throw new UnauthorizedException();
    const user = await this.authService.getSafeUserById(payload.sub);
    if (!user) throw new UnauthorizedException();

    const newAccessToken = this.authService.createAccessToken(user);
    const newRefreshToken = this.authService.createRefreshToken(user);
    const options = this.getCookieOptions();
    res.cookie('secrep_access', newAccessToken, { ...options, maxAge: 15 * 60 * 1000 });
    res.cookie('secrep_refresh', newRefreshToken, { ...options, maxAge: 7 * 24 * 60 * 60 * 1000 });
    return { ok: true };
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: ResponseLike) {
    const options = this.getCookieOptions();
    res.clearCookie('secrep_access', options);
    res.clearCookie('secrep_refresh', options);
    return { ok: true };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  getProfile(@Request() req: AuthenticatedRequest) {
    return req.user;
  }
}
