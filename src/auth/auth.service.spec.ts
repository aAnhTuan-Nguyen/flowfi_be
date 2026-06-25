/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  it('changes password, revokes refresh tokens, and issues new tokens', async () => {
    const user = {
      id: 'user_1',
      email: 'user@example.com',
      passwordHash: await bcrypt.hash('old-password', 4),
      fullName: null,
      avatarUrl: null,
      dateOfBirth: null,
      currencyCode: 'VND',
      monthlyBudgetLimit: null,
      authProvider: 'Local',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: null,
      deletedAt: null,
    };
    const usersRepository = {
      findOne: jest.fn().mockResolvedValue(user),
      save: jest.fn().mockImplementation((value) => value),
    };
    const refreshTokensRepository = {
      update: jest.fn(),
      save: jest.fn().mockImplementation((value) => value),
      create: jest.fn().mockImplementation((value) => value),
    };
    const jwtService = {
      signAsync: jest
        .fn()
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token'),
    };
    const configService = {
      get: jest.fn((key: string) => {
        const values: Record<string, string> = {
          jwtAccessSecret: 'access-secret',
          jwtAccessExpiresIn: '15m',
          jwtRefreshSecret: 'refresh-secret',
          jwtRefreshExpiresIn: '30d',
        };
        return values[key];
      }),
    };
    const service = new AuthService(
      usersRepository as never,
      refreshTokensRepository as never,
      jwtService as never,
      configService as never,
    );

    const result = await service.changePassword(
      'user_1',
      'old-password',
      'new-password',
    );

    expect(result.accessToken).toBe('new-access-token');
    expect(result.refreshToken).toBe('new-refresh-token');
    expect(refreshTokensRepository.update).toHaveBeenCalledWith(
      { userId: 'user_1', isRevoked: false },
      { isRevoked: true },
    );
    await expect(
      bcrypt.compare(
        'new-password',
        usersRepository.save.mock.calls[0][0].passwordHash,
      ),
    ).resolves.toBe(true);
  });
});
