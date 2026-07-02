/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await */
import { SyncService } from './sync.service';
import { SyncAction, SyncStatus } from './sync.enums';

describe('SyncService device registration', () => {
  it('updates an existing device for the same user and deviceId', async () => {
    const existingDevice = {
      id: 'device_row_1',
      userId: 'user_1',
      deviceId: 'device-1',
      deviceName: 'Old phone',
      platform: null,
      pushToken: null,
      lastSyncedAt: null,
    };
    const devicesRepository = {
      findOne: jest.fn().mockResolvedValue(existingDevice),
      create: jest.fn(),
      save: jest.fn(async (value) => value),
    };
    const service = new SyncService(
      devicesRepository as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { get: jest.fn().mockReturnValue(100) } as never,
    );

    const result = await service.registerDevice('user_1', {
      deviceId: 'device-1',
      deviceName: 'Current phone',
      platform: 'android',
    });

    expect(devicesRepository.findOne).toHaveBeenCalledWith({
      where: { userId: 'user_1', deviceId: 'device-1' },
    });
    expect(devicesRepository.create).not.toHaveBeenCalled();
    expect(devicesRepository.save).toHaveBeenCalledTimes(1);
    expect(result).toEqual(
      expect.objectContaining({
        id: 'device_row_1',
        deviceId: 'device-1',
        deviceName: 'Current phone',
        platform: 'android',
      }),
    );
    expect(result.lastSyncedAt).toEqual(expect.any(Date));
  });
});

function createServiceForTransactionPush(options?: {
  existingTransaction?: Record<string, unknown> | null;
  transactionsService?: Record<string, jest.Mock>;
  manager?: Record<string, jest.Mock>;
}) {
  const manager = options?.manager ?? {
    save: jest.fn(async (value) => value),
    create: jest.fn((_entity, value) => value),
  };
  const dataSource = {
    transaction: jest.fn(async (callback) => callback(manager)),
  };
  const queueRepository = {
    create: jest.fn((_value) => _value),
  };
  const transactionsRepository = {
    findOne: jest
      .fn()
      .mockResolvedValueOnce(options?.existingTransaction ?? null)
      .mockResolvedValueOnce(
        options?.existingTransaction
          ? { ...options.existingTransaction, wallet: { userId: 'user_1' } }
          : null,
      ),
  };
  const transactionsService = options?.transactionsService ?? {
    create: jest.fn().mockResolvedValue({
      id: 'tx_1',
      clientId: 'client_tx_1',
      version: 1,
    }),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const service = new SyncService(
    {} as never,
    queueRepository as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    transactionsRepository as never,
    dataSource as never,
    { get: jest.fn().mockReturnValue(100) } as never,
    transactionsService as never,
  );

  return { service, dataSource, manager, transactionsService };
}

describe('SyncService transaction push', () => {
  it('routes transaction creates through TransactionsService business logic', async () => {
    const { service, transactionsService } = createServiceForTransactionPush();

    await service.push('user_1', {
      items: [
        {
          entityName: 'transactions',
          action: SyncAction.Create,
          clientId: 'client_tx_1',
          payload: {
            walletId: 'wallet_1',
            tagId: 'tag_1',
            title: 'Coffee',
            amount: '50000.00',
            transactionType: 'Expense',
            transactionDate: '2026-06-10T00:00:00.000Z',
          },
        },
      ],
    });

    expect(transactionsService.create).toHaveBeenCalledWith(
      'user_1',
      expect.objectContaining({
        title: 'Coffee',
        clientId: 'client_tx_1',
      }),
    );
  });

  it('records push queue entries with the request deviceId', async () => {
    const { service, manager } = createServiceForTransactionPush();

    await service.push('user_1', {
      deviceId: 'device-1',
      items: [
        {
          entityName: 'transactions',
          action: SyncAction.Create,
          clientId: 'client_tx_1',
          payload: {
            walletId: 'wallet_1',
            tagId: 'tag_1',
            title: 'Coffee',
            amount: '50000.00',
            transactionType: 'Expense',
            transactionDate: '2026-06-10T00:00:00.000Z',
          },
        },
      ],
    });

    expect(manager.create).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ deviceId: 'device-1' }),
    );
  });

  it('does not create a duplicate transaction for an existing clientId', async () => {
    const { service, transactionsService } = createServiceForTransactionPush({
      existingTransaction: {
        id: 'tx_1',
        clientId: 'client_tx_1',
        version: 3,
      },
    });

    const result = await service.push('user_1', {
      deviceId: 'device-1',
      items: [
        {
          entityName: 'transactions',
          action: SyncAction.Create,
          clientId: 'client_tx_1',
          payload: {
            walletId: 'wallet_1',
            tagId: 'tag_1',
            title: 'Coffee',
            amount: '50000.00',
            transactionType: 'Expense',
            transactionDate: '2026-06-10T00:00:00.000Z',
          },
        },
      ],
    });

    expect(transactionsService.create).not.toHaveBeenCalled();
    expect(result.results).toEqual([
      expect.objectContaining({
        entityName: 'transactions',
        clientId: 'client_tx_1',
        entityId: 'tx_1',
        status: SyncStatus.Synced,
        version: 3,
      }),
    ]);
  });
});

describe('SyncService pull', () => {
  it('returns soft-deleted records with stable sync metadata', async () => {
    const deletedAt = new Date('2026-06-11T00:00:00.000Z');
    const updatedAt = new Date('2026-06-10T00:00:00.000Z');
    const wallet = {
      id: 'wallet_1',
      userId: 'user_1',
      clientId: 'client_wallet_1',
      version: 2,
      updatedAt,
      deletedAt,
    };
    const queryBuilder = {
      withDeleted: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    const walletsRepository = { find: jest.fn().mockResolvedValue([wallet]) };
    const service = new SyncService(
      {} as never,
      {} as never,
      {} as never,
      walletsRepository as never,
      { find: jest.fn().mockResolvedValue([]) } as never,
      { find: jest.fn().mockResolvedValue([]) } as never,
      { find: jest.fn().mockResolvedValue([]) } as never,
      { createQueryBuilder: jest.fn().mockReturnValue(queryBuilder) } as never,
      {} as never,
      { get: jest.fn().mockReturnValue(100) } as never,
    );

    const result = await service.pull('user_1', {
      since: '2026-06-01T00:00:00.000Z',
    });

    expect(result.serverTime).toEqual(expect.any(String));
    expect(walletsRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({ withDeleted: true }),
    );
    expect(result.changes.wallets).toEqual([
      expect.objectContaining({
        id: 'wallet_1',
        clientId: 'client_wallet_1',
        version: 2,
        updatedAt: '2026-06-10T00:00:00.000Z',
        deletedAt: '2026-06-11T00:00:00.000Z',
      }),
    ]);
  });
});
