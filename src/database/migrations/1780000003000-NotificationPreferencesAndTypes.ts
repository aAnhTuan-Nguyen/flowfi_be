import { MigrationInterface, QueryRunner } from 'typeorm';

export class NotificationPreferencesAndTypes1780000003000
  implements MigrationInterface
{
  name = 'NotificationPreferencesAndTypes1780000003000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE notification_preferences (
        user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        transaction_notifications boolean NOT NULL DEFAULT true,
        budget_warning boolean NOT NULL DEFAULT true,
        daily_reminder boolean NOT NULL DEFAULT true,
        daily_reminder_hour int NOT NULL DEFAULT 20,
        weekly_summary boolean NOT NULL DEFAULT true,
        monthly_summary boolean NOT NULL DEFAULT true,
        savings_tip boolean NOT NULL DEFAULT true,
        timezone varchar(64) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz
      );

      CREATE INDEX idx_notification_preferences_daily
        ON notification_preferences(daily_reminder, daily_reminder_hour);
    `);

    await queryRunner.query(`
      ALTER TABLE notifications
        DROP CONSTRAINT IF EXISTS notifications_notification_type_check;
    `);

    await queryRunner.query(`
      ALTER TABLE notifications
        ADD CONSTRAINT notifications_notification_type_check
        CHECK (notification_type IN (
          'BudgetWarning',
          'GoalReminder',
          'System',
          'Transaction',
          'TransactionIncome',
          'TransactionExpense',
          'BalanceUpdate',
          'DailyReminder',
          'WeeklySummary',
          'MonthlySummary',
          'SavingsTip'
        ));
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE notifications
        DROP CONSTRAINT IF EXISTS notifications_notification_type_check;
    `);
    await queryRunner.query(`
      ALTER TABLE notifications
        ADD CONSTRAINT notifications_notification_type_check
        CHECK (notification_type IN (
          'BudgetWarning',
          'GoalReminder',
          'System',
          'Transaction'
        ));
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_notification_preferences_daily;
      DROP TABLE IF EXISTS notification_preferences;
    `);
  }
}