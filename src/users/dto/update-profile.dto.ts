import {
  IsDateString,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Length(1, 255)
  fullName?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @Matches(/^[A-Z]{3,10}$/)
  currencyCode?: string;

  @IsOptional()
  @Matches(/^\d+(\.\d{1,2})?$/)
  monthlyBudgetLimit?: string;
}
