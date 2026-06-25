import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';
import { IsNull, Repository } from 'typeorm';
import { AppConfig } from '../config/env.validation';
import { AppException } from '../common/errors/app.exception';
import { ErrorCode } from '../common/errors/error-code.enum';
import { User } from '../users/entities/user.entity';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { MailService } from './mail.service';

@Injectable()
export class PasswordResetService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(PasswordResetToken)
    private readonly resetTokensRepository: Repository<PasswordResetToken>,
    private readonly mailService: MailService,
    private readonly configService: ConfigService<AppConfig>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokensRepository?: Repository<RefreshToken>,
  ) {}

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ accepted: boolean }> {
    const email = this.normalizeEmail(dto.email);
    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) return { accepted: true };

    await this.resetTokensRepository.update(
      { userId: user.id, usedAt: IsNull() },
      { usedAt: new Date() },
    );

    const otp = this.generateOtp();
    const token = this.resetTokensRepository.create({
      userId: user.id,
      otpHash: await bcrypt.hash(otp, 12),
      expiresAt: this.expiresAt(),
      usedAt: null,
      attemptCount: 0,
    });
    await this.resetTokensRepository.save(token);
    await this.mailService.sendPasswordResetOtp(email, otp);
    return { accepted: true };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ reset: boolean }> {
    const email = this.normalizeEmail(dto.email);
    const user = await this.usersRepository.findOne({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
      },
    });
    if (!user) {
      throw new AppException(
        ErrorCode.BadRequest,
        'Password reset code is invalid or expired',
        HttpStatus.BAD_REQUEST,
      );
    }

    const token = await this.resetTokensRepository.findOne({
      where: { userId: user.id, usedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
    if (!token || token.expiresAt.getTime() <= Date.now()) {
      throw new AppException(
        ErrorCode.BadRequest,
        'Password reset code is invalid or expired',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!(await bcrypt.compare(dto.otp, token.otpHash))) {
      token.attemptCount += 1;
      await this.resetTokensRepository.save(token);
      throw new AppException(
        ErrorCode.BadRequest,
        'Password reset code is invalid or expired',
        HttpStatus.BAD_REQUEST,
      );
    }

    user.passwordHash = await bcrypt.hash(dto.newPassword, 12);
    token.usedAt = new Date();
    await this.usersRepository.save(user);
    await this.resetTokensRepository.save(token);
    await this.refreshTokensRepository?.update(
      { userId: user.id, isRevoked: false },
      { isRevoked: true },
    );
    return { reset: true };
  }

  private expiresAt(): Date {
    const ttlMinutes =
      this.configService.get('passwordResetOtpTtlMinutes', { infer: true }) ??
      10;
    return new Date(Date.now() + ttlMinutes * 60_000);
  }

  private generateOtp(): string {
    return String(randomInt(0, 1_000_000)).padStart(6, '0');
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }
}
