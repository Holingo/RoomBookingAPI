const { toReservationResponse } = require("./reservations.mapper");

function createReservationsController(reservationsService) {
  return {
    async getById(req, res) {
      const reservation = await reservationsService.getReservationById(
        req.validated.params.id,
        req.user,
      );
      res.status(200).json(toReservationResponse(reservation));
    },

    async list(req, res) {
      const result = await reservationsService.listReservations(req.validated.query);
      res.status(200).json(result);
    },
    
    async create(req, res) {
      const { roomId, participants, startTime, endTime } = req.body;
      const userId = req.user.id;
      
      const reservation = await reservationsService.createReservation({
        roomId, 
        userId,
        participants,
        startTime,
        endTime,
      });

      res.location(`/api/reservations/${reservation.id}`);
      res.status(201).json(toReservationResponse(reservation));
    },
    
    async cancel(req, res) {
      const id = Number(req.params.id);
      const reservation = await reservationsService.cancelReservation(id, req.user);
      res.status(200).json(toReservationResponse(reservation));
    },
  };
}

module.exports = { createReservationsController };
