function registerReservationListeners(eventBus, auditLogRepository) {
  for (const eventType of ["reservation.created", "reservation.cancelled"]) {
    eventBus.on(eventType, (payload) => auditLogRepository.insert(eventType, payload));
  }

  eventBus.on("reservation.cancelled", ({ reservationId, userId, cancelledBy }, context) => {
    if (context?.actorRole === "ADMIN" && cancelledBy !== userId) {
      console.log(`[notification] to: ${context.ownerEmail} Reservation ${reservationId} cancelled by an administrator`);
    }
  });
}

module.exports = { registerReservationListeners };
