const request = require("supertest");
const db = require("../../db");
const { createApp } = require("../../src/app");
const { createBuildingsRepository } = require("../../src/modules/buildings/buildings.repository.knex");
const { createRoomsRepository } = require("../../src/modules/rooms/rooms.repository.knex");
const { createReservationsRepository } = require("../../src/modules/reservations/reservations.repository.knex");

const api = request(createApp({
  buildingsRepository: createBuildingsRepository(db),
  roomsRepository: createRoomsRepository(db),
  reservationsRepository: createReservationsRepository(db),
}));
const password = "Integration-test-password";
const reservationsPath = "/api/reservations";
let firstSlot;

beforeAll(async () => {
  const expectedDatabase = new URL(process.env.TEST_DATABASE_URL).pathname.slice(1);
  const { rows: [connection] } = await db.raw("SELECT current_database() AS database");
  if (connection.database !== expectedDatabase) {
    throw new Error("PostgreSQL connected to a database other than TEST_DATABASE_URL.");
  }
  await db.migrate.latest();
}, 30_000);

beforeEach(async () => {
  await db.raw("TRUNCATE TABLE reservations, rooms, buildings, users RESTART IDENTITY");
  firstSlot = Date.now() + 24 * 60 * 60 * 1000;
});

afterAll(async () => {
  await db.destroy();
});

async function registerAndLogin(email = "owner@example.test") {
  const credentials = { email, password };
  const registration = await api.post("/api/auth/register").send(credentials).expect(201);
  const login = await api.post("/api/auth/login").send(credentials).expect(200);

  return { user: registration.body, auth: `Bearer ${login.body.accessToken}` };
}

async function createBuilding() {
  const [building] = await db("buildings")
    .insert({ name: "Building A", address: "Test Street 1" })
    .returning("id");
  return building;
}

async function createRoom() {
  const building = await createBuilding();
  const [room] = await db("rooms")
    .insert({ building_id: building.id, name: "Room 101", capacity: 10 })
    .returning("id");
  return room;
}

function reservationBody(roomId, offsetMinutes = 0) {
  const start = firstSlot + offsetMinutes * 60_000;
  return {
    roomId,
    participants: 2,
    startTime: new Date(start).toISOString(),
    endTime: new Date(start + 60 * 60_000).toISOString(),
  };
}

test("registers a USER, logs in and returns the same user from GET /api/auth/me", async () => {
  const { user, auth } = await registerAndLogin();

  const response = await api.get("/api/auth/me").set("Authorization", auth).expect(200);

  expect(user).toMatchObject({ email: "owner@example.test", role: "USER" });
  expect(response.body).toMatchObject({ id: user.id, email: user.email, role: "USER" });
  expect(response.body).not.toHaveProperty("password_hash");
});

test("creates a reservation, sets Location and persists the record in PostgreSQL", async () => {
  const { user, auth } = await registerAndLogin();
  const room = await createRoom();
  const body = reservationBody(room.id);

  const response = await api.post(reservationsPath).set("Authorization", auth).send(body).expect(201);
  const id = response.body.id;
  expect(response.headers.location).toBe(`${reservationsPath}/${id}`);
  expect(response.body).toMatchObject({
    id: expect.any(Number),
    room: { id: room.id },
    user: { id: user.id },
    startTime: body.startTime,
    endTime: body.endTime,
    status: "CONFIRMED",
  });

  const row = await db("reservations").where({ id }).first();
  expect(row).toMatchObject({
    room_id: room.id,
    user_id: user.id,
    participants: body.participants,
    start_time: new Date(body.startTime),
    end_time: new Date(body.endTime),
    status: "CONFIRMED",
  });
});

test("returns 400 and identifies invalid reservation body fields", async () => {
  const { auth } = await registerAndLogin();
  const room = await createRoom();

  const response = await api.post(reservationsPath)
    .set("Authorization", auth)
    .send({ ...reservationBody(room.id), participants: 0, startTime: "invalid" })
    .expect(400);

  expect(response.body.error).toMatchObject({
    code: "VALIDATION_ERROR",
    details: expect.arrayContaining([
      expect.objectContaining({ location: "body", field: "participants" }),
      expect.objectContaining({ location: "body", field: "startTime" }),
    ]),
  });
});

test("returns 401 when the request has no token", async () => {
  const response = await api.get(reservationsPath).expect(401);

  expect(response.body.error.code).toBe("UNAUTHORIZED");
});

test("returns 403 when a USER attempts to create a room", async () => {
  const { auth } = await registerAndLogin();
  const building = await createBuilding();

  const response = await api.post("/api/rooms")
    .set("Authorization", auth)
    .send({ buildingId: building.id, name: "Room 102", capacity: 15 })
    .expect(403);

  expect(response.body.error.code).toBe("FORBIDDEN");
  expect(await db("rooms").where({ building_id: building.id }).first()).toBeUndefined();
});

test("returns 404 when a USER requests someone else's reservation", async () => {
  const owner = await registerAndLogin();
  const other = await registerAndLogin("other@example.test");
  const room = await createRoom();
  const created = await api.post(reservationsPath)
    .set("Authorization", owner.auth)
    .send(reservationBody(room.id))
    .expect(201);

  const path = created.headers.location;
  const visible = await api.get(path).set("Authorization", owner.auth).expect(200);
  expect(visible.body.id).toBe(created.body.id);

  const hidden = await api.get(path).set("Authorization", other.auth).expect(404);
  expect(hidden.body.error.code).toBe("NOT_FOUND");
});

test("returns 409 ROOM_ALREADY_BOOKED for overlapping reservations", async () => {
  const { auth } = await registerAndLogin();
  const room = await createRoom();
  await api.post(reservationsPath).set("Authorization", auth).send(reservationBody(room.id)).expect(201);

  const response = await api.post(reservationsPath)
    .set("Authorization", auth)
    .send(reservationBody(room.id, 30))
    .expect(409);

  expect(response.body.error.code).toBe("ROOM_ALREADY_BOOKED");
});

test("limits the page length while keeping the full count in meta.total", async () => {
  const { auth } = await registerAndLogin();
  const room = await createRoom();
  for (const offset of [0, 60, 120]) {
    await api.post(reservationsPath)
      .set("Authorization", auth)
      .send(reservationBody(room.id, offset))
      .expect(201);
  }

  const response = await api.get(reservationsPath)
    .set("Authorization", auth)
    .query({ page: 1, limit: 2 })
    .expect(200);

  expect(response.body.data).toHaveLength(2);
  expect(response.body.meta).toMatchObject({ page: 1, limit: 2, total: 3, totalPages: 2 });
});
