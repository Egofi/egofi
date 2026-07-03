import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { SkipIdempotency } from "../shared";
import type { AuthService } from "./auth.service";
import { CurrentMerchant } from "./decorators/current-merchant.decorator";
import type { AdminLoginDto, LoginDto, RegisterDto } from "./dto/auth.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";

@ApiTags("auth")
@SkipIdempotency() // authentication creates no payment resource; retries are safe
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("register")
  @ApiOperation({ summary: "Register a new merchant" })
  register(@Body() dto: RegisterDto) {
    return this.auth.registerMerchant(dto);
  }

  @Post("login")
  @ApiOperation({ summary: "Merchant login" })
  login(@Body() dto: LoginDto) {
    return this.auth.loginMerchant(dto.email, dto.password);
  }

  @Post("admin/login")
  @ApiOperation({ summary: "Operator login (admin back-office)" })
  adminLogin(@Body() dto: AdminLoginDto) {
    return this.auth.loginAdmin(dto.email, dto.password);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Get current merchant profile" })
  me(@CurrentMerchant() merchant: Express.User) {
    return merchant;
  }
}
