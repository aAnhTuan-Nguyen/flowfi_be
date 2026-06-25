import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { NotificationType } from '../notification.enums';

export class CreateNotificationDto {
  @IsString()
  @Length(1, 255)
  title!: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsEnum(NotificationType)
  notificationType!: NotificationType;
}
