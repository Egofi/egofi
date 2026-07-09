import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { SkipIdempotency } from "../shared";
import { AuthService } from "./auth.service";
import { CurrentMerchant } from "./decorators/current-merchant.decorator";
import { AdminLoginDto, LoginDto, RefreshTokenDto, RegisterDto } from "./dto/auth.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import type { AuthenticatedMerchant } from "./principals";
import { publicMerchant } from "./principals";

@ApiTags("auth")
@SkipIdempotency()
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("register")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: "Register a new merchant" })
  register(@Body() dto: RegisterDto) {
    return this.auth.registerMerchant(dto);
  }

  @Post("login")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: "Merchant login" })
  login(@Body() dto: LoginDto) {
    return this.auth.loginMerchant(dto.email, dto.password);
  }

  @Post("refresh")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: "Rotate a merchant refresh token" })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.auth.refreshToken(dto.refreshToken);
  }

  @Post("admin/login")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: "Operator login (admin back-office)" })
  adminLogin(@Body() dto: AdminLoginDto) {
    return this.auth.loginAdmin(dto.email, dto.password);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Get current merchant profile" })
  me(@CurrentMerchant() merchant: AuthenticatedMerchant) {
    return publicMerchant(merchant);
  }
}
