import { Column, Entity, OneToOne } from 'typeorm';
import { BaseEntity } from '../../database/entities/base.entity';
import {
  AiInputType,
  AiRequestStatus,
  AiRequestType,
} from '../ai-processing.enums';
import { AiProcessingResult } from './ai-processing-result.entity';

@Entity('ai_processing_request')
export class AiProcessingRequest extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId!: string | null;

  @Column({ name: 'input_type', type: 'varchar', length: 20 })
  inputType!: AiInputType;

  @Column({ name: 'request_type', type: 'varchar', length: 40 })
  requestType!: AiRequestType;

  @Column({ name: 'input_url', type: 'text', nullable: true })
  inputUrl!: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: AiRequestStatus.Pending,
  })
  status!: AiRequestStatus;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @OneToOne(() => AiProcessingResult, (result) => result.request)
  result!: AiProcessingResult | null;
}
