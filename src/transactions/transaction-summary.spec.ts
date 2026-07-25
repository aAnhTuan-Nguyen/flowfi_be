import { TransactionsService } from './transactions.service';
import { TransactionStatus, TransactionType } from './transaction.enums';

describe('TransactionsService summary', () => {
  it('sums confirmed income and expenses for the requested period', async () => {
    const queryBuilder = {
      innerJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      setParameters: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({
        totalIncome: '11511111.00',
        totalExpense: '143304567.00',
      }),
    };
    const service = new TransactionsService(
      {
        createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      undefined,
      undefined,
    );

    await expect(
      service.getSummary('user_1', {
        from: '2026-07-01T00:00:00.000Z',
        to: '2026-07-31T23:59:59.999Z',
      }),
    ).resolves.toEqual({
      totalIncome: '11511111.00',
      totalExpense: '143304567.00',
    });

    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'transaction.status = :status',
      { status: TransactionStatus.Confirmed },
    );
    expect(queryBuilder.setParameters).toHaveBeenCalledWith({
      income: TransactionType.Income,
      expense: TransactionType.Expense,
    });
  });
});
