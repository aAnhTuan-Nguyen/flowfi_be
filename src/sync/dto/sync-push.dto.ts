import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { SyncAction } from '../sync.enums';

export class SyncPushItemDto {
  @IsString()
  entityName!: string;

  @IsOptional()
  @IsUUID()
  entityId?: string;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsEnum(SyncAction)
  action!: SyncAction;

  @IsObject()
  payload!: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  version?: number;
}

export class SyncPushDto {
  @IsOptional()
  @IsUUID()
  deviceUuid?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncPushItemDto)
  items!: SyncPushItemDto[];
}
