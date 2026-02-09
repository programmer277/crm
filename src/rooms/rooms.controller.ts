import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { QueryRoomDto } from './dto/query-room.dto';

type HeadersMap = Record<string, unknown>;

function headerString(headers: HeadersMap, key: string): string {
  // Nest headers keys usually lower-case
  const raw = headers[key.toLowerCase()];
  if (Array.isArray(raw)) return String(raw[0] ?? '').trim();
  // eslint-disable-next-line @typescript-eslint/no-base-to-string
  return String(raw ?? '').trim();
}

function mustNonEmpty(value: string, msg: string): string {
  const v = value.trim();
  if (!v) throw new BadRequestException(msg);
  return v;
}

function optionalTrim(value?: string): string | undefined {
  const v = String(value ?? '').trim();
  return v ? v : undefined;
}

@Controller('rooms')
export class RoomsController {
  constructor(private readonly rooms: RoomsService) {}

  private schoolId(headers: HeadersMap) {
    return mustNonEmpty(
      headerString(headers, 'x-school-id'),
      'x-school-id header yo‘q',
    );
  }

  private actorId(headers: HeadersMap) {
    return mustNonEmpty(
      headerString(headers, 'x-actor-id'),
      'x-actor-id header yo‘q',
    );
  }

  private idParam(id: string) {
    return mustNonEmpty(String(id ?? ''), 'id yo‘q');
  }

  @Post()
  create(@Headers() headers: HeadersMap, @Body() dto: CreateRoomDto) {
    const schoolId = this.schoolId(headers);
    const actorId = this.actorId(headers);
    return this.rooms.create(schoolId, actorId, dto);
  }

  @Get()
  findAll(@Headers() headers: HeadersMap, @Query() q: QueryRoomDto) {
    const schoolId = this.schoolId(headers);
    return this.rooms.findAll(schoolId, q);
  }

  @Get(':id')
  findOne(@Headers() headers: HeadersMap, @Param('id') id: string) {
    const schoolId = this.schoolId(headers);
    return this.rooms.findOne(schoolId, this.idParam(id));
  }

  @Patch(':id')
  update(
    @Headers() headers: HeadersMap,
    @Param('id') id: string,
    @Body() dto: UpdateRoomDto,
  ) {
    const schoolId = this.schoolId(headers);
    const actorId = this.actorId(headers);
    return this.rooms.update(schoolId, actorId, this.idParam(id), dto);
  }

  @Delete(':id')
  remove(
    @Headers() headers: HeadersMap,
    @Param('id') id: string,
    @Query('reason') reason?: string,
  ) {
    const schoolId = this.schoolId(headers);
    const actorId = this.actorId(headers);

    const cleanedReason = optionalTrim(reason);
    if (cleanedReason && cleanedReason.length > 200) {
      throw new BadRequestException('reason 200 belgidan oshmasin');
    }

    return this.rooms.softDelete(
      schoolId,
      actorId,
      this.idParam(id),
      cleanedReason,
    );
  }
}
