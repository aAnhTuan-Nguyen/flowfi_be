import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '../../database/entities/base.entity';
import { AuthProvider } from '../user.enums';
import { RefreshToken } from '../../auth/entities/refresh-token.entity';
import { Wallet } from '../../wallets/entities/wallet.entity';
import { Tag } from '../../tags/entities/tag.entity';
import { Budget } from '../../budgets/entities/budget.entity';
import { Goal } from '../../goals/entities/goal.entity';
import { Notification } from '../../notifications/entities/notification.entity';

@Entity('users')
export class User extends BaseEntity {
  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({
    name: 'password_hash',
    type: 'text',
    nullable: true,
    select: false,
  })
  passwordHash!: string | null;

  @Column({ name: 'full_name', type: 'varchar', length: 255, nullable: true })
  fullName!: string | null;

  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  avatarUrl!: string | null;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth!: string | null;

  @Column({
    name: 'currency_code',
    type: 'varchar',
    length: 10,
    default: 'VND',
  })
  currencyCode!: string;

  @Column({
    name: 'monthly_budget_limit',
    type: 'numeric',
    precision: 18,
    scale: 2,
    nullable: true,
  })
  monthlyBudgetLimit!: string | null;

  @Column({
    name: 'auth_provider',
    type: 'varchar',
    length: 20,
    default: AuthProvider.Local,
  })
  authProvider!: AuthProvider;

  @OneToMany(() => RefreshToken, (refreshToken) => refreshToken.user)
  refreshTokens!: RefreshToken[];

  @OneToMany(() => Wallet, (wallet) => wallet.user)
  wallets!: Wallet[];

  @OneToMany(() => Tag, (tag) => tag.user)
  tags!: Tag[];

  @OneToMany(() => Budget, (budget) => budget.user)
  budgets!: Budget[];

  @OneToMany(() => Goal, (goal) => goal.user)
  goals!: Goal[];

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications!: Notification[];
}
