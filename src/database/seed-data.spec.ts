import {
  AiRequestStatus,
  AiRequestType,
} from '../ai-processing/ai-processing.enums';
import { GoalStatus } from '../goals/goal.enums';
import { NotificationType } from '../notifications/notification.enums';
import { TagType } from '../tags/tag.enums';
import {
  TransactionStatus,
  TransactionType,
} from '../transactions/transaction.enums';
import { WalletType } from '../wallets/wallet.enums';
import {
  DEMO_USER_EMAIL,
  DEMO_USER_PASSWORD,
  buildSeedData,
} from './seed-data';

describe('buildSeedData', () => {
  const referenceDate = new Date(Date.UTC(2026, 5, 30, 12, 0, 0));
  const seed = buildSeedData(referenceDate);

  it('builds deterministic demo credentials and user profile', () => {
    expect(DEMO_USER_EMAIL).toBe('demo@flowfi.test');
    expect(DEMO_USER_PASSWORD).toBe('Test@123456');
    expect(seed.user).toMatchObject({
      email: DEMO_USER_EMAIL,
      fullName: 'FlowFi Demo User',
      currencyCode: 'VND',
      monthlyBudgetLimit: '12000000.00',
    });
  });

  it('includes enough records for the main UI surfaces', () => {
    expect(seed.wallets).toHaveLength(5);
    expect(
      seed.tags.filter((tag) => tag.type === TagType.Expense).length,
    ).toBeGreaterThanOrEqual(8);
    expect(
      seed.tags.filter((tag) => tag.type === TagType.Income).length,
    ).toBeGreaterThanOrEqual(5);
    expect(seed.transactions.length).toBeGreaterThanOrEqual(60);
    expect(seed.budgets.length).toBeGreaterThanOrEqual(8);
    expect(seed.goals).toHaveLength(5);
    expect(seed.notifications.length).toBeGreaterThanOrEqual(10);
    expect(seed.aiRequests).toHaveLength(5);
  });

  it('covers current-month chart data with confirmed income and expense transactions', () => {
    const currentMonthTransactions = seed.transactions.filter(
      (transaction) =>
        transaction.transactionDate.getUTCFullYear() === 2026 &&
        transaction.transactionDate.getUTCMonth() === 5 &&
        transaction.status === TransactionStatus.Confirmed,
    );

    expect(currentMonthTransactions.length).toBeGreaterThanOrEqual(20);
    expect(
      currentMonthTransactions.some(
        (transaction) => transaction.transactionType === TransactionType.Income,
      ),
    ).toBe(true);
    expect(
      currentMonthTransactions.some(
        (transaction) =>
          transaction.transactionType === TransactionType.Expense,
      ),
    ).toBe(true);
  });

  it('uses only valid enum values', () => {
    for (const wallet of seed.wallets) {
      expect(Object.values(WalletType)).toContain(wallet.walletType);
    }
    for (const tag of seed.tags) {
      expect(Object.values(TagType)).toContain(tag.type);
    }
    for (const transaction of seed.transactions) {
      expect(Object.values(TransactionType)).toContain(
        transaction.transactionType,
      );
      expect(Object.values(TransactionStatus)).toContain(transaction.status);
    }
    for (const goal of seed.goals) {
      expect(Object.values(GoalStatus)).toContain(goal.status);
    }
    for (const notification of seed.notifications) {
      expect(Object.values(NotificationType)).toContain(
        notification.notificationType,
      );
    }
  });

  it('includes varied budget progress states for the current month', () => {
    const currentBudgets = seed.budgets.filter(
      (budget) => budget.month === 6 && budget.year === 2026,
    );

    expect(
      currentBudgets.some((budget) => budget.expectedStatus === 'Safe'),
    ).toBe(true);
    expect(
      currentBudgets.some((budget) => budget.expectedStatus === 'Warning'),
    ).toBe(true);
    expect(
      currentBudgets.some((budget) => budget.expectedStatus === 'Exceeded'),
    ).toBe(true);
  });

  it('creates results for completed AI processing requests only', () => {
    const completed = seed.aiRequests.filter(
      (request) => request.status === AiRequestStatus.Completed,
    );
    const incomplete = seed.aiRequests.filter(
      (request) => request.status !== AiRequestStatus.Completed,
    );

    expect(completed.length).toBeGreaterThanOrEqual(2);
    expect(
      completed.every((request) =>
        seed.aiResults.some((result) => result.requestKey === request.key),
      ),
    ).toBe(true);
    expect(
      incomplete.every(
        (request) =>
          request.requestType === AiRequestType.SpendingAnalysis ||
          !seed.aiResults.some((result) => result.requestKey === request.key),
      ),
    ).toBe(true);
  });
});
