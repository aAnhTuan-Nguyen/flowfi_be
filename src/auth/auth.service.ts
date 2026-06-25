import { ConflictException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { AppConfig } from '../config/env.validation';
import { User } from '../users/entities/user.entity';
import { AuthProvider } from '../users/user.enums';
import { ErrorCode } from '../common/errors/error-code.enum';
import { AppException } from '../common/errors/app.exception';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshToken } from './entities/refresh-token.entity';
import { AuthResponse } from './interfaces/auth-response.interface';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokensRepository: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AppConfig>,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.usersRepository.findOne({ where: { email } });

    if (existing) {
      throw new ConflictException({
        code: ErrorCode.Conflict,
        message: 'Email already exists',
      });
    }

    const user = await this.usersRepository.save(
      this.usersRepository.create({
        email,
        passwordHash: await bcrypt.hash(dto.password, 12),
        fullName: dto.fullName ?? null,
        currencyCode: this.configService.get('defaultCurrencyCode', {
          infer: true,
        }),
        authProvider: AuthProvider.Local,
      }),
    );

    return this.issueTokens(user);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.usersRepository.findOne({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        fullName: true,
        avatarUrl: true,
        dateOfBirth: true,
        currencyCode: true,
        monthlyBudgetLimit: true,
        authProvider: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
      },
    });

    if (
      !user?.passwordHash ||
      !(await bcrypt.compare(dto.password, user.passwordHash))
    ) {
      throw new AppException(
        ErrorCode.InvalidCredentials,
        'Invalid email or password',
        HttpStatus.UNAUTHORIZED,
      );
    }

    return this.issueTokens(user);
  }

  async refresh(refreshToken: string): Promise<AuthResponse> {
    const payload = await this.verifyRefreshToken(refreshToken);
    const tokenRows = await this.refreshTokensRepository.find({
      where: { userId: payload.sub, isRevoked: false },
      relations: { user: true },
    });

    const matching = await this.findMatchingRefreshToken(
      refreshToken,
      tokenRows,
    );
    if (!matching || matching.expiresAt.getTime() <= Date.now()) {
      throw new AppException(
        ErrorCode.RefreshTokenInvalid,
        'Refresh token is invalid',
        HttpStatus.UNAUTHORIZED,
      );
    }

    matching.isRevoked = true;
    await this.refreshTokensRepository.save(matching);

    return this.issueTokens(matching.user);
  }

  async logout(
    userId: string,
    refreshToken?: string,
  ): Promise<{ revoked: boolean }> {
    if (!refreshToken) {
      await this.refreshTokensRepository.update(
        { userId, isRevoked: false },
        { isRevoked: true },
      );
      return { revoked: true };
    }

    const rows = await this.refreshTokensRepository.find({
      where: { userId, isRevoked: false },
    });
    const matching = await this.findMatchingRefreshToken(refreshToken, rows);
    if (matching) {
      matching.isRevoked = true;
      await this.refreshTokensRepository.save(matching);
    }

    return { revoked: true };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<AuthResponse> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        fullName: true,
        avatarUrl: true,
        dateOfBirth: true,
        currencyCode: true,
        monthlyBudgetLimit: true,
        authProvider: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
      },
    });

    if (
      !user?.passwordHash ||
      !(await bcrypt.compare(currentPassword, user.passwordHash))
    ) {
      throw new AppException(
        ErrorCode.InvalidCredentials,
        'Current password is invalid',
        HttpStatus.UNAUTHORIZED,
      );
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await this.usersRepository.save(user);
    await this.refreshTokensRepository.update(
      { userId, isRevoked: false },
      { isRevoked: true },
    );
    return this.issueTokens(user);
  }

  private async issueTokens(user: User): Promise<AuthResponse> {
    const payload = { sub: user.id, email: user.email };
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get('jwtAccessSecret', { infer: true }),
      expiresIn: this.configService.get('jwtAccessExpiresIn', { infer: true }),
    });
    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get('jwtRefreshSecret', { infer: true }),
      expiresIn: this.configService.get('jwtRefreshExpiresIn', { infer: true }),
    });

    await this.refreshTokensRepository.save(
      this.refreshTokensRepository.create({
        userId: user.id,
        token: await bcrypt.hash(refreshToken, 12),
        expiresAt: this.refreshExpiresAt(),
      }),
    );

    const safeUser = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      dateOfBirth: user.dateOfBirth,
      currencyCode: user.currencyCode,
      monthlyBudgetLimit: user.monthlyBudgetLimit,
      authProvider: user.authProvider,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      deletedAt: user.deletedAt,
    };
    return { accessToken, refreshToken, user: safeUser };
  }

  private async verifyRefreshToken(
    refreshToken: string,
  ): Promise<{ sub: string; email: string }> {
    try {
      return await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get('jwtRefreshSecret', { infer: true }),
      });
    } catch {
      throw new AppException(
        ErrorCode.RefreshTokenInvalid,
        'Refresh token is invalid',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  private refreshExpiresAt(): Date {
    const expiresIn =
      this.configService.get('jwtRefreshExpiresIn', { infer: true }) ?? '30d';
    const days = Number.parseInt(expiresIn, 10);
    const date = new Date();
    date.setDate(date.getDate() + (Number.isFinite(days) ? days : 30));
    return date;
  }

  private async findMatchingRefreshToken(
    refreshToken: string,
    rows: RefreshToken[],
  ): Promise<RefreshToken | null> {
    for (const row of rows) {
      if (await bcrypt.compare(refreshToken, row.token)) {
        return row;
      }
    }

    return null;
  }
}
