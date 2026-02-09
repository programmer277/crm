import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

const mustNonEmpty = (v: unknown, msg: string) => {
  if (typeof v !== 'string') throw new BadRequestException(msg);
  const s = v.trim();
  if (!s) throw new BadRequestException(msg);
  return s;
};

export async function roomNameMustBeUnique(
  prisma: PrismaService,
  schoolId: string,
  nameNormalized: string,
  excludeId?: string,
): Promise<void> {
  const sid = mustNonEmpty(schoolId, 'schoolId yo‘q');
  const nn = mustNonEmpty(nameNormalized, 'nameNormalized yo‘q');

  const exists = await prisma.room.findFirst({
    where: {
      schoolId: sid,
      nameNormalized: nn,
      deletedAt: null,
      ...(excludeId?.trim() ? { id: { not: excludeId.trim() } } : {}),
    },
    select: { id: true },
  });

  if (exists)
    throw new BadRequestException('Bu nomdagi xona allaqachon mavjud');
}
