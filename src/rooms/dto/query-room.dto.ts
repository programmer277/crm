import { Transform } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { trimToUndefined, toInt } from './_transforms';

const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

export class QueryRoomDto {
  @IsOptional()
  @Transform(({ value }) => {
    const n = toInt({ value });
    if (typeof n !== 'number') return undefined;
    return clamp(n, 1, 1_000_000);
  })
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Transform(({ value }) => {
    const n = toInt({ value });
    if (typeof n !== 'number') return undefined;
    return clamp(n, 1, 100);
  })
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @IsOptional()
  @Transform(trimToUndefined)
  @IsString()
  @MaxLength(80)
  search?: string;
}
