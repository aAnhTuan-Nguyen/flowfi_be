import { IsUUID } from 'class-validator';

export class VoiceTransactionUploadDto {
  @IsUUID()
  WalletId!: string;
}
