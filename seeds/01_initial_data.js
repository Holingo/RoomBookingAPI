const buildings = [
  {
    name: "Budynek A",
    address: "ul. Warszawska 24, Kraków",
    rooms: [
      { name: "101", capacity: 30, participants: 10, startsInHours: 24 },
      { name: "102", capacity: 20, participants: 5, startsInHours: 48 },
      { name: "201", capacity: 50, participants: 40, startsInHours: 72, cancelled: true },
    ],
  },
  {
    name: "Budynek B",
    address: "ul. Kawiory 21, Kraków",
    rooms: [
      { name: "101", capacity: 15, participants: 12, startsInHours: -1 },
      { name: "Aula", capacity: 100, participants: 80, startsInHours: 96 },
    ],
  },
];

const HOUR_MS = 60 * 60 * 1000;

exports.seed = async function (knex) {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!email) {
    throw new Error("Set ADMIN_EMAIL before seeding demo data.");
  }

  await knex.transaction(async (trx) => {
    const admin = await trx("users").where({ email, role: "ADMIN" }).first("id");
    if (!admin) {
      throw new Error("Run the admin seed before seeding demo data.");
    }

    const now = Date.now();

    for (const { name, address, rooms } of buildings) {
      await trx("buildings").insert({ name, address }).onConflict("name").ignore();
      const building = await trx("buildings").where({ name }).first("id");

      for (const room of rooms) {
        const [createdRoom] = await trx("rooms")
          .insert({ building_id: building.id, name: room.name, capacity: room.capacity })
          .onConflict(["building_id", "name"]).ignore()
          .returning("id");
        if (!createdRoom) continue;

        const start = now + room.startsInHours * HOUR_MS;
        await trx("reservations").insert({
          room_id: createdRoom.id,
          user_id: admin.id,
          participants: room.participants,
          start_time: new Date(start),
          end_time: new Date(start + 2 * HOUR_MS),
          status: room.cancelled ? "CANCELLED" : "CONFIRMED",
          cancelled_at: room.cancelled ? new Date(now) : null,
        });
      }
    }
  });
};
