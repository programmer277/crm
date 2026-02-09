import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

import type { RoomView } from '../src/rooms/policies/room.types';

type RoomsListResponse = {
  meta: {
    page: number;
    pageSize: number;
    total: number;
    pages: number;
  };
  items: Array<{
    id: string;
    name: string;
    nameNormalized: string;
    capacity: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
};

type RoomResponse = {
  id: string;
  name: string;
  nameNormalized: string;
  capacity: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

describe('Rooms (e2e)', () => {
  let app: INestApplication;

  const schoolId = 'TEST_SCHOOL';
  const actorId = 'TEST_ACTOR';

  const run = `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;

  const http = () => request(app.getHttpServer());

  const withSchool = (r: request.Test) => r.set('x-school-id', schoolId);
  const withActor = (r: request.Test) => r.set('x-actor-id', actorId);
  const withSchoolActor = (r: request.Test) => withActor(withSchool(r));

  const createRoom = async (name: string, capacity: number) => {
    const res = await withSchoolActor(http().post('/api/rooms'))
      .send({ name, capacity })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    return res.body as {
      id: string;
      name: string;
      capacity: number;
      nameNormalized: string;
    };
  };

  beforeAll(async () => {
    const modRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = modRef.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.setGlobalPrefix('api'); // ✅ MANA SHU YERGA

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/rooms -> returns meta + items', async () => {
    const res = await withSchool(http().get('/api/rooms')).expect(200);

    expect(res.body).toHaveProperty('meta');
    expect(res.body).toHaveProperty('items');

    const body = res.body as RoomsListResponse;

    expect(Array.isArray(body.items)).toBe(true);
    expect(body.meta.page).toEqual(expect.any(Number));
    expect(body.meta.pageSize).toEqual(expect.any(Number));
    expect(body.meta.total).toEqual(expect.any(Number));
    expect(body.meta.pages).toEqual(expect.any(Number));
  });

  it('POST /api/rooms -> create + normalized name exists', async () => {
    const name = `Room A ${run}`;

    const res = await withSchoolActor(http().post('/api/rooms'))
      .send({ name, capacity: 10 })
      .expect(201);

    const body = res.body as RoomView;

    expect(body.name).toBe(name);
    expect(body.capacity).toBe(10);
    expect(typeof body.nameNormalized).toBe('string');
    expect(body.nameNormalized.length).toBeGreaterThan(0);
    expect(body.isActive).toBe(true);
  });

  it('POST /api/rooms -> duplicate should be 400', async () => {
    const name = `Room DUP ${run}`;

    await createRoom(name, 10);

    const dup = await withSchoolActor(http().post('/api/rooms'))
      .send({ name, capacity: 11 })
      .expect(400);

    expect(dup.body).toHaveProperty('statusCode', 400);
    expect(dup.body).toHaveProperty('message'); // yoki 'error'
  });

  it('PATCH /api/rooms/:id -> updates capacity and updatedAt changes', async () => {
    const room = await createRoom(`Room B ${run}`, 20);

    const updated = await withSchoolActor(http().patch(`/api/rooms/${room.id}`))
      .send({ capacity: 35 })
      .expect(200);

    const body = updated.body as RoomResponse;

    expect(body.id).toBe(room.id);
    expect(body.capacity).toBe(35);
    expect(new Date(body.updatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(body.createdAt).getTime(),
    );
  });

  it('PATCH /api/rooms/:id -> duplicate name on update should be 400', async () => {
    const a = await createRoom(`Room X ${run}`, 10);
    const b = await createRoom(`Room Y ${run}`, 10);

    await withSchoolActor(http().patch(`/api/rooms/${b.id}`))
      .send({ name: a.name })
      .expect(400);
  });

  it('DELETE /api/rooms/:id -> soft delete; then GET by id -> 404; list should not contain it', async () => {
    const room = await createRoom(`Room DEL ${run}`, 5);

    const del = await http()
      .delete(`/api/rooms/${room.id}`)
      .set('x-school-id', schoolId)
      .set('x-actor-id', actorId)
      .expect(200);

    // Senda response: { ok:true, deleted:boolean }
    expect(del.body).toHaveProperty('ok', true);
    expect(del.body).toHaveProperty('deleted', true);

    // Senda findOne deletedAt:null bo'lgani uchun -> 404
    await withSchool(http().get(`/api/rooms/${room.id}`)).expect(404);

    // list ham deletedAt:null qaytaradi -> bo'lmasligi kerak
    const list = await withSchool(http().get('/api/rooms')).expect(200);
    const body = list.body as RoomsListResponse;
    expect(body.items.map((x) => x.id)).not.toContain(room.id);
  });

  it('DELETE /api/rooms/:id?reason=... -> reason > 200 should be 400', async () => {
    const room = await createRoom(`Room REASON ${run}`, 5);

    await withSchoolActor(
      http()
        .delete(`/api/rooms/${room.id}`)
        .query({ reason: 'a'.repeat(201) }),
    ).expect(400);
  });

  it('soft delete -> allow re-create same name (unique ignores deletedAt)', async () => {
    const name = `Room C ${run}`;

    const room = await createRoom(name, 5);

    await withSchoolActor(http().delete(`/api/rooms/${room.id}`)).expect(200);

    const recreated = await createRoom(name, 6);
    expect(recreated.name).toBe(name);
    expect(recreated.capacity).toBe(6);
  });

  it('POST /api/rooms -> validation: empty name should be 400', async () => {
    await withSchoolActor(http().post('/api/rooms'))
      .send({ name: '   ', capacity: 10 })
      .expect(400);
  });

  it('POST /api/rooms -> validation: capacity < 1 should be 400', async () => {
    await withSchoolActor(http().post('/api/rooms'))
      .send({ name: `BadCap ${run}`, capacity: 0 })
      .expect(400);
  });

  it('GET /api/rooms/:id -> not found should be 404', async () => {
    await withSchool(http().get('/api/rooms/room_not_exists_123')).expect(404);
  });

  it('headers -> missing x-school-id should be 400', async () => {
    await http().get('/api/rooms').expect(400);
  });

  it('headers -> missing x-actor-id on POST should be 400', async () => {
    await withSchool(http().post('/api/rooms'))
      .send({ name: `NoActor ${run}`, capacity: 5 })
      .expect(400);
  });
});
