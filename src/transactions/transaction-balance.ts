import { TransactionStatus, TransactionType } from './transaction.enums';
import { negateMoney } from '../common/utils/money';

export function transactionBalanceEffect(
  amount: string,
  transactionType: TransactionType,
  status: TransactionStatus,
): string {
  if (status !== TransactionStatus.Confirmed) {
    return '0.00';
  }

  return transactionType === TransactionType.Income
    ? amount
    : negateMoney(amount);
}
