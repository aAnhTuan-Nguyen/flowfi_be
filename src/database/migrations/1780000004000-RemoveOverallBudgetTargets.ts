import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveOverallBudgetTargets1780000004000
  implements MigrationInterface
{
  name = 'RemoveOverallBudgetTargets1780000004000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DELETE FROM budgets WHERE tag_id IS NULL');
  }

  async down(): Promise<void> {
    // Derived monthly targets cannot be reconstructed as standalone rows.
  }
}
