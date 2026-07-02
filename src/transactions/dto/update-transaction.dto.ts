import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
} from 'class-validator';
import { TransactionType } from '../transaction.enums';

export class UpdateTransactionDto {
  @IsOptional()
  @IsUUID()
  tagId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Matches(/^\d+(\.\d{1,2})?$/)
  amount?: string;

  @IsOptional()
  @IsEnum(TransactionType)
  transactionType?: TransactionType;

  @IsOptional()
  @IsDateString()
  transactionDate?: string;

  @IsOptional()
  @IsString()
  merchantName?: string;
}
