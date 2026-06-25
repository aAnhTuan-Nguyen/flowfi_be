import { Column } from 'typeorm';
import { BaseEntity } from './base.entity';
import { SyncStatus } from '../../sync/sync.enums';

export abstract class SyncableEntity extends BaseEntity {
  @Column({ name: 'client_id', type: 'varchar', length: 100, nullable: true })
  clientId!: string | null;

  @Column({
    name: 'sync_status',
    type: 'varchar',
    length: 20,
    default: SyncStatus.Synced,
  })
  syncStatus!: SyncStatus;

  @Column({ type: 'int', default: 1 })
  version!: number;

  @Column({ name: 'last_synced_at', type: 'timestamptz', nullable: true })
  lastSyncedAt!: Date | null;
}
