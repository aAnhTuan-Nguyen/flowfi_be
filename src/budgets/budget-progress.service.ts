import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { subtractMoney } from '../common/utils/money';
import { ErrorCode } from '../common/errors/error-code.enum';
import { Notification } from '../notifications/entities/notification.entity';
import { NotificationType } from '../notifications/notification.enums';
import { Transaction } from '../transactions/entities/transaction.entity';
import {
  TransactionStatus,
  TransactionType,
} from '../transactions/transaction.enums';
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
    @InjectRepository(Notification)
    private readonly notificationsRepository: Repository<Notification>,
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

      await this.notificationsRepository.save(
        this.notificationsRepository.create({
          userId: target.userId,
          title: thresholdPercent >= 100 ? 'Budget exceeded' : 'Budget warning',
          content: `${budget.tag?.name ?? 'Monthly budget'} reached ${progress.percentUsed}% of its limit.`,
          notificationType: NotificationType.BudgetWarning,
          metadata: {
            budgetId: budget.id,
            tagId: budget.tagId,
            month,
            year,
            thresholdPercent,
            percentUsed: progress.percentUsed,
          },
        }),
      );
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
