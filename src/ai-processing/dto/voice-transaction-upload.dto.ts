import { IsOptional, IsString, IsUUID } from 'class-validator';

export class VoiceTransactionUploadDto {
  @IsUUID()
  WalletId!: string;

  @IsOptional()
  @IsString()
  MockTranscribedText?: string;
}
