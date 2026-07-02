import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
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
  @IsString()
  @Length(1, 255)
  deviceId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncPushItemDto)
  items!: SyncPushItemDto[];
}
