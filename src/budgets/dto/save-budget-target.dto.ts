import { Type } from 'class-transformer';
import {
  ArrayUnique,
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsUUID,
  Max,
  Min,
  Matches,
  ValidateNested,
} from 'class-validator';

export class BudgetTargetAllocationDto {
  @IsUUID()
  tagId!: string;

  @Matches(/^(?!0+(?:\.0{1,2})?$)\d+(\.\d{1,2})?$/)
  amount!: string;
}

export class SaveBudgetTargetDto {
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @IsInt()
  @Min(2000)
  year!: number;

  @IsInt()
  @Min(1)
  @Max(100)
  warningThresholdPercent!: number;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique((allocation: BudgetTargetAllocationDto) => allocation.tagId)
  @ValidateNested({ each: true })
  @Type(() => BudgetTargetAllocationDto)
  allocations!: BudgetTargetAllocationDto[];
}
