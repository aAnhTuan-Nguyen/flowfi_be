import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class BudgetAnnualSummaryQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  year!: number;
}
