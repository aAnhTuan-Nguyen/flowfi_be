import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { SyncableEntity } from '../../database/entities/syncable.entity';
import { User } from '../../users/entities/user.entity';
import { Wallet } from '../../wallets/entities/wallet.entity';
import { GoalStatus } from '../goal.enums';

@Entity('goals')
export class Goal extends SyncableEntity {
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, (user) => user.goals, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'wallet_id', type: 'uuid', nullable: true })
  walletId!: string | null;

  @ManyToOne(() => Wallet, { nullable: true })
  @JoinColumn({ name: 'wallet_id' })
  wallet!: Wallet | null;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'target_amount', type: 'numeric', precision: 18, scale: 2 })
  targetAmount!: string;

  @Column({
    name: 'current_amount',
    type: 'numeric',
    precision: 18,
    scale: 2,
    default: 0,
  })
  currentAmount!: string;

  @Column({ type: 'date', nullable: true })
  deadline!: string | null;

  @Column({ type: 'varchar', length: 20, default: GoalStatus.Active })
  status!: GoalStatus;
}
