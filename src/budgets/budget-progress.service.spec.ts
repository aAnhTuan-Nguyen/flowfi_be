/* eslint-disable @typescript-eslint/no-unsafe-return */
import { BudgetProgressService } from './budget-progress.service';

describe('BudgetProgressService', () => {
  const budgetsRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
  };
  const transactionsRepository = {
    createQueryBuilder: jest.fn(),
    find: jest.fn(),
  };
  const alertLogsRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn((value) => value),
  };
  const notificationDispatcher = {
    dispatch: jest.fn().mockResolvedValue({ id: 'notif_1' }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calculates budget progress from confirmed expenses', async () => {
    budgetsRepository.findOne.mockResolvedValue({
      id: 'budget_1',
      userId: 'user_1',
      tagId: 'tag_food',
      budgetAmount: '1000.00',
      warningThresholdPercent: 80,
      month: 6,
      year: 2026,
    });
    transactionsRepository.createQueryBuilder.mockReturnValue({
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ total: '850.00' }),
    });
    const service = new BudgetProgressService(
      budgetsRepository as never,
      transactionsRepository as never,
      notificationDispatcher as never,
      alertLogsRepository as never,
    );

    await expect(service.getOneProgress('user_1', 'budget_1')).resolves.toEqual(
      expect.objectContaining({
        budgetId: 'budget_1',
        spentAmount: '850.00',
        remainingAmount: '150.00',
        percentUsed: 85,
        status: 'Warning',
      }),
    );
  });

  it('creates one in-app budget alert per threshold', async () => {
    budgetsRepository.find.mockResolvedValue([
      {
        id: 'budget_1',
        userId: 'user_1',
        tagId: 'tag_food',
        budgetAmount: '1000.00',
        warningThresholdPercent: 80,
        month: 6,
        year: 2026,
        tag: { name: 'Food' },
      },
    ]);
    transactionsRepository.createQueryBuilder.mockReturnValue({
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ total: '900.00' }),
    });
    alertLogsRepository.findOne.mockResolvedValueOnce(null).mockResolvedValue({
      id: 'alert_1',
    });
    const service = new BudgetProgressService(
      budgetsRepository as never,
      transactionsRepository as never,
      notificationDispatcher as never,
      alertLogsRepository as never,
    );

    await service.checkAndCreateAlertsForTransaction({
      userId: 'user_1',
      tagId: 'tag_food',
      transactionDate: new Date('2026-06-15T00:00:00.000Z'),
    });
    await service.checkAndCreateAlertsForTransaction({
      userId: 'user_1',
      tagId: 'tag_food',
      transactionDate: new Date('2026-06-16T00:00:00.000Z'),
    });

    expect(notificationDispatcher.dispatch).toHaveBeenCalledTimes(1);
    expect(alertLogsRepository.save).toHaveBeenCalledTimes(1);
  });
  it('returns an aggregated monthly budget detail', async () => {
    budgetsRepository.find.mockResolvedValue([
      {
        id: 'overall',
        userId: 'user_1',
        tagId: null,
        budgetAmount: '8000.00',
        month: 6,
        year: 2026,
      },
      {
        id: 'food_budget',
        userId: 'user_1',
        tagId: 'food',
        tag: { name: 'Food' },
        budgetAmount: '2500.00',
        month: 6,
        year: 2026,
      },
      {
        id: 'bills_budget',
        userId: 'user_1',
        tagId: 'bills',
        tag: { name: 'Bills' },
        budgetAmount: '500.00',
        month: 6,
        year: 2026,
      },
    ]);
    transactionsRepository.find.mockResolvedValue([
      {
        tagId: 'food',
        tag: { name: 'Food' },
        walletId: 'cash',
        wallet: { name: 'Cash' },
        amount: '2200.00',
      },
      {
        tagId: 'travel',
        tag: { name: 'Travel' },
        walletId: 'cash',
        wallet: { name: 'Cash' },
        amount: '800.00',
      },
      {
        tagId: 'shopping',
        tag: { name: 'Shopping' },
        walletId: 'cash',
        wallet: { name: 'Cash' },
        amount: '200.00',
      },
    ]);
    const service = new BudgetProgressService(
      budgetsRepository as never,
      transactionsRepository as never,
      notificationDispatcher as never,
      alertLogsRepository as never,
    );

    await expect(service.getMonthlyDetails('user_1', 6, 2026)).resolves.toEqual(
      expect.objectContaining({
        targetAmount: '3000.00',
        spentAmount: '3200.00',
        remainingAmount: '-200.00',
        percentUsed: 106.67,
        transactionCount: 3,
        topCategoryName: 'Food',
        topWalletName: 'Cash',
        categories: [
          {
            tagId: 'food',
            tagName: 'Food',
            targetAmount: '2500.00',
            spentAmount: '2200.00',
            percentOfSpend: 68.75,
            variancePercent: -12,
            unbudgetedCategories: [],
          },
          {
            tagId: '__other__',
            tagName: 'Khác',
            targetAmount: '0.00',
            spentAmount: '1000.00',
            percentOfSpend: 31.25,
            variancePercent: 0,
            unbudgetedCategories: [
              {
                tagId: 'travel',
                tagName: 'Travel',
                spentAmount: '800.00',
              },
              {
                tagId: 'shopping',
                tagName: 'Shopping',
                spentAmount: '200.00',
              },
            ],
          },
          {
            tagId: 'bills',
            tagName: 'Bills',
            targetAmount: '500.00',
            spentAmount: '0.00',
            percentOfSpend: 0,
            variancePercent: -100,
            unbudgetedCategories: [],
          },
        ],
      }),
    );
  });
});
