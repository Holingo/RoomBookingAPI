const { createReservationsService } = require("../../src/modules/reservations/reservations.service");
const { createReservationsRepository } = require("../../src/modules/reservations/reservations.repository.memory");
const { createRoomsRepository } = require("../../src/modules/rooms/rooms.repository.memory");

const OWNER = { id: "10", role: "USER" };
const OTHER_USER = { id: "20", role: "USER" };
const ADMIN = { id: "30", role: "ADMIN" };
const START = "2030-05-01T10:00:00.000Z";
const END = "2030-05-01T11:00:00.000Z";

function setup(seededReservation, eventBus) {
  const roomsRepository = createRoomsRepository([
    { id: 1, capacity: 5 },
    { id: 2, capacity: 5 },
  ]);
  const reservationsRepository = createReservationsRepository(
    seededReservation ? [{
      id: 1,
      roomId: 1,
      user: { id: 10, email: "owner@example.test" },
      participants: 2,
      startTime: START,
      endTime: END,
      status: "CONFIRMED",
      cancelledAt: null,
      ...seededReservation,
    }] : [],
  );
  let currentTime = "2030-05-01T08:00:00.000Z";
  const service = createReservationsService({
    roomsRepository,
    reservationsRepository,
    eventBus,
    now: () => new Date(currentTime),
  });

  return {
    service,
    reservationsRepository,
    setTime(value) {
      currentTime = value;
    },
    create(overrides = {}) {
      return service.createReservation({
        roomId: 1,
        userId: 10,
        participants: 2,
        startTime: START,
        endTime: END,
        ...overrides,
      });
    },
  };
}

describe("createReservation", () => {
  test("publishes reservation.created after the repository saves the reservation", async () => {
    const eventBus = { publish: jest.fn() };
    const { create, reservationsRepository } = setup(undefined, eventBus);
    eventBus.publish.mockImplementation(async (_eventType, payload) => {
      expect(await reservationsRepository.findById(payload.reservationId)).not.toBeNull();
    });

    const reservation = await create();

    expect(eventBus.publish).toHaveBeenCalledTimes(1);
    expect(eventBus.publish).toHaveBeenCalledWith("reservation.created", {
      reservationId: reservation.id,
      roomId: 1,
      userId: 10,
      startTime: START,
      endTime: END,
    });
  });

  test("does not publish an event when the repository rejects the write", async () => {
    const eventBus = { publish: jest.fn() };
    const { create, reservationsRepository } = setup(undefined, eventBus);
    jest.spyOn(reservationsRepository, "create").mockRejectedValueOnce(
      new Error("Database write failed"),
    );

    await expect(create()).rejects.toThrow("Database write failed");
    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  test.each([
    ["partially overlaps", "2030-05-01T10:30:00.000Z", "2030-05-01T11:30:00.000Z"],
    ["contains an existing reservation", "2030-05-01T09:30:00.000Z", "2030-05-01T11:30:00.000Z"],
  ])("rejects a reservation that %s", async (_case, startTime, endTime) => {
    const { create } = setup({});

    await expect(create({ startTime, endTime })).rejects.toMatchObject({
      code: "ROOM_ALREADY_BOOKED",
    });
  });

  test("allows a reservation starting exactly when the previous one ends", async () => {
    const { create } = setup({});

    await expect(create({
      startTime: END,
      endTime: "2030-05-01T12:00:00.000Z",
    })).resolves.toMatchObject({ startTime: END, status: "CONFIRMED" });
  });

  test("allows the same interval in another room", async () => {
    const { create } = setup({});

    await expect(create({ roomId: 2 })).resolves.toMatchObject({
      roomId: 2,
      status: "CONFIRMED",
    });
  });

  test("allows the interval of a cancelled reservation", async () => {
    const { create } = setup({
      status: "CANCELLED",
      cancelledAt: "2030-05-01T07:00:00.000Z",
    });

    await expect(create()).resolves.toMatchObject({ startTime: START, status: "CONFIRMED" });
  });

  test("allows exactly the room capacity", async () => {
    const { create } = setup();

    await expect(create({ participants: 5 })).resolves.toMatchObject({
      participants: 5,
      status: "CONFIRMED",
    });
  });

  test("rejects one participant above capacity", async () => {
    const { create } = setup();

    await expect(create({ participants: 6 })).rejects.toMatchObject({
      code: "ROOM_CAPACITY_EXCEEDED",
    });
  });

  test.each([
    [15, "2030-05-01T10:15:00.000Z"],
    [480, "2030-05-01T18:00:00.000Z"],
  ])("allows a duration of %i minutes", async (_minutes, endTime) => {
    const { create } = setup();

    await expect(create({ endTime })).resolves.toMatchObject({ endTime, status: "CONFIRMED" });
  });

  test.each([
    [14, "2030-05-01T10:14:00.000Z"],
    [481, "2030-05-01T18:01:00.000Z"],
  ])("rejects a duration of %i minutes", async (_minutes, endTime) => {
    const { create } = setup();

    await expect(create({ endTime })).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      details: expect.arrayContaining([expect.objectContaining({ field: "endTime" })]),
    });
  });
});

describe("cancelReservation", () => {
  test("rejects cancellation after a reservation has started", async () => {
    const { service, setTime } = setup({});
    setTime("2030-05-01T10:30:00.000Z");

    await expect(service.cancelReservation(1, OWNER)).rejects.toMatchObject({
      code: "RESERVATION_ALREADY_STARTED",
    });
  });

  test("keeps the original cancelledAt when cancelled twice", async () => {
    const eventBus = { publish: jest.fn() };
    const { service, setTime } = setup({}, eventBus);
    const firstCancellation = "2030-05-01T08:00:00.000Z";

    await expect(service.cancelReservation(1, OWNER)).resolves.toMatchObject({
      status: "CANCELLED",
      cancelledAt: firstCancellation,
    });

    setTime("2030-05-01T09:00:00.000Z");

    await expect(service.cancelReservation(1, OWNER)).resolves.toMatchObject({
      status: "CANCELLED",
      cancelledAt: firstCancellation,
    });
    expect(eventBus.publish).toHaveBeenCalledTimes(1);
  });

  test("rejects a USER cancelling someone else's reservation", async () => {
    const { service, reservationsRepository } = setup({});

    await expect(service.cancelReservation(1, OTHER_USER)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(reservationsRepository.findById(1)).resolves.toMatchObject({
      status: "CONFIRMED",
      cancelledAt: null,
    });
  });

  test("allows an ADMIN to cancel someone else's reservation", async () => {
    const { service } = setup({});

    await expect(service.cancelReservation(1, ADMIN)).resolves.toMatchObject({
      status: "CANCELLED",
      cancelledAt: "2030-05-01T08:00:00.000Z",
    });
  });
});
