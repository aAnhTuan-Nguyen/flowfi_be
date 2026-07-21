import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

export class UpdateNotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  transactionNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  budgetWarning?: boolean;

  @IsOptional()
  @IsBoolean()
  dailyReminder?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  dailyReminderHour?: number;

  @IsOptional()
  @IsBoolean()
  weeklySummary?: boolean;

  @IsOptional()
  @IsBoolean()
  monthlySummary?: boolean;

  @IsOptional()
  @IsBoolean()
  savingsTip?: boolean;

  @IsOptional()
  @IsString()
  @Length(1, 64)
  timezone?: string;
}