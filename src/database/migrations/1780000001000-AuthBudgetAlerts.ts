import { MigrationInterface, QueryRunner } from 'typeorm';

export class AuthBudgetAlerts1780000001000 implements MigrationInterface {
  name = 'AuthBudgetAlerts1780000001000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE password_reset_tokens (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        otp_hash text NOT NULL,
        expires_at timestamptz NOT NULL,
        used_at timestamptz,
        attempt_count int NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now()
      );

      ALTER TABLE notifications
        ADD COLUMN metadata jsonb;

      CREATE TABLE budget_alert_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        budget_id uuid NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
        month int NOT NULL,
        year int NOT NULL,
        threshold_percent int NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(user_id, budget_id, month, year, threshold_percent)
      );

      CREATE INDEX idx_password_reset_tokens_user_active
        ON password_reset_tokens(user_id, used_at, expires_at);
      CREATE INDEX idx_budget_alert_logs_lookup
        ON budget_alert_logs(user_id, budget_id, year, month, threshold_percent);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_budget_alert_logs_lookup;
      DROP INDEX IF EXISTS idx_password_reset_tokens_user_active;
      DROP TABLE IF EXISTS budget_alert_logs;
      ALTER TABLE notifications DROP COLUMN IF EXISTS metadata;
      DROP TABLE IF EXISTS password_reset_tokens;
    `);
  }
}
