import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export function throwRoomPrismaError(e: unknown): never {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === 'P2002') {
      throw new BadRequestException('Bu nomdagi xona allaqachon mavjud');
    }
    if (e.code === 'P2025') {
      throw new NotFoundException('Xona topilmadi');
    }
  }
  throw e;
}
