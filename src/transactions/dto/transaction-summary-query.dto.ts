import { IsDateString } from 'class-validator';

export class TransactionSummaryQueryDto {
  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;
}
