import {
  IsDateString,
  IsEnum,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { AiTransactionType } from '../ai-processing.enums';

export class CreateAiProcessingResultDto {
  @IsUUID()
  requestId!: string;

  @IsOptional()
  @IsNumberString()
  amount?: string;

  @IsOptional()
  @IsEnum(AiTransactionType)
  transactionType?: AiTransactionType;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @IsDateString()
  transactionDate?: string;

  @IsOptional()
  @IsString()
  rawResponse?: string;
}
