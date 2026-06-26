import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { BaseEntity } from '../../database/entities/base.entity';
import { AiTransactionType } from '../ai-processing.enums';
import { AiProcessingRequest } from './ai-processing-request.entity';

@Entity('ai_processing_result')
export class AiProcessingResult extends BaseEntity {
  @Column({ name: 'request_id', type: 'uuid' })
  requestId!: string;

  @OneToOne(() => AiProcessingRequest, (request) => request.result, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'request_id' })
  request!: AiProcessingRequest;

  @Column({ type: 'numeric', precision: 18, scale: 2, nullable: true })
  amount!: string | null;

  @Column({
    name: 'transaction_type',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  transactionType!: AiTransactionType | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  tag!: string | null;

  @Column({ name: 'transaction_date', type: 'timestamptz', nullable: true })
  transactionDate!: Date | null;

  @Column({ type: 'numeric', precision: 5, scale: 4, nullable: true })
  confidence!: string | null;

  @Column({ name: 'raw_response', type: 'text', nullable: true })
  rawResponse!: string | null;

  @Column({ name: 'parsed_data', type: 'jsonb', nullable: true })
  parsedData!: Record<string, unknown> | null;
}
