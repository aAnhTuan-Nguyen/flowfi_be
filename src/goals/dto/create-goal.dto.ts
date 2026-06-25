import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
} from 'class-validator';
import { GoalStatus } from '../goal.enums';

export class CreateGoalDto {
  @IsOptional()
  @IsUUID()
  walletId?: string;

  @IsString()
  @Length(1, 255)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @Matches(/^\d+(\.\d{1,2})?$/)
  targetAmount!: string;

  @IsOptional()
  @Matches(/^\d+(\.\d{1,2})?$/)
  currentAmount?: string;

  @IsOptional()
  @IsDateString()
  deadline?: string;

  @IsOptional()
  @IsEnum(GoalStatus)
  status?: GoalStatus;
}
