const { z } = require("zod");

const reservationIdParams = z.object({
    id: z.coerce.number().int().positive(),
});

const createReservationBody = z
    .object({
        roomId: z.number().int().positive(),
        participants: z.number().int().positive(),
        startTime: z.iso.datetime({ offset: true }),
        endTime: z.iso.datetime({ offset: true }),
    })
    .strict();

const listReservationsQuery = z.object({
    roomId: z.coerce.number().int().positive().optional(),
    buildingId: z.coerce.number().int().positive().optional(),
    status: z.enum(["CONFIRMED", "CANCELLED"]).optional(),
    from: z.string().datetime({ offset: true }).optional(),
    to: z.string().datetime({ offset: true }).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sort: z.enum(["startTime", "-startTime", "createdAt", "-createdAt", "participants", "-participants"]).default("startTime"),
});

module.exports = {
    reservationIdParams,
    createReservationBody,
    listReservationsQuery,
};