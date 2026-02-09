import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { trim, toInt } from './_transforms';

export class CreateRoomDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80) // xona nomi juda uzun bo‘lmasin
  name!: string;

  @Transform(toInt)
  @IsInt()
  @Min(1)
  @Max(500) // real limit (xohlasang o‘zgartirasan)
  capacity!: number;
}
