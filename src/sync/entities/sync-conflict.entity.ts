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
import { ConflictResolution, ConflictStatus } from '../sync.enums';

@Entity('sync_conflicts')
export class SyncConflict {
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

  @Column({ name: 'local_payload', type: 'jsonb' })
  localPayload!: Record<string, unknown>;

  @Column({ name: 'server_payload', type: 'jsonb' })
  serverPayload!: Record<string, unknown>;

  @Column({ type: 'varchar', length: 20, default: ConflictStatus.Pending })
  status!: ConflictStatus;

  @Column({ type: 'varchar', length: 50, nullable: true })
  resolution!: ConflictResolution | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt!: Date | null;
}
