import { IsEnum } from 'class-validator';
import { ConflictResolution } from '../sync.enums';

export class ResolveConflictDto {
  @IsEnum(ConflictResolution)
  resolution!: ConflictResolution;
}
