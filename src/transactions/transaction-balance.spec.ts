import { transactionBalanceEffect } from './transaction-balance';
import { TransactionStatus, TransactionType } from './transaction.enums';

describe('transactionBalanceEffect', () => {
  it('applies confirmed income and expense, but ignores drafts', () => {
    expect(
      transactionBalanceEffect(
        '100.00',
        TransactionType.Income,
        TransactionStatus.Confirmed,
      ),
    ).toBe('100.00');
    expect(
      transactionBalanceEffect(
        '25.50',
        TransactionType.Expense,
        TransactionStatus.Confirmed,
      ),
    ).toBe('-25.50');
    expect(
      transactionBalanceEffect(
        '25.50',
        TransactionType.Expense,
        TransactionStatus.Draft,
      ),
    ).toBe('0.00');
  });
});
