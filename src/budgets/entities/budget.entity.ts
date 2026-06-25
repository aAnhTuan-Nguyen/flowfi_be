import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { SyncableEntity } from '../../database/entities/syncable.entity';
import { User } from '../../users/entities/user.entity';
import { Tag } from '../../tags/entities/tag.entity';

@Entity('budgets')
export class Budget extends SyncableEntity {
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, (user) => user.budgets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'tag_id', type: 'uuid', nullable: true })
  tagId!: string | null;

  @ManyToOne(() => Tag, (tag) => tag.budgets, { nullable: true })
  @JoinColumn({ name: 'tag_id' })
  tag!: Tag | null;

  @Column({ name: 'budget_amount', type: 'numeric', precision: 18, scale: 2 })
  budgetAmount!: string;

  @Column({ type: 'int' })
  month!: number;

  @Column({ type: 'int' })
  year!: number;

  @Column({ name: 'warning_threshold_percent', type: 'int', default: 80 })
  warningThresholdPercent!: number;
}
