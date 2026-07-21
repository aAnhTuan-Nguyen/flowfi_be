import { formatMoney, formatMoneyWithCurrency } from '../common/utils/money';
import {
  NotificationPreferenceKey,
  NotificationType,
} from './notification.enums';

export interface NotificationContent {
  title: string;
  content: string;
}

export interface TransactionNotificationContext {
  amount: string;
  walletName: string;
  tagName?: string | null;
  balanceAfter: string;
  currencyCode?: string | null;
}

export interface BudgetWarningContext {
  tagName: string | null;
  percentUsed: number;
  remainingAmount: string;
  currencyCode?: string | null;
}

export interface DailyReminderContext {
  hasTransactionsToday: boolean;
}

export interface SummaryContext {
  period: 'week' | 'month';
  incomeAmount: string;
  expenseAmount: string;
  deltaAmount: string;
  deltaDirection: 'saved' | 'overspent' | 'flat';
  currencyCode?: string | null;
}

export interface SavingsTipContext {
  tagName: string;
  amountSpent: string;
  potentialSaving: string;
  currencyCode?: string | null;
}

export class NotificationTemplates {
  static transactionIncome(ctx: TransactionNotificationContext): NotificationContent {
    const formattedAmount = formatMoneyWithCurrency(ctx.amount, ctx.currencyCode);
    const balance = formatMoneyWithCurrency(ctx.balanceAfter, ctx.currencyCode);
    const tagPart = ctx.tagName ? ` ở mục ${ctx.tagName}` : '';
    return {
      title: `+ ${formattedAmount} vào ví ${ctx.walletName}`,
      content: `Bạn vừa cộng ${formattedAmount} vào ví ${ctx.walletName}${tagPart}. Số dư hiện tại: ${balance}.`,
    };
  }

  static transactionExpense(
    ctx: TransactionNotificationContext,
  ): NotificationContent {
    const formattedAmount = formatMoneyWithCurrency(ctx.amount, ctx.currencyCode);
    const balance = formatMoneyWithCurrency(ctx.balanceAfter, ctx.currencyCode);
    const tagPart = ctx.tagName ? ` ở mục ${ctx.tagName}` : '';
    return {
      title: `- ${formattedAmount} từ ví ${ctx.walletName}`,
      content: `Bạn vừa trừ ${formattedAmount} từ ví ${ctx.walletName}${tagPart}. Số dư hiện tại: ${balance}.`,
    };
  }

  static transactionDeleted(
    ctx: TransactionNotificationContext & { transactionType: 'Income' | 'Expense' },
  ): NotificationContent {
    const formattedAmount = formatMoneyWithCurrency(ctx.amount, ctx.currencyCode);
    const balance = formatMoneyWithCurrency(ctx.balanceAfter, ctx.currencyCode);
    const verb = ctx.transactionType === 'Income' ? 'cộng' : 'trừ';
    return {
      title: `Đã huỷ giao dịch ${verb} ${formattedAmount}`,
      content: `Giao dịch ${verb} ${formattedAmount} ở ví ${ctx.walletName} đã được xoá. Số dư hiện tại: ${balance}.`,
    };
  }

  static budgetWarning(ctx: BudgetWarningContext): NotificationContent {
    const formattedRemaining = formatMoneyWithCurrency(
      ctx.remainingAmount,
      ctx.currencyCode,
    );
    const tagLabel = ctx.tagName ?? 'ngân sách tháng';
    if (ctx.percentUsed >= 100) {
      return {
        title: `Đã vượt ngân sách ${tagLabel}`,
        content: `Cảnh báo: Bạn đã dùng ${ctx.percentUsed}% ngân sách ${tagLabel} tháng này và vượt mức ${formattedRemaining}. Hãy cân nhắc chi tiêu trong những ngày còn lại nhé!`,
      };
    }
    return {
      title: `Sắp hết ngân sách ${tagLabel}`,
      content: `Cảnh báo: Bạn đã dùng ${ctx.percentUsed}% ngân sách ${tagLabel} tháng này. Còn lại ${formattedRemaining}. Hãy cân nhắc các khoản chi sắp tới nhé!`,
    };
  }

  static dailyReminder(_ctx: DailyReminderContext): NotificationContent {
    return {
      title: 'Đã đến giờ ghi chép rồi',
      content:
        'Hôm nay bạn đã tiêu gì chưa? Dành 1 phút ghi lại để cuối tháng không phải đau đầu nhé!',
    };
  }

  static weeklySummary(ctx: SummaryContext): NotificationContent {
    const delta = formatMoneyWithCurrency(ctx.deltaAmount, ctx.currencyCode);
    const expense = formatMoneyWithCurrency(ctx.expenseAmount, ctx.currencyCode);
    let comparisonLine: string;
    if (ctx.deltaDirection === 'saved') {
      comparisonLine = `Bạn đã tiết kiệm được ${delta} so với tuần trước.`;
    } else if (ctx.deltaDirection === 'overspent') {
      comparisonLine = `Bạn đã chi tiêu nhiều hơn ${delta} so với tuần trước.`;
    } else {
      comparisonLine = `Mức chi tiêu của bạn tương đương với tuần trước.`;
    }
    return {
      title: 'Báo cáo tài chính tuần này',
      content: `Tuần này bạn đã chi ${expense}. ${comparisonLine} Xem ngay biểu đồ chi tiêu của bạn!`,
    };
  }

  static monthlySummary(ctx: SummaryContext): NotificationContent {
    const delta = formatMoneyWithCurrency(ctx.deltaAmount, ctx.currencyCode);
    const income = formatMoneyWithCurrency(ctx.incomeAmount, ctx.currencyCode);
    const expense = formatMoneyWithCurrency(ctx.expenseAmount, ctx.currencyCode);
    let comparisonLine: string;
    if (ctx.deltaDirection === 'saved') {
      comparisonLine = `Bạn đã tiết kiệm được ${delta} so với tháng trước.`;
    } else if (ctx.deltaDirection === 'overspent') {
      comparisonLine = `Bạn đã chi vượt ${delta} so với tháng trước.`;
    } else {
      comparisonLine = `Mức chi tiêu của bạn ngang bằng tháng trước.`;
    }
    return {
      title: 'Tổng kết tài chính tháng',
      content: `Thu nhập: ${income}. Chi tiêu: ${expense}. ${comparisonLine}`,
    };
  }

  static savingsTip(ctx: SavingsTipContext): NotificationContent {
    const spent = formatMoneyWithCurrency(ctx.amountSpent, ctx.currencyCode);
    const saving = formatMoneyWithCurrency(ctx.potentialSaving, ctx.currencyCode);
    return {
      title: `Mẹo tiết kiệm cho mục ${ctx.tagName}`,
      content: `Bạn đã chi ${spent} cho mục ${ctx.tagName} tháng này. Tự nấu/cắt giảm chi tiêu có thể giúp bạn tiết kiệm thêm ${saving} đấy!`,
    };
  }

  static goalReminder(goalName: string, current: string, target: string): NotificationContent {
    const currentFmt = formatMoney(current);
    const targetFmt = formatMoney(target);
    return {
      title: `Sắp đạt mục tiêu: ${goalName}`,
      content: `Bạn đã tiết kiệm được ${currentFmt}/${targetFmt} cho mục tiêu "${goalName}". Cố lên!`,
    };
  }

  static preferenceKeyForType(type: NotificationType): NotificationPreferenceKey {
    switch (type) {
      case NotificationType.BudgetWarning:
        return NotificationPreferenceKey.BudgetWarning;
      case NotificationType.DailyReminder:
        return NotificationPreferenceKey.DailyReminder;
      case NotificationType.WeeklySummary:
        return NotificationPreferenceKey.WeeklySummary;
      case NotificationType.MonthlySummary:
        return NotificationPreferenceKey.MonthlySummary;
      case NotificationType.SavingsTip:
        return NotificationPreferenceKey.SavingsTip;
      case NotificationType.TransactionIncome:
      case NotificationType.TransactionExpense:
      case NotificationType.BalanceUpdate:
      default:
        return NotificationPreferenceKey.TransactionNotifications;
    }
  }
}