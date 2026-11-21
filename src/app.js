const express = require("express");
const requestLogger = require("./middleware/requestLogger");
const errorHandler = require("./middleware/errorHandler");
const notFound = require("./middleware/notFound");

const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./config/swagger.json');

const authRoutes = require("./routes/auth.routes");
const authenticate = require("./middleware/authenticate");

const { createBuildingsService } = require("./modules/buildings/buildings.service");
const { createBuildingsController } = require("./modules/buildings/buildings.controller");
const { createBuildingsRouter } = require("./modules/buildings/buildings.routes");

const { createRoomsService } = require("./modules/rooms/rooms.service");
const { createRoomsController } = require("./modules/rooms/rooms.controller");
const { createRoomsRouter } = require("./modules/rooms/rooms.routes");

const { createReservationsService } = require("./modules/reservations/reservations.service");
const { createReservationsController } = require("./modules/reservations/reservations.controller");
const { createReservationsRouter } = require("./modules/reservations/reservations.routes");

function createApp({ buildingsRepository, roomsRepository, reservationsRepository }) {
	const app = express();
	
	app.use(requestLogger);
	app.use(express.json());

	app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
	
	app.use('/api/auth', authRoutes);
	app.use(authenticate);

	const buildingsService = createBuildingsService({ buildingsRepository, roomsRepository });
	const buildingsController = createBuildingsController(buildingsService);
	app.use("/api/buildings", createBuildingsRouter(buildingsController));

	const roomsService = createRoomsService({ roomsRepository, buildingsRepository });
	const roomsController = createRoomsController(roomsService);
	app.use("/api/rooms", createRoomsRouter(roomsController));

	const reservationsService = createReservationsService({ roomsRepository, reservationsRepository });
	const reservationsController = createReservationsController(reservationsService);
	app.use("/api/reservations", createReservationsRouter(reservationsController));

	app.get("/api/debug/crash", () => {
		throw new Error("boom");
	});

	app.use(notFound)
	app.use(errorHandler);

	return app;
}

module.exports = { createApp };
