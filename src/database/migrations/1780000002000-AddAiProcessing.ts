import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAiProcessing1780000002000 implements MigrationInterface {
  name = 'AddAiProcessing1780000002000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE ai_processing_request (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid REFERENCES users(id) ON DELETE SET NULL,
        input_type varchar(20) NOT NULL,
        request_type varchar(40) NOT NULL,
        input_url text,
        status varchar(20) NOT NULL DEFAULT 'PENDING',
        error_message text,
        metadata jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz,
        deleted_at timestamptz,
        CONSTRAINT chk_ai_processing_request_input_type
          CHECK (input_type IN ('AUDIO', 'IMAGE', 'TEXT', 'VOICE')),
        CONSTRAINT chk_ai_processing_request_request_type
          CHECK (request_type IN ('VOICE_TO_TEXT', 'VOICE_TO_TRANSACTION', 'OCR', 'SPENDING_ANALYSIS')),
        CONSTRAINT chk_ai_processing_request_status
          CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'))
      );

      CREATE TABLE ai_processing_result (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        request_id uuid NOT NULL UNIQUE REFERENCES ai_processing_request(id) ON DELETE CASCADE,
        amount numeric(18,2),
        transaction_type varchar(20),
        tag varchar(100),
        transaction_date timestamptz,
        confidence numeric(5,4),
        raw_response text,
        parsed_data jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz,
        deleted_at timestamptz,
        CONSTRAINT chk_ai_processing_result_transaction_type
          CHECK (transaction_type IS NULL OR transaction_type IN ('EXPENSE', 'INCOME', 'TRANSFER', 'UNKNOWN'))
      );

      CREATE INDEX idx_ai_processing_request_user_id
        ON ai_processing_request(user_id);
      CREATE INDEX idx_ai_processing_request_status
        ON ai_processing_request(status);
      CREATE INDEX idx_ai_processing_request_request_type
        ON ai_processing_request(request_type);
      CREATE INDEX idx_ai_processing_result_request_id
        ON ai_processing_result(request_id);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_ai_processing_result_request_id;
      DROP INDEX IF EXISTS idx_ai_processing_request_request_type;
      DROP INDEX IF EXISTS idx_ai_processing_request_status;
      DROP INDEX IF EXISTS idx_ai_processing_request_user_id;
      DROP TABLE IF EXISTS ai_processing_result;
      DROP TABLE IF EXISTS ai_processing_request;
    `);
  }
}
