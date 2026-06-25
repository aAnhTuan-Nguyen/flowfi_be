import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialFlowFiMvp1780000000000 implements MigrationInterface {
  name = 'InitialFlowFiMvp1780000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;

      CREATE TABLE users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email varchar(255) NOT NULL UNIQUE,
        password_hash text,
        full_name varchar(255),
        avatar_url text,
        date_of_birth date,
        currency_code varchar(10) NOT NULL DEFAULT 'VND',
        monthly_budget_limit numeric(18,2),
        auth_provider varchar(20) NOT NULL DEFAULT 'Local',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz,
        deleted_at timestamptz
      );

      CREATE TABLE refresh_tokens (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token text NOT NULL,
        expires_at timestamptz NOT NULL,
        is_revoked boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE wallets (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name varchar(100) NOT NULL,
        wallet_type varchar(50) NOT NULL,
        balance numeric(18,2) NOT NULL DEFAULT 0,
        is_default boolean NOT NULL DEFAULT false,
        client_id varchar(100),
        sync_status varchar(20) NOT NULL DEFAULT 'Synced',
        version int NOT NULL DEFAULT 1,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz,
        last_synced_at timestamptz,
        deleted_at timestamptz
      );

      CREATE TABLE tags (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid REFERENCES users(id) ON DELETE CASCADE,
        name varchar(100) NOT NULL,
        type varchar(20) NOT NULL,
        is_default boolean NOT NULL DEFAULT false,
        client_id varchar(100),
        sync_status varchar(20) NOT NULL DEFAULT 'Synced',
        version int NOT NULL DEFAULT 1,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz,
        last_synced_at timestamptz,
        deleted_at timestamptz
      );

      CREATE TABLE transactions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        wallet_id uuid NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
        tag_id uuid NOT NULL REFERENCES tags(id),
        title varchar(255) NOT NULL,
        description text,
        amount numeric(18,2) NOT NULL,
        transaction_type varchar(20) NOT NULL,
        transaction_date timestamptz NOT NULL,
        input_method varchar(20) NOT NULL DEFAULT 'Manual',
        status varchar(20) NOT NULL DEFAULT 'Confirmed',
        merchant_name varchar(255),
        client_id varchar(100),
        sync_status varchar(20) NOT NULL DEFAULT 'Synced',
        version int NOT NULL DEFAULT 1,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz,
        last_synced_at timestamptz,
        deleted_at timestamptz
      );

      CREATE TABLE budgets (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tag_id uuid REFERENCES tags(id),
        budget_amount numeric(18,2) NOT NULL,
        month int NOT NULL,
        year int NOT NULL,
        warning_threshold_percent int NOT NULL DEFAULT 80,
        client_id varchar(100),
        sync_status varchar(20) NOT NULL DEFAULT 'Synced',
        version int NOT NULL DEFAULT 1,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz,
        last_synced_at timestamptz,
        deleted_at timestamptz
      );

      CREATE TABLE goals (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        wallet_id uuid REFERENCES wallets(id),
        name varchar(255) NOT NULL,
        description text,
        target_amount numeric(18,2) NOT NULL,
        current_amount numeric(18,2) NOT NULL DEFAULT 0,
        deadline date,
        status varchar(20) NOT NULL DEFAULT 'Active',
        client_id varchar(100),
        sync_status varchar(20) NOT NULL DEFAULT 'Synced',
        version int NOT NULL DEFAULT 1,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz,
        last_synced_at timestamptz,
        deleted_at timestamptz
      );

      CREATE TABLE notifications (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title varchar(255) NOT NULL,
        content text,
        notification_type varchar(50) NOT NULL,
        is_read boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE user_devices (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        device_id varchar(255) NOT NULL,
        device_name varchar(255),
        platform varchar(50),
        push_token text,
        last_synced_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(user_id, device_id)
      );

      CREATE TABLE sync_queue (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        device_id uuid REFERENCES user_devices(id),
        entity_name varchar(100) NOT NULL,
        entity_id uuid,
        client_id varchar(100),
        action varchar(20) NOT NULL,
        payload jsonb NOT NULL,
        sync_status varchar(20) NOT NULL DEFAULT 'Pending',
        retry_count int NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        synced_at timestamptz
      );

      CREATE TABLE sync_conflicts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        device_id uuid REFERENCES user_devices(id),
        entity_name varchar(100) NOT NULL,
        entity_id uuid,
        client_id varchar(100),
        local_payload jsonb NOT NULL,
        server_payload jsonb NOT NULL,
        status varchar(20) NOT NULL DEFAULT 'Pending',
        resolution varchar(50),
        created_at timestamptz NOT NULL DEFAULT now(),
        resolved_at timestamptz
      );

      CREATE INDEX idx_wallets_user_id ON wallets(user_id);
      CREATE INDEX idx_tags_user_id ON tags(user_id);
      CREATE INDEX idx_transactions_wallet_id ON transactions(wallet_id);
      CREATE INDEX idx_transactions_transaction_date ON transactions(transaction_date);
      CREATE INDEX idx_budgets_user_month ON budgets(user_id, year, month);
      CREATE INDEX idx_goals_user_id ON goals(user_id);
      CREATE INDEX idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX idx_sync_conflicts_user_status ON sync_conflicts(user_id, status);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS sync_conflicts;
      DROP TABLE IF EXISTS sync_queue;
      DROP TABLE IF EXISTS user_devices;
      DROP TABLE IF EXISTS notifications;
      DROP TABLE IF EXISTS goals;
      DROP TABLE IF EXISTS budgets;
      DROP TABLE IF EXISTS transactions;
      DROP TABLE IF EXISTS tags;
      DROP TABLE IF EXISTS wallets;
      DROP TABLE IF EXISTS refresh_tokens;
      DROP TABLE IF EXISTS users;
    `);
  }
}
