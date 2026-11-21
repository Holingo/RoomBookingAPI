function createReservationsRepository(seedReservations = []) {
  const reservations = structuredClone(seedReservations);
  
  let nextReservationId =
    Math.max(0, ...reservations.map((r) => r.id)) + 1;

  return {
    async findById(id) {
      return reservations.find((r) => r.id === id) ?? null;
    },

    async list({ roomId } = {}) {
      return reservations.filter(
        (r) => roomId === undefined || r.roomId === roomId
      );
    },

    async findByRoomAndStatus(roomId, status) {
      return reservations.filter(
        (r) => r.roomId === roomId && r.status === status
      );
    },

    async create(data) {
      const reservation = {
        id: nextReservationId++,
        roomId: data.roomId,
        user: { id: data.userId },
        participants: data.participants,
        startTime: data.startTime,
        endTime: data.endTime,
        status: data.status,
        createdAt: data.createdAt,
        cancelledAt: null,
        internalNote: "created via API",
      };
      reservations.push(reservation);
      return reservation;
    },

    async updateStatus(id, { status, cancelledAt }) {
      const reservation = reservations.find((r) => r.id === id);
      if (!reservation) return null;
      if (reservation.status === status) return reservation;

      reservation.status = status;
      reservation.cancelledAt = cancelledAt;
      return reservation;
    },
  };
}

module.exports = { createReservationsRepository };
