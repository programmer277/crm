import type { Prisma } from '@prisma/client';

export const ROOM_SELECT = {
  id: true,
  schoolId: true,
  name: true,
  nameNormalized: true,
  capacity: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.RoomSelect;

export type RoomView = Prisma.RoomGetPayload<{ select: typeof ROOM_SELECT }>;
