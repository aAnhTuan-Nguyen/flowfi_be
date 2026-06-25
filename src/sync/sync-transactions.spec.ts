/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await */
import { SyncService } from './sync.service';
import { SyncAction } from './sync.enums';

describe('SyncService transaction push', () => {
  it('routes transaction creates through TransactionsService business logic', async () => {
    const dataSource = {
      transaction: jest.fn(async (callback) =>
        callback({
          save: jest.fn(async (value) => value),
          create: jest.fn((_entity, value) => value),
        }),
      ),
    };
    const queueRepository = {
      create: jest.fn((_value) => _value),
    };
    const transactionsService = {
      create: jest.fn().mockResolvedValue({
        id: 'tx_1',
        clientId: 'client_tx_1',
        version: 1,
      }),
    };
    const service = new SyncService(
      {} as never,
      queueRepository as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { findOne: jest.fn().mockResolvedValue(null) } as never,
      dataSource as never,
      { get: jest.fn().mockReturnValue(100) } as never,
      transactionsService as never,
    );

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
});
