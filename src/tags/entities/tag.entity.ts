import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { SyncableEntity } from '../../database/entities/syncable.entity';
import { User } from '../../users/entities/user.entity';
import { TagType } from '../tag.enums';
import { Transaction } from '../../transactions/entities/transaction.entity';
import { Budget } from '../../budgets/entities/budget.entity';

@Entity('tags')
export class Tag extends SyncableEntity {
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId!: string | null;

  @ManyToOne(() => User, (user) => user.tags, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'user_id' })
  user!: User | null;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 20 })
  type!: TagType;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault!: boolean;

  @OneToMany(() => Transaction, (transaction) => transaction.tag)
  transactions!: Transaction[];

  @OneToMany(() => Budget, (budget) => budget.tag)
  budgets!: Budget[];
}
