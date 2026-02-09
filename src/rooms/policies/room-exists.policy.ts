import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ROOM_SELECT, RoomView } from './room.types';

const mustNonEmpty = (v: unknown, msg: string): string => {
  if (typeof v !== 'string') throw new BadRequestException(msg);
  const s = v.trim();
  if (!s) throw new BadRequestException(msg);
  return s;
};

export async function roomMustExist(
  prisma: PrismaService,
  schoolId: string,
  id: string,
): Promise<RoomView> {
  const sid = mustNonEmpty(schoolId, 'schoolId yo‘q');
  const rid = mustNonEmpty(id, 'id yo‘q');

  const room = await prisma.room.findFirst({
    where: { id: rid, schoolId: sid, deletedAt: null },
    select: ROOM_SELECT,
  });

  if (!room) throw new NotFoundException('Xona topilmadi');
  return room;
}
