import { IsOptional, IsString, Length } from 'class-validator';

export class RegisterDeviceDto {
  @IsString()
  @Length(1, 255)
  deviceId!: string;

  @IsOptional()
  @IsString()
  deviceName?: string;

  @IsOptional()
  @IsString()
  platform?: string;

  @IsOptional()
  @IsString()
  pushToken?: string;
}
