import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import {
  AiInputType,
  AiRequestStatus,
  AiRequestType,
} from '../ai-processing.enums';

export class CreateAiProcessingRequestDto {
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsEnum(AiInputType)
  inputType!: AiInputType;

  @IsEnum(AiRequestType)
  requestType!: AiRequestType;

  @IsOptional()
  @IsString()
  inputUrl?: string;

  @IsOptional()
  @IsEnum(AiRequestStatus)
  status?: AiRequestStatus;
}
