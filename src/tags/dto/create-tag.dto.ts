import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { TagType } from '../tag.enums';

export class CreateTagDto {
  @IsString()
  @Length(1, 100)
  name!: string;

  @IsEnum(TagType)
  type!: TagType;

  @IsOptional()
  @IsString()
  clientId?: string;
}
