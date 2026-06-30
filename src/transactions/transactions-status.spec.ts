/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await */
import { TransactionsService } from './transactions.service';
import {
  TransactionInputMethod,
  TransactionStatus,
  TransactionType,
} from './transaction.enums';

function queryBuilderReturning(value: unknown) {
  return {
    innerJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(value),
  };
}

function tagQueryBuilderReturning(value: unknown) {
  return {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(value),
  };
}

describe('TransactionsService status transitions', () => {
  it('keeps draft transactions out of balance while manual creates remain confirmed', async () => {
    const wallet = { id: 'wallet_1', userId: 'user_1', balance: '100000.00' };
    const dataSource = {
      transaction: jest.fn(async (callback) =>
        callback({
          create: jest.fn((_entity, value) => value),
          save: jest.fn(async (value) => value),
        }),
      ),
    };
    const service = new TransactionsService(
      {} as never,
      {
        findOne: jest.fn().mockResolvedValue(wallet),
        find: jest.fn(),
      } as never,
      {
        createQueryBuilder: jest
          .fn()
          .mockReturnValue(tagQueryBuilderReturning({ id: 'tag_food' })),
      } as never,
      dataSource as never,
    );

    const draft = await service.create('user_1', {
      walletId: 'wallet_1',
      tagId: 'tag_food',
      title: 'Draft coffee',
      amount: '50000.00',
      transactionType: TransactionType.Expense,
      transactionDate: '2026-06-10T00:00:00.000Z',
      inputMethod: TransactionInputMethod.OCR,
      status: TransactionStatus.Draft,
    });

    expect(draft.status).toBe(TransactionStatus.Draft);
    expect(wallet.balance).toBe('100000.00');

    const manual = await service.create('user_1', {
      walletId: 'wallet_1',
      tagId: 'tag_food',
      title: 'Manual coffee',
      amount: '50000.00',
      transactionType: TransactionType.Expense,
      transactionDate: '2026-06-10T00:00:00.000Z',
    });

    expect(manual.status).toBe(TransactionStatus.Confirmed);
    expect(manual.inputMethod).toBe(TransactionInputMethod.Manual);
    expect(wallet.balance).toBe('50000.00');
  });

  it('does not allow regular updates to change status or input method', async () => {
    const transaction = {
      id: 'tx_1',
      walletId: 'wallet_1',
      tagId: 'tag_food',
      title: 'Coffee',
      description: null,
      amount: '50000.00',
      transactionType: TransactionType.Expense,
      transactionDate: new Date('2026-06-10T00:00:00.000Z'),
      status: TransactionStatus.Draft,
      inputMethod: TransactionInputMethod.OCR,
      merchantName: null,
      clientId: null,
      version: 1,
    };
    const wallet = { id: 'wallet_1', userId: 'user_1', balance: '100000.00' };
    const dataSource = {
      transaction: jest.fn(async (callback) =>
        callback({
          save: jest.fn(async (value) => value),
        }),
      ),
    };
    const service = new TransactionsService(
      {
        createQueryBuilder: jest
          .fn()
          .mockReturnValue(queryBuilderReturning(transaction)),
      } as never,
      {
        findOne: jest.fn().mockResolvedValue(wallet),
        find: jest.fn(),
      } as never,
      {} as never,
      dataSource as never,
    );

    const updated = await service.update('user_1', 'tx_1', {
      title: 'Edited coffee',
      status: TransactionStatus.Confirmed,
      inputMethod: TransactionInputMethod.Manual,
    });

    expect(updated).toEqual(
      expect.objectContaining({
        title: 'Edited coffee',
        status: TransactionStatus.Draft,
        inputMethod: TransactionInputMethod.OCR,
      }),
    );
    expect(wallet.balance).toBe('100000.00');
  });

  it('confirms a draft transaction and applies its balance effect once', async () => {
    const transaction = {
      id: 'tx_1',
      walletId: 'wallet_1',
      tagId: 'tag_food',
      title: 'Coffee',
      amount: '50000.00',
      transactionType: TransactionType.Expense,
      transactionDate: new Date('2026-06-10T00:00:00.000Z'),
      status: TransactionStatus.Draft,
      inputMethod: TransactionInputMethod.OCR,
      version: 1,
    };
    const wallet = { id: 'wallet_1', userId: 'user_1', balance: '100000.00' };
    const dataSource = {
      transaction: jest.fn(async (callback) =>
        callback({
          save: jest.fn(async (value) => value),
        }),
      ),
    };
    const budgetProgressService = {
      checkAndCreateAlertsForTransaction: jest.fn(),
    };
    const service = new TransactionsService(
      {
        createQueryBuilder: jest
          .fn()
          .mockReturnValue(queryBuilderReturning(transaction)),
      } as never,
      {
        findOne: jest.fn().mockResolvedValue(wallet),
        find: jest.fn(),
      } as never,
      {} as never,
      dataSource as never,
      budgetProgressService as never,
    );

    const confirmed = await service.confirm('user_1', 'tx_1');

    expect(confirmed).toEqual(
      expect.objectContaining({
        status: TransactionStatus.Confirmed,
        version: 2,
      }),
    );
    expect(wallet.balance).toBe('50000.00');
    expect(
      budgetProgressService.checkAndCreateAlertsForTransaction,
    ).toHaveBeenCalledTimes(1);
  });

  it('returns an already confirmed transaction without applying side effects again', async () => {
    const transaction = {
      id: 'tx_1',
      walletId: 'wallet_1',
      tagId: 'tag_food',
      title: 'Coffee',
      amount: '50000.00',
      transactionType: TransactionType.Expense,
      transactionDate: new Date('2026-06-10T00:00:00.000Z'),
      status: TransactionStatus.Confirmed,
      inputMethod: TransactionInputMethod.OCR,
      version: 2,
    };
    const dataSource = {
      transaction: jest.fn(async (callback) =>
        callback({
          save: jest.fn(async (value) => value),
        }),
      ),
    };
    const budgetProgressService = {
      checkAndCreateAlertsForTransaction: jest.fn(),
    };
    const service = new TransactionsService(
      {
        createQueryBuilder: jest
          .fn()
          .mockReturnValue(queryBuilderReturning(transaction)),
      } as never,
      {
        findOne: jest.fn(),
        find: jest.fn(),
      } as never,
      {} as never,
      dataSource as never,
      budgetProgressService as never,
    );

    await expect(service.confirm('user_1', 'tx_1')).resolves.toBe(transaction);

    expect(dataSource.transaction).not.toHaveBeenCalled();
    expect(
      budgetProgressService.checkAndCreateAlertsForTransaction,
    ).not.toHaveBeenCalled();
  });
});
