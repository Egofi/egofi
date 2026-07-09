import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsObject, IsString, MaxLength, MinLength } from "class-validator";

export class RegisterDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  business!: string;

  @ApiProperty()
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(12)
  @MaxLength(256)
  password!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(40)
  settlementAsset!: string;

  @ApiProperty()
  @IsObject()
  settlementAddresses!: Record<string, string>;
}

export class LoginDto {
  @ApiProperty()
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  password!: string;
}

export class AdminLoginDto {
  @ApiProperty()
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  password!: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @MinLength(64)
  @MaxLength(256)
  refreshToken!: string;
}
