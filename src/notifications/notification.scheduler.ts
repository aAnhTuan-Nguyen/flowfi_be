import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppConfig } from '../config/env.validation';
import {
  compareMoney,
  subtractMoney,
} from '../common/utils/money';
import { User } from '../users/entities/user.entity';
import { Tag } from '../tags/entities/tag.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import {
  TransactionStatus,
  TransactionType,
} from '../transactions/transaction.enums';
import { NotificationDispatcher } from './notification.dispatcher';
import { NotificationPreferencesService } from './notification-preferences.service';
import { NotificationTemplates } from './notification.templates';
import { NotificationType } from './notification.enums';

interface UserDailyReminderTarget {
  userId: string;
  timezone: string;
  hour: number;
}

interface TagSpendSummary {
  tagId: string;
  tagName: string;
  totalSpent: string;
}

const FOOD_DELIVERY_KEYWORDS = [
  'đồ ăn',
  'do an',
  'food',
  'ăn uống',
  'an uong',
  'gọi đồ',
  'delivery',
  'grab food',
  'shopee food',
  'baemin',
  'now',
];

@Injectable()
export class NotificationScheduler {
  private readonly logger = new Logger(NotificationScheduler.name);

  constructor(
    private readonly configService: ConfigService<AppConfig>,
    private readonly dispatcher: NotificationDispatcher,
    private readonly preferencesService: NotificationPreferencesService,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Transaction)
    private readonly transactionsRepository: Repository<Transaction>,
    @InjectRepository(Tag)
    private readonly tagsRepository: Repository<Tag>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_1AM, { name: 'notification-bootstrap' })
  async bootstrap(): Promise<void> {
    this.logger.log('Notification scheduler bootstrapped.');
  }

  @Cron('0 13 * * *', { name: 'notification-daily-reminder' })
  async runDailyReminder(): Promise<void> {
    const cronFromEnv = this.configService.get(
      'notificationDailyReminderCron',
      { infer: true },
    );
    this.logger.log(
      `Running daily reminder job (env cron=${cronFromEnv ?? 'default 0 13 * * *'}).`,
    );
    const targets = await this.collectDailyReminderTargets();
    for (const target of targets) {
      const hasAny = await this.hasConfirmedTransactionToday(
        target.userId,
        target.timezone,
      );
      if (hasAny) continue;

      const tpl = NotificationTemplates.dailyReminder({
        hasTransactionsToday: false,
      });
      await this.dispatcher.dispatch({
        userId: target.userId,
        type: NotificationType.DailyReminder,
        title: tpl.title,
        content: tpl.content,
        metadata: { timezone: target.timezone, hour: target.hour },
      });
    }
  }

  @Cron('0 1 * * 1', { name: 'notification-weekly-summary' })
  async runWeeklySummary(): Promise<void> {
    this.logger.log('Running weekly summary job.');
    const users = await this.usersRepository.find({ select: { id: true } });
    for (const user of users) {
      const enabled = await this.preferencesService.isEnabled(
        user.id,
        'weeklySummary',
      );
      if (!enabled) continue;

      const { thisWeek, lastWeek } = await this.sumIncomeExpenseByWeek(user.id);
      const deltaAmount = subtractMoney(lastWeek.expense, thisWeek.expense);
      const direction = this.deltaDirection(thisWeek.expense, lastWeek.expense);

      const tpl = NotificationTemplates.weeklySummary({
        period: 'week',
        incomeAmount: thisWeek.income,
        expenseAmount: thisWeek.expense,
        deltaAmount,
        deltaDirection: direction,
      });
      await this.dispatcher.dispatch({
        userId: user.id,
        type: NotificationType.WeeklySummary,
        title: tpl.title,
        content: tpl.content,
        metadata: {
          thisWeek,
          lastWeek,
          deltaAmount,
          deltaDirection: direction,
        },
      });
    }
  }

  @Cron('0 2 1 * *', { name: 'notification-monthly-summary' })
  async runMonthlySummary(): Promise<void> {
    this.logger.log('Running monthly summary job.');
    const users = await this.usersRepository.find({ select: { id: true } });
    const now = new Date();
    for (const user of users) {
      const enabled = await this.preferencesService.isEnabled(
        user.id,
        'monthlySummary',
      );
      if (!enabled) continue;

      const { thisMonth, lastMonth } = await this.sumIncomeExpenseByMonth(
        user.id,
        now,
      );
      const deltaAmount = subtractMoney(
        lastMonth.expense,
        thisMonth.expense,
      );
      const direction = this.deltaDirection(thisMonth.expense, lastMonth.expense);

      const tpl = NotificationTemplates.monthlySummary({
        period: 'month',
        incomeAmount: thisMonth.income,
        expenseAmount: thisMonth.expense,
        deltaAmount,
        deltaDirection: direction,
      });
      await this.dispatcher.dispatch({
        userId: user.id,
        type: NotificationType.MonthlySummary,
        title: tpl.title,
        content: tpl.content,
        metadata: {
          thisMonth,
          lastMonth,
          deltaAmount,
          deltaDirection: direction,
        },
      });
    }
  }

  @Cron('0 3 * * 1', { name: 'notification-savings-tip' })
  async runSavingsTip(): Promise<void> {
    this.logger.log('Running savings tip job.');
    const users = await this.usersRepository.find({ select: { id: true } });
    const now = new Date();
    for (const user of users) {
      const enabled = await this.preferencesService.isEnabled(
        user.id,
        'savingsTip',
      );
      if (!enabled) continue;

      const top = await this.topFoodDeliverySpend(user.id, now);
      if (!top || compareMoney(top.totalSpent, '0') === 0) continue;

      const potentialSaving = this.computePotentialSaving(top.totalSpent);
      const currencyCode = await this.getUserCurrencyCode(user.id);
      const tpl = NotificationTemplates.savingsTip({
        tagName: top.tagName,
        amountSpent: top.totalSpent,
        potentialSaving,
        currencyCode,
      });
      await this.dispatcher.dispatch({
        userId: user.id,
        type: NotificationType.SavingsTip,
        title: tpl.title,
        content: tpl.content,
        metadata: {
          tagId: top.tagId,
          tagName: top.tagName,
          amountSpent: top.totalSpent,
          potentialSaving,
        },
      });
    }
  }

  private async collectDailyReminderTargets(): Promise<UserDailyReminderTarget[]> {
    const prefs = await this.collectDailyReminderRows();
    return prefs.map((pref) => ({
      userId: pref.user_id,
      timezone: pref.timezone,
      hour: pref.daily_reminder_hour,
    }));
  }

  private async collectDailyReminderRows(): Promise<
    Array<{
      user_id: string;
      daily_reminder_hour: number;
      timezone: string;
    }>
  > {
    return this.usersRepository.manager.query(
      `SELECT user_id, daily_reminder_hour, timezone
         FROM notification_preferences
        WHERE daily_reminder = true`,
    );
  }

  private async hasConfirmedTransactionToday(
    userId: string,
    timezone: string,
  ): Promise<boolean> {
    const range = this.localDayRange(new Date(), timezone);
    const count = await this.transactionsRepository
      .createQueryBuilder('transaction')
      .innerJoin('transaction.wallet', 'wallet')
      .where('wallet.user_id = :userId', { userId })
      .andWhere('transaction.status = :status', {
        status: TransactionStatus.Confirmed,
      })
      .andWhere('transaction.transaction_date >= :from', {
        from: range.from,
      })
      .andWhere('transaction.transaction_date < :to', { to: range.to })
      .getCount();
    return count > 0;
  }

  private localDayRange(now: Date, timezone: string): { from: Date; to: Date } {
    try {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone || 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      const parts = formatter.formatToParts(now);
      const get = (type: string) =>
        parts.find((part) => part.type === type)?.value ?? '';
      const dayString = `${get('year')}-${get('month')}-${get('day')}`;
      const offset = this.timezoneOffset(now, timezone);
      const from = new Date(`${dayString}T00:00:00Z`);
      from.setMinutes(from.getMinutes() - offset);
      const to = new Date(from.getTime() + 24 * 60 * 60 * 1000);
      return { from, to };
    } catch {
      const from = new Date(now);
      from.setUTCHours(0, 0, 0, 0);
      const to = new Date(from.getTime() + 24 * 60 * 60 * 1000);
      return { from, to };
    }
  }

  private timezoneOffset(now: Date, timezone: string): number {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone || 'Asia/Ho_Chi_Minh',
        timeZoneName: 'shortOffset',
      });
      const parts = formatter.formatToParts(now);
      const offsetPart = parts.find(
        (part) => part.type === 'timeZoneName',
      )?.value;
      if (!offsetPart) return 0;
      const match = offsetPart.match(/GMT([+-]\d{1,2})(?::(\d{2}))?/);
      if (!match) return 0;
      const hours = Number(match[1]);
      const minutes = Number(match[2] ?? '0');
      const sign = hours < 0 ? -1 : 1;
      return sign * (Math.abs(hours) * 60 + minutes);
    } catch {
      return 0;
    }
  }

  private async sumIncomeExpenseByWeek(userId: string): Promise<{
    thisWeek: { income: string; expense: string };
    lastWeek: { income: string; expense: string };
  }> {
    const now = new Date();
    const { from: thisFrom, to: thisTo } = this.lastNDayRange(now, 7);
    const { from: lastFrom, to: lastTo } = this.lastNDayRange(now, 14);
    const [{ income: thisIncome, expense: thisExpense }, { income: lastIncome, expense: lastExpense }] =
      await Promise.all([
        this.sumRange(userId, thisFrom, thisTo),
        this.sumRange(userId, lastFrom, thisFrom),
      ]);
    return {
      thisWeek: { income: thisIncome, expense: thisExpense },
      lastWeek: { income: lastIncome, expense: lastExpense },
    };
  }

  private async sumIncomeExpenseByMonth(
    userId: string,
    now: Date,
  ): Promise<{
    thisMonth: { income: string; expense: string };
    lastMonth: { income: string; expense: string };
  }> {
    const month = now.getUTCMonth();
    const year = now.getUTCFullYear();
    const thisFrom = new Date(Date.UTC(year, month, 1));
    const thisTo = new Date(Date.UTC(year, month + 1, 1));
    const lastFrom = new Date(Date.UTC(year, month - 1, 1));
    const lastTo = thisFrom;
    const [{ income: thisIncome, expense: thisExpense }, { income: lastIncome, expense: lastExpense }] =
      await Promise.all([
        this.sumRange(userId, thisFrom, thisTo),
        this.sumRange(userId, lastFrom, lastTo),
      ]);
    return {
      thisMonth: { income: thisIncome, expense: thisExpense },
      lastMonth: { income: lastIncome, expense: lastExpense },
    };
  }

  private lastNDayRange(now: Date, days: number): { from: Date; to: Date } {
    const to = new Date(now);
    const from = new Date(now);
    from.setUTCDate(from.getUTCDate() - days);
    return { from, to };
  }

  private async sumRange(
    userId: string,
    from: Date,
    to: Date,
  ): Promise<{ income: string; expense: string }> {
    const rows = await this.transactionsRepository
      .createQueryBuilder('transaction')
      .innerJoin('transaction.wallet', 'wallet')
      .where('wallet.user_id = :userId', { userId })
      .andWhere('transaction.status = :status', {
        status: TransactionStatus.Confirmed,
      })
      .andWhere('transaction.transaction_date >= :from', { from })
      .andWhere('transaction.transaction_date < :to', { to })
      .select('transaction.transaction_type', 'type')
      .addSelect('COALESCE(SUM(transaction.amount), 0)', 'total')
      .groupBy('transaction.transaction_type')
      .getRawMany<{ type: TransactionType; total: string }>();

    const income =
      rows.find((row) => row.type === TransactionType.Income)?.total ?? '0.00';
    const expense =
      rows.find((row) => row.type === TransactionType.Expense)?.total ??
      '0.00';
    return { income, expense };
  }

  private deltaDirection(
    current: string,
    previous: string,
  ): 'saved' | 'overspent' | 'flat' {
    const cmp = compareMoney(current, previous);
    if (cmp === 0) return 'flat';
    return cmp < 0 ? 'saved' : 'overspent';
  }

  private async topFoodDeliverySpend(
    userId: string,
    now: Date,
  ): Promise<TagSpendSummary | null> {
    const month = now.getUTCMonth();
    const year = now.getUTCFullYear();
    const from = new Date(Date.UTC(year, month, 1));
    const to = new Date(Date.UTC(year, month + 1, 1));

    const tags = await this.tagsRepository.find({
      where: [{ userId }, { userId: undefined, isDefault: true } as never],
    });
    const matches = tags.filter((tag) =>
      FOOD_DELIVERY_KEYWORDS.some((keyword) =>
        tag.name.toLowerCase().includes(keyword.toLowerCase()),
      ),
    );
    if (matches.length === 0) return null;

    const tagIds = matches.map((tag) => tag.id);
    const rows = await this.transactionsRepository
      .createQueryBuilder('transaction')
      .innerJoin('transaction.wallet', 'wallet')
      .where('wallet.user_id = :userId', { userId })
      .andWhere('transaction.status = :status', {
        status: TransactionStatus.Confirmed,
      })
      .andWhere('transaction.transaction_type = :transactionType', {
        transactionType: TransactionType.Expense,
      })
      .andWhere('transaction.tag_id IN (:...tagIds)', { tagIds })
      .andWhere('transaction.transaction_date >= :from', { from })
      .andWhere('transaction.transaction_date < :to', { to })
      .select('transaction.tag_id', 'tagId')
      .addSelect('COALESCE(SUM(transaction.amount), 0)', 'total')
      .groupBy('transaction.tag_id')
      .orderBy('total', 'DESC')
      .limit(1)
      .getRawMany<{ tagId: string; total: string }>();

    if (rows.length === 0) return null;
    const tagName = matches.find((tag) => tag.id === rows[0].tagId)?.name;
    if (!tagName) return null;
    return {
      tagId: rows[0].tagId,
      tagName,
      totalSpent: rows[0].total,
    };
  }

  private computePotentialSaving(amount: string): string {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return '0.00';
    return (value * 0.4).toFixed(2);
  }

  private async getUserCurrencyCode(userId: string): Promise<string | null> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      select: { currencyCode: true },
    });
    return user?.currencyCode ?? null;
  }
}