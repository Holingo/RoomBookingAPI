const db = require("../db");
const { createApp } = require("./app");
const env = require("./config/env");

const { createBuildingsRepository } = require("./modules/buildings/buildings.repository.knex");
const { createRoomsRepository } = require("./modules/rooms/rooms.repository.knex");
const { createReservationsRepository } = require("./modules/reservations/reservations.repository.knex");

const buildingsRepository = createBuildingsRepository(db);
const roomsRepository = createRoomsRepository(db);
const reservationsRepository = createReservationsRepository(db);

const app = createApp({
  buildingsRepository,
  roomsRepository,
  reservationsRepository,
});

const server = app.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT}`);
});

let stopping = false;

function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  console.log(`[${signal}] Closing HTTP server`);

  server.close(async (error) => {
    try {
      await db.destroy();
      if (error) throw error;
      console.log(`[${signal}] HTTP server and PostgreSQL pool closed`);
    } catch (shutdownError) {
      console.error(`[${signal}] Shutdown failed`, shutdownError);
      process.exitCode = 1;
    }
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
