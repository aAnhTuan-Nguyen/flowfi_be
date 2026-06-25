import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
} from 'class-validator';
import {
  TransactionInputMethod,
  TransactionStatus,
  TransactionType,
} from '../transaction.enums';

export class CreateTransactionDto {
  @IsUUID()
  walletId!: string;

  @IsUUID()
  tagId!: string;

  @IsString()
  @Length(1, 255)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @Matches(/^\d+(\.\d{1,2})?$/)
  amount!: string;

  @IsEnum(TransactionType)
  transactionType!: TransactionType;

  @IsDateString()
  transactionDate!: string;

  @IsOptional()
  @IsEnum(TransactionInputMethod)
  inputMethod?: TransactionInputMethod;

  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @IsOptional()
  @IsString()
  merchantName?: string;

  @IsOptional()
  @IsString()
  clientId?: string;
}
