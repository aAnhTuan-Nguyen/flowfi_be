import { User } from '../../users/entities/user.entity';

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: Pick<
    User,
    | 'id'
    | 'email'
    | 'fullName'
    | 'avatarUrl'
    | 'dateOfBirth'
    | 'currencyCode'
    | 'monthlyBudgetLimit'
    | 'authProvider'
    | 'createdAt'
    | 'updatedAt'
    | 'deletedAt'
  >;
}
