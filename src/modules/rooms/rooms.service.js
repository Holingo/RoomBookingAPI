const { NotFoundError } = require("../../errors/AppError");

function createRoomsService({ roomsRepository, buildingsRepository }) { // Dodano buildingsRepository
  async function listRooms() {
    return roomsRepository.findAll();
  }

  async function getRoom(id) {
    const room = await roomsRepository.findById(id);
    if (!room) throw new NotFoundError("Room");
    return room;
  }

  async function createRoom(data) {
    const building = await buildingsRepository.findById(data.buildingId);
    if (!building) {
      throw new NotFoundError("Building");
    }
    return roomsRepository.create(data);
  }

  return { listRooms, getRoom, createRoom };
}

module.exports = { createRoomsService };