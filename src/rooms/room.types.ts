export const ROOM_SELECT = {
  id: true,
  schoolId: true,
  name: true,
  nameNormalized: true,
  capacity: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type RoomView = {
  id: string;
  schoolId: string;
  name: string;
  nameNormalized: string;
  capacity: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};
