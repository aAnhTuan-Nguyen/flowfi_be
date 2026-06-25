/* eslint-disable @typescript-eslint/no-unsafe-return */
import { BudgetProgressService } from './budget-progress.service';

describe('BudgetProgressService', () => {
  const budgetsRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
  };
  const transactionsRepository = {
    createQueryBuilder: jest.fn(),
  };
  const notificationsRepository = {
    save: jest.fn(),
    create: jest.fn((value) => value),
  };
  const alertLogsRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn((value) => value),
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
      notificationsRepository as never,
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
      notificationsRepository as never,
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

    expect(notificationsRepository.save).toHaveBeenCalledTimes(1);
    expect(alertLogsRepository.save).toHaveBeenCalledTimes(1);
  });
});
