import { IsEmail, IsString, Length, Matches } from 'class-validator';

export class ResetPasswordDto {
  @IsEmail()
  email!: string;

  @Matches(/^\d{6}$/)
  otp!: string;

  @IsString()
  @Length(8, 128)
  newPassword!: string;
}
