const {
  NotFoundError,
  ConflictError,
  ForbiddenError,
  ValidationError,
} = require("../../errors/AppError");
const { createEventBus } = require("../../events/eventBus");

const MIN_DURATION_MS = 15 * 60 * 1000;
const MAX_DURATION_MS = 8 * 60 * 60 * 1000;

const ALLOWED_TRANSITIONS = {
  CONFIRMED: ["CANCELLED"],
  CANCELLED: [],
};

function canAccessReservation(reservation, actor) {
  return actor.role === "ADMIN" || String(actor.id) === String(reservation.user.id);
}

function createReservationsService({
  roomsRepository,
  reservationsRepository,
  eventBus = createEventBus(),
  now = () => new Date(),
}) {
  async function createReservation(input) {
    const startMs = new Date(input.startTime).getTime();
    const endMs = new Date(input.endTime).getTime();
    const nowMs = now().getTime();

    const timeErrors = [];

    if (startMs <= nowMs) {
      timeErrors.push({
        location: "body",
        field: "startTime",
        message: "startTime must be in the future",
      });
    }

    if (endMs <= startMs) {
      timeErrors.push({
        location: "body",
        field: "endTime",
        message: "endTime must be later than startTime",
      });
    } else {
      const durationMs = endMs - startMs;
      if (durationMs < MIN_DURATION_MS || durationMs > MAX_DURATION_MS) {
        timeErrors.push({
          location: "body",
          field: "endTime",
          message:
            "Reservation duration must be between 15 minutes and 8 hours",
        });
      }
    }

    if (timeErrors.length > 0) {
      throw new ValidationError(timeErrors);
    }

    const room = await roomsRepository.findById(input.roomId);
    if (!room) throw new NotFoundError("Room");
    if (input.participants > room.capacity) {
      throw new ConflictError("Room capacity exceeded", "ROOM_CAPACITY_EXCEEDED");
    }

    const confirmedInRoom = await reservationsRepository.findByRoomAndStatus(
      input.roomId,
      "CONFIRMED",
    );
    const isOverlapping = confirmedInRoom.some((existing) => {
      const existingStartMs = new Date(existing.startTime).getTime();
      const existingEndMs = new Date(existing.endTime).getTime();
      return startMs <= existingEndMs && existingStartMs < endMs;
    });

    if (isOverlapping) {
      throw new ConflictError("Room is already booked", "ROOM_ALREADY_BOOKED");
    }

    const reservation = await reservationsRepository.create({
      roomId: input.roomId,
      userId: input.userId,
      participants: input.participants,
      startTime: input.startTime,
      endTime: input.endTime,
      status: "CONFIRMED",
      createdAt: new Date(nowMs).toISOString(),
    });

    await eventBus.publish("reservation.created", {
      reservationId: reservation.id,
      roomId: input.roomId,
      userId: reservation.user.id,
      startTime: reservation.startTime,
      endTime: reservation.endTime,
    });
    return reservation;
  }

  async function getReservationById(id, actor) {
    const reservation = await reservationsRepository.findById(id);
    if (!reservation || !canAccessReservation(reservation, actor)) {
      throw new NotFoundError("Reservation");
    }

    return reservation;
  }

  async function cancelReservation(id, actor) {
    const reservation = await reservationsRepository.findById(id);
    if (!reservation) {
      throw new NotFoundError("Reservation");
    }

    if (!canAccessReservation(reservation, actor)) {
      throw new ForbiddenError("Cannot cancel another user's reservation");
    }

    if (reservation.status === "CANCELLED") {
      return reservation;
    }

    if (!ALLOWED_TRANSITIONS[reservation.status]?.includes("CANCELLED")) {
      throw new ConflictError(
        `Cannot change status from ${reservation.status} to CANCELLED`,
        "INVALID_STATUS_TRANSITION"
      );
    }

    const startMs = new Date(reservation.startTime).getTime();
    const cancelledAt = now();
    if (startMs <= cancelledAt.getTime()) {
      throw new ConflictError(
        "Cannot cancel a reservation that has already started",
        "RESERVATION_ALREADY_STARTED"
      );
    }

    const { reservation: updated, changed } = await reservationsRepository.updateStatus(id, {
      status: "CANCELLED",
      cancelledAt: cancelledAt.toISOString(),
    });
    if (!updated) throw new NotFoundError("Reservation");

    if (changed) {
      await eventBus.publish("reservation.cancelled", {
        reservationId: updated.id,
        roomId: updated.room?.id ?? updated.roomId,
        userId: updated.user.id,
        cancelledBy: Number(actor.id),
      }, {
        actorRole: actor.role,
        ownerEmail: updated.user.email,
      });
    }
    return updated;
  }
  
  async function listReservations(filters) {
    if (filters.from && filters.to) {
      const fromMs = new Date(filters.from).getTime();
      const toMs = new Date(filters.to).getTime();
      // Błąd 400 jeśli from >= to
      if (fromMs >= toMs) {
        throw new ValidationError([{ location: "query", field: "from", message: "from must be earlier than to" }]);
      }
    }

    const { data, total } = await reservationsRepository.list(filters);

    const totalPages = Math.ceil(total / filters.limit) || 1;

    return {
      data,
      meta: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages,
      }
    };
  }

  return {
    createReservation,
    getReservationById,
    cancelReservation,
    listReservations,
  };
}

module.exports = { createReservationsService };
