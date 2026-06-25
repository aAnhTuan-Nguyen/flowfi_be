import { TransactionsService } from './transactions.service';
import { TransactionInputMethod, TransactionStatus } from './transaction.enums';

describe('TransactionsService filters', () => {
  it('applies keyword, status, and inputMethod filters to list queries', async () => {
    const queryBuilder = {
      innerJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    const service = new TransactionsService(
      {
        createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      } as never,
      {
        find: jest.fn().mockResolvedValue([{ id: 'wallet_1' }]),
      } as never,
      {} as never,
      {} as never,
    );

    await service.findAll('user_1', {
      page: 1,
      limit: 20,
      keyword: 'coffee',
      status: TransactionStatus.Confirmed,
      inputMethod: TransactionInputMethod.Manual,
    });

    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('ILIKE'),
      { keyword: '%coffee%' },
    );
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'transaction.status = :status',
      { status: TransactionStatus.Confirmed },
    );
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'transaction.input_method = :inputMethod',
      { inputMethod: TransactionInputMethod.Manual },
    );
  });
});
