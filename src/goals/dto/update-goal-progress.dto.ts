import { Matches } from 'class-validator';

export class UpdateGoalProgressDto {
  @Matches(/^\d+(\.\d{1,2})?$/)
  currentAmount!: string;
}
