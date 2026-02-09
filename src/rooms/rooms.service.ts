import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { QueryRoomDto } from './dto/query-room.dto';
import { throwRoomPrismaError } from './policies/room-prisma-errors.policy';
import { PrismaService } from 'prisma/prisma.service';
import { Prisma } from '@prisma/client';

const normalizeName = (name: string) =>
  name.trim().replace(/\s+/g, ' ').toLowerCase();

const clampInt = (v: unknown, def: number, min: number, max: number) => {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, Math.trunc(n)));
};

const ensureNonEmptyTrimmed = (v: unknown, msg: string) => {
  // eslint-disable-next-line @typescript-eslint/no-base-to-string
  const s = String(v ?? '').trim();
  if (!s) throw new BadRequestException(msg);
  return s;
};

const ensurePositiveInt = (v: unknown, fieldName = 'Capacity') => {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n))
    throw new BadRequestException(`${fieldName} butun son bo‘lishi kerak`);
  if (n < 1)
    throw new BadRequestException(`${fieldName} 1 dan katta bo‘lishi kerak`);
  return n;
};

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly roomSelect = {
    id: true,
    name: true,
    nameNormalized: true,
    capacity: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
  } satisfies Prisma.RoomSelect;

  private assertIds(schoolId: string, id?: string) {
    if (!schoolId?.trim()) throw new BadRequestException('schoolId yo‘q');
    if (id !== undefined && !id?.trim())
      throw new BadRequestException('id yo‘q');
  }

  private assertActor(actorId: string) {
    if (!actorId?.trim()) throw new BadRequestException('actorId yo‘q');
  }

  private async ensureRoom(schoolId: string, id: string) {
    this.assertIds(schoolId, id);

    const room = await this.prisma.room.findFirst({
      where: { id, schoolId, deletedAt: null },
      select: this.roomSelect,
    });
    if (!room) throw new NotFoundException('Xona topilmadi');
    return room;
  }

  private async assertUniqueName(
    schoolId: string,
    nameNormalized: string,
    excludeId?: string,
  ) {
    const exists = await this.prisma.room.findFirst({
      where: {
        schoolId,
        nameNormalized,
        deletedAt: null,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (exists)
      throw new BadRequestException('Bu nomdagi xona allaqachon mavjud');
  }

  async create(schoolId: string, _actorId: string, dto: CreateRoomDto) {
    this.assertIds(schoolId);

    const name = ensureNonEmptyTrimmed(
      dto.name,
      'Xona nomi bo‘sh bo‘lishi mumkin emas',
    );
    const capacity = ensurePositiveInt(dto.capacity, 'Capacity');
    const nameNormalized = normalizeName(name);

    await this.assertUniqueName(schoolId, nameNormalized);

    try {
      return await this.prisma.room.create({
        data: { schoolId, name, nameNormalized, capacity, isActive: true },
        select: this.roomSelect,
      });
    } catch (e) {
      throwRoomPrismaError(e);
    }
  }

  async findAll(schoolId: string, q: QueryRoomDto) {
    this.assertIds(schoolId);

    const page = clampInt(q.page, 1, 1, 1_000_000);
    const pageSize = clampInt(q.pageSize, 20, 1, 100);

    const where: Prisma.RoomWhereInput = { schoolId, deletedAt: null };

    const rawSearch = q.search?.trim();
    if (rawSearch) {
      const sNorm = normalizeName(rawSearch);
      where.OR = [
        { name: { contains: rawSearch, mode: 'insensitive' } },
        { nameNormalized: { contains: sNorm } },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.room.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: this.roomSelect,
      }),
      this.prisma.room.count({ where }),
    ]);

    return {
      meta: { page, pageSize, total, pages: Math.ceil(total / pageSize) },
      items,
    };
  }

  async findOne(schoolId: string, id: string) {
    return this.ensureRoom(schoolId, id);
  }

  async update(
    schoolId: string,
    _actorId: string,
    id: string,
    dto: UpdateRoomDto,
  ) {
    const prev = await this.ensureRoom(schoolId, id);

    const data: Prisma.RoomUpdateManyMutationInput = {};

    if (dto.name !== undefined) {
      const name = ensureNonEmptyTrimmed(
        dto.name,
        'Xona nomi bo‘sh bo‘lishi mumkin emas',
      );
      const nameNormalized = normalizeName(name);

      if (nameNormalized !== prev.nameNormalized) {
        await this.assertUniqueName(schoolId, nameNormalized, id);
      }

      data.name = name;
      data.nameNormalized = nameNormalized;
    }

    if (dto.capacity !== undefined) {
      data.capacity = ensurePositiveInt(dto.capacity, 'Capacity');
    }

    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException(
        'Yangilash uchun hech qanday field yuborilmadi',
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    (data as any).updatedAt = new Date();

    try {
      const res = await this.prisma.room.updateMany({
        where: { id, schoolId, deletedAt: null },
        data,
      });

      if (res.count !== 1) throw new NotFoundException('Xona topilmadi');
      return await this.ensureRoom(schoolId, id);
    } catch (e) {
      throwRoomPrismaError(e);
    }
  }

  async toggleActive(
    schoolId: string,
    _actorId: string,
    id: string,
    isActive: boolean,
  ) {
    await this.ensureRoom(schoolId, id);

    try {
      const res = await this.prisma.room.updateMany({
        where: { id, schoolId, deletedAt: null },
        data: { isActive, updatedAt: new Date() },
      });

      if (res.count !== 1) throw new NotFoundException('Xona topilmadi');
      return await this.ensureRoom(schoolId, id);
    } catch (e) {
      throwRoomPrismaError(e);
    }
  }

  async softDelete(
    schoolId: string,
    actorId: string,
    id: string,
    reason?: string,
  ) {
    this.assertIds(schoolId, id);
    this.assertActor(actorId);

    try {
      const res = await this.prisma.room.updateMany({
        where: { id, schoolId, deletedAt: null },
        data: {
          deletedAt: new Date(),
          deletedById: actorId,
          deleteReason: reason?.trim() || null,
          isActive: false,
          updatedAt: new Date(),
        },
      });

      return { ok: true, deleted: res.count === 1 };
    } catch (e) {
      throwRoomPrismaError(e);
    }
  }

  async restore(schoolId: string, _actorId: string, id: string) {
    this.assertIds(schoolId, id);

    const room = await this.prisma.room.findFirst({
      where: { id, schoolId },
      select: { id: true, nameNormalized: true, deletedAt: true },
    });

    if (!room) throw new NotFoundException('Xona topilmadi');
    if (!room.deletedAt) return this.ensureRoom(schoolId, id);

    await this.assertUniqueName(schoolId, room.nameNormalized, id);

    try {
      const res = await this.prisma.room.updateMany({
        where: { id, schoolId, deletedAt: { not: null } },
        data: {
          deletedAt: null,
          deletedById: null,
          deleteReason: null,
          isActive: true,
          updatedAt: new Date(),
        },
      });

      if (res.count !== 1) throw new NotFoundException('Xona topilmadi');
      return await this.ensureRoom(schoolId, id);
    } catch (e) {
      throwRoomPrismaError(e);
    }
  }
}
