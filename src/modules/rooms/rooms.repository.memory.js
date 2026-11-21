function createRoomsRepository(seedRooms = []) {
  const rooms = structuredClone(seedRooms);

  return {
    async findAll() {
      return rooms;
    },

    async findById(id) {
      return rooms.find((r) => r.id === id) ?? null;
    },
  };
}

module.exports = { createRoomsRepository };