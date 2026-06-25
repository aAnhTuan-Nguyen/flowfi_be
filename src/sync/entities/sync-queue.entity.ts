import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { UserDevice } from './user-device.entity';
import { SyncAction, SyncStatus } from '../sync.enums';

@Entity('sync_queue')
export class SyncQueue {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'device_id', type: 'uuid', nullable: true })
  deviceId!: string | null;

  @ManyToOne(() => UserDevice, { nullable: true })
  @JoinColumn({ name: 'device_id' })
  device!: UserDevice | null;

  @Column({ name: 'entity_name', type: 'varchar', length: 100 })
  entityName!: string;

  @Column({ name: 'entity_id', type: 'uuid', nullable: true })
  entityId!: string | null;

  @Column({ name: 'client_id', type: 'varchar', length: 100, nullable: true })
  clientId!: string | null;

  @Column({ type: 'varchar', length: 20 })
  action!: SyncAction;

  @Column({ type: 'jsonb' })
  payload!: Record<string, unknown>;

  @Column({
    name: 'sync_status',
    type: 'varchar',
    length: 20,
    default: SyncStatus.Pending,
  })
  syncStatus!: SyncStatus;

  @Column({ name: 'retry_count', type: 'int', default: 0 })
  retryCount!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'synced_at', type: 'timestamptz', nullable: true })
  syncedAt!: Date | null;
}
