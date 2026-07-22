import { IsInt, IsOptional, IsUUID, Max, Min, Matches } from 'class-validator';

export class CreateBudgetDto {
  @IsUUID()
  tagId!: string;

  @Matches(/^\d+(\.\d{1,2})?$/)
  budgetAmount!: string;

  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @IsInt()
  @Min(2000)
  year!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  warningThresholdPercent?: number;
}
