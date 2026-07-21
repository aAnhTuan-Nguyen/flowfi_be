export enum NotificationType {
  BudgetWarning = 'BudgetWarning',
  GoalReminder = 'GoalReminder',
  System = 'System',
  Transaction = 'Transaction',
  TransactionIncome = 'TransactionIncome',
  TransactionExpense = 'TransactionExpense',
  BalanceUpdate = 'BalanceUpdate',
  DailyReminder = 'DailyReminder',
  WeeklySummary = 'WeeklySummary',
  MonthlySummary = 'MonthlySummary',
  SavingsTip = 'SavingsTip',
}

export enum NotificationPreferenceKey {
  TransactionNotifications = 'transactionNotifications',
  BudgetWarning = 'budgetWarning',
  DailyReminder = 'dailyReminder',
  WeeklySummary = 'weeklySummary',
  MonthlySummary = 'monthlySummary',
  SavingsTip = 'savingsTip',
}