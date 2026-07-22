import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { And, IsNull, LessThan, MoreThanOrEqual, Repository } from 'typeorm';
import { addMoney, subtractMoney } from '../common/utils/money';
import { ErrorCode } from '../common/errors/error-code.enum';
import { Tag } from '../tags/entities/tag.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import {
  TransactionStatus,
  TransactionType,
} from '../transactions/transaction.enums';
import { NotificationDispatcher } from '../notifications/notification.dispatcher';
import { NotificationTemplates } from '../notifications/notification.templates';
import { NotificationType } from '../notifications/notification.enums';
import { BudgetAlertLog } from './entities/budget-alert-log.entity';
import { Budget } from './entities/budget.entity';

export type BudgetProgressStatus = 'Safe' | 'Warning' | 'Exceeded';

export interface BudgetProgress {
  budgetId: string;
  tagId: string | null;
  month: number;
  year: number;
  budgetAmount: string;
  spentAmount: string;
  remainingAmount: string;
  percentUsed: number;
  warningThresholdPercent: number;
  status: BudgetProgressStatus;
}

export interface MonthlyBudgetCategoryDetail {
  tagId: string;
  tagName: string;
  targetAmount: string;
  spentAmount: string;
  percentOfSpend: number;
  variancePercent: number;
}

export interface MonthlyBudgetDetails {
  month: number;
  year: number;
  targetAmount: string;
  spentAmount: string;
  remainingAmount: string;
  percentUsed: number;
  transactionCount: number;
  topCategoryName: string | null;
  topWalletName: string | null;
  categories: MonthlyBudgetCategoryDetail[];
}

export interface AnnualBudgetMonthSummary {
  month: number;
  targetAmount: string;
  spentAmount: string;
  percentUsed: number;
  exceededPercent: number;
}

interface BudgetAlertTarget {
  userId: string;
  tagId: string | null;
  transactionDate: Date;
}

@Injectable()
export class BudgetProgressService {
  constructor(
    @InjectRepository(Budget)
    private readonly budgetsRepository: Repository<Budget>,
    @InjectRepository(Transaction)
    private readonly transactionsRepository: Repository<Transaction>,
    private readonly notificationDispatcher: NotificationDispatcher,
    @InjectRepository(BudgetAlertLog)
    private readonly alertLogsRepository: Repository<BudgetAlertLog>,
  ) {}

  async getAllProgress(
    userId: string,
    month: number,
    year: number,
  ): Promise<BudgetProgress[]> {
    const budgets = await this.budgetsRepository.find({
      where: { userId, month, year },
      relations: { tag: true },
      order: { createdAt: 'ASC' },
    });
    return Promise.all(
      budgets.map((budget) => this.toProgress(userId, budget)),
    );
  }

  async getOneProgress(
    userId: string,
    budgetId: string,
  ): Promise<BudgetProgress> {
    const budget = await this.budgetsRepository.findOne({
      where: { id: budgetId, userId },
      relations: { tag: true },
    });
    if (!budget) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'Budget not found',
      });
    }
    return this.toProgress(userId, budget);
  }

  async getMonthlyDetails(
    userId: string,
    month: number,
    year: number,
  ): Promise<MonthlyBudgetDetails> {
    const { from, to } = this.monthRange(month, year);
    const [budgets, transactions] = await Promise.all([
      this.budgetsRepository.find({
        where: { userId, month, year },
        relations: { tag: true },
        order: { createdAt: 'ASC' },
      }),
      this.transactionsRepository.find({
        where: {
          wallet: { userId },
          status: TransactionStatus.Confirmed,
          transactionType: TransactionType.Expense,
          transactionDate: And(MoreThanOrEqual(from), LessThan(to)),
        },
        relations: { tag: true, wallet: true },
      }),
    ]);

    const categoryBudgets = budgets.filter((budget) => budget.tagId !== null);
    const targetAmount = categoryBudgets.reduce(
      (sum, budget) => addMoney(sum, budget.budgetAmount),
      '0.00',
    );
    const spentAmount = transactions.reduce(
      (sum, transaction) => addMoney(sum, transaction.amount),
      '0.00',
    );

    const categoryMap = new Map<
      string,
      { name: string; target: string; spent: string }
    >();
    for (const budget of categoryBudgets) {
      categoryMap.set(budget.tagId!, {
        name: budget.tag?.name ?? 'Other',
        target: budget.budgetAmount,
        spent: '0.00',
      });
    }
    const walletSpend = new Map<string, { name: string; spent: string }>();
    for (const transaction of transactions) {
      const category = categoryMap.get(transaction.tagId) ?? {
        name: transaction.tag?.name ?? 'Other',
        target: '0.00',
        spent: '0.00',
      };
      category.spent = addMoney(category.spent, transaction.amount);
      categoryMap.set(transaction.tagId, category);

      const wallet = walletSpend.get(transaction.walletId) ?? {
        name: transaction.wallet?.name ?? 'Wallet',
        spent: '0.00',
      };
      wallet.spent = addMoney(wallet.spent, transaction.amount);
      walletSpend.set(transaction.walletId, wallet);
    }

    const categories = [...categoryMap.entries()]
      .map(([tagId, value]) => ({
        tagId,
        tagName: value.name,
        targetAmount: value.target,
        spentAmount: value.spent,
        percentOfSpend: this.percent(value.spent, spentAmount),
        variancePercent:
          Number(value.target) <= 0
            ? 0
            : Number(
                (((Number(value.spent) - Number(value.target)) /
                  Number(value.target)) *
                  100).toFixed(2),
              ),
      }))
      .sort((left, right) => Number(right.spentAmount) - Number(left.spentAmount));
    const topWallet = [...walletSpend.values()].sort(
      (left, right) => Number(right.spent) - Number(left.spent),
    )[0];

    return {
      month,
      year,
      targetAmount,
      spentAmount,
      remainingAmount: subtractMoney(targetAmount, spentAmount),
      percentUsed: this.percent(spentAmount, targetAmount),
      transactionCount: transactions.length,
      topCategoryName: categories[0]?.tagName ?? null,
      topWalletName: topWallet?.name ?? null,
      categories,
    };
  }

  async getAnnualSummary(
    userId: string,
    year: number,
  ): Promise<AnnualBudgetMonthSummary[]> {
    const from = new Date(Date.UTC(year, 0, 1));
    const to = new Date(Date.UTC(year + 1, 0, 1));
    const [budgets, transactions] = await Promise.all([
      this.budgetsRepository.find({ where: { userId, year } }),
      this.transactionsRepository.find({
        where: {
          wallet: { userId },
          status: TransactionStatus.Confirmed,
          transactionType: TransactionType.Expense,
          transactionDate: And(MoreThanOrEqual(from), LessThan(to)),
        },
        relations: { wallet: true },
      }),
    ]);
    const targets = new Map<number, string>();
    const spending = new Map<number, string>();
    for (const budget of budgets) {
      if (budget.tagId === null) continue;
      targets.set(
        budget.month,
        addMoney(targets.get(budget.month) ?? '0.00', budget.budgetAmount),
      );
    }
    for (const transaction of transactions) {
      const month = transaction.transactionDate.getUTCMonth() + 1;
      spending.set(
        month,
        addMoney(spending.get(month) ?? '0.00', transaction.amount),
      );
    }
    return Array.from({ length: 12 }, (_, index) => {
      const month = index + 1;
      const targetAmount = targets.get(month) ?? '0.00';
      const spentAmount = spending.get(month) ?? '0.00';
      const percentUsed = this.percent(spentAmount, targetAmount);
      return {
        month,
        targetAmount,
        spentAmount,
        percentUsed,
        exceededPercent: Math.max(0, Number((percentUsed - 100).toFixed(2))),
      };
    });
  }

  async checkAndCreateAlertsForTransaction(
    target: BudgetAlertTarget,
  ): Promise<void> {
    const month = target.transactionDate.getUTCMonth() + 1;
    const year = target.transactionDate.getUTCFullYear();
    const where = target.tagId
      ? [
          { userId: target.userId, month, year, tagId: IsNull() },
          { userId: target.userId, month, year, tagId: target.tagId },
        ]
      : [{ userId: target.userId, month, year, tagId: IsNull() }];
    const budgets = await this.budgetsRepository.find({
      where,
      relations: { tag: true },
    });

    for (const budget of budgets) {
      const progress = await this.toProgress(target.userId, budget);
      if (progress.status === 'Safe') continue;

      const thresholdPercent =
        progress.percentUsed >= 100 ? 100 : budget.warningThresholdPercent;
      const existing = await this.alertLogsRepository.findOne({
        where: {
          userId: target.userId,
          budgetId: budget.id,
          month,
          year,
          thresholdPercent,
        },
      });
      if (existing) continue;

      const template = NotificationTemplates.budgetWarning({
        tagName: budget.tag?.name ?? null,
        percentUsed: progress.percentUsed,
        remainingAmount: progress.remainingAmount,
      });
      await this.notificationDispatcher.dispatch({
        userId: target.userId,
        type: NotificationType.BudgetWarning,
        title: template.title,
        content: template.content,
        metadata: {
          budgetId: budget.id,
          tagId: budget.tagId,
          tagName: budget.tag?.name ?? null,
          month,
          year,
          thresholdPercent,
          percentUsed: progress.percentUsed,
        },
      });
      await this.alertLogsRepository.save(
        this.alertLogsRepository.create({
          userId: target.userId,
          budgetId: budget.id,
          month,
          year,
          thresholdPercent,
        }),
      );
    }
  }

  private async toProgress(
    userId: string,
    budget: Budget,
  ): Promise<BudgetProgress> {
    const spentAmount = await this.sumConfirmedExpenses(userId, budget);
    const percentUsed = this.percent(spentAmount, budget.budgetAmount);
    const status: BudgetProgressStatus =
      percentUsed >= 100
        ? 'Exceeded'
        : percentUsed >= budget.warningThresholdPercent
          ? 'Warning'
          : 'Safe';

    return {
      budgetId: budget.id,
      tagId: budget.tagId,
      month: budget.month,
      year: budget.year,
      budgetAmount: budget.budgetAmount,
      spentAmount,
      remainingAmount: subtractMoney(budget.budgetAmount, spentAmount),
      percentUsed,
      warningThresholdPercent: budget.warningThresholdPercent,
      status,
    };
  }

  private async sumConfirmedExpenses(
    userId: string,
    budget: Budget,
  ): Promise<string> {
    const { from, to } = this.monthRange(budget.month, budget.year);
    const query = this.transactionsRepository
      .createQueryBuilder('transaction')
      .innerJoin('transaction.wallet', 'wallet')
      .where('wallet.user_id = :userId', { userId })
      .andWhere('transaction.status = :status', {
        status: TransactionStatus.Confirmed,
      })
      .andWhere('transaction.transaction_type = :transactionType', {
        transactionType: TransactionType.Expense,
      })
      .andWhere('transaction.transaction_date >= :from', { from })
      .andWhere('transaction.transaction_date < :to', { to })
      .select('COALESCE(SUM(transaction.amount), 0)', 'total');

    if (budget.tagId) {
      query.andWhere('transaction.tag_id = :tagId', { tagId: budget.tagId });
    }

    const row = await query.getRawOne<{ total: string }>();
    return row?.total ?? '0.00';
  }

  private monthRange(month: number, year: number) {
    const from = new Date(Date.UTC(year, month - 1, 1));
    const to = new Date(Date.UTC(year, month, 1));
    return { from, to };
  }

  private percent(spentAmount: string, budgetAmount: string): number {
    const budget = Number(budgetAmount);
    if (!Number.isFinite(budget) || budget <= 0) return 0;
    return Number(((Number(spentAmount) / budget) * 100).toFixed(2));
  }
}