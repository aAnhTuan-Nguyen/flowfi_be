/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await */
import * as bcrypt from 'bcryptjs';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { PasswordResetService } from './password-reset.service';

describe('PasswordResetService', () => {
  const usersRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };
  const resetTokensRepository = {
    save: jest.fn(),
    update: jest.fn(),
    create: jest.fn((value) => value),
    findOne: jest.fn(),
  };
  const mailService = {
    sendPasswordResetOtp: jest.fn(),
  };
  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'passwordResetOtpTtlMinutes') return 10;
      return undefined;
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stores a hashed OTP and sends the raw OTP by email', async () => {
    usersRepository.findOne.mockResolvedValue({
      id: 'user_1',
      email: 'user@example.com',
    });
    resetTokensRepository.save.mockImplementation(async (token) => token);
    const service = new PasswordResetService(
      usersRepository as never,
      resetTokensRepository as never,
      mailService as never,
      configService as never,
    );

    await service.forgotPassword({ email: 'USER@example.com' });

    expect(resetTokensRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_1',
        usedAt: null,
        attemptCount: 0,
      }),
    );
    const saved = resetTokensRepository.save.mock.calls[0][0];
    const sentOtp = mailService.sendPasswordResetOtp.mock.calls[0][1];
    expect(saved.otpHash).not.toBe(sentOtp);
    await expect(bcrypt.compare(sentOtp, saved.otpHash)).resolves.toBe(true);
  });

  it('resets password and marks the OTP as used', async () => {
    const token = {
      id: 'token_1',
      userId: 'user_1',
      otpHash: await bcrypt.hash('123456', 4),
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
      attemptCount: 0,
      user: { id: 'user_1', passwordHash: 'old_hash' },
    } as PasswordResetToken;
    resetTokensRepository.findOne.mockResolvedValue(token);
    resetTokensRepository.save.mockImplementation(async (value) => value);
    usersRepository.save.mockImplementation(async (value) => value);
    const refreshTokensRepository = { update: jest.fn() };
    const service = new PasswordResetService(
      usersRepository as never,
      resetTokensRepository as never,
      mailService as never,
      configService as never,
      refreshTokensRepository as never,
    );

    await service.resetPassword({
      email: 'user@example.com',
      otp: '123456',
      newPassword: 'new-password-123',
    });

    expect(token.usedAt).toBeInstanceOf(Date);
    expect(usersRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user_1' }),
    );
    expect(refreshTokensRepository.update).toHaveBeenCalledWith(
      { userId: 'user_1', isRevoked: false },
      { isRevoked: true },
    );
  });
});
