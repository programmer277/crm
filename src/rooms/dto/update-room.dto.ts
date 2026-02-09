import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { trimToUndefined, toInt } from './_transforms';

export class UpdateRoomDto {
  @IsOptional()
  @Transform(trimToUndefined)
  @IsString()
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @Transform(toInt)
  @IsInt()
  @Min(1)
  @Max(500)
  capacity?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
