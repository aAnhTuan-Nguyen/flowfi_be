import { IsOptional, IsUUID } from 'class-validator';

export class AiProcessingRequestQueryDto {
  @IsOptional()
  @IsUUID()
  userId?: string;
}
