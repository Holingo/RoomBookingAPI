const { NotFoundError } = require("../../errors/AppError");

function createBuildingsService({ buildingsRepository, roomsRepository }) {
    async function listBuildings() { return buildingsRepository.findAll(); }
    
    async function getBuilding(id) {
        const building = await buildingsRepository.findById(id);
        if (!building) throw new NotFoundError("Building");
        return building;
    }
    
    async function createBuilding(data) { return buildingsRepository.create(data); }
    
    async function getBuildingRooms(id) {
        const building = await buildingsRepository.findById(id);
        if (!building) throw new NotFoundError("Building");
        return roomsRepository.findByBuildingId(id);
    }

    return { listBuildings, getBuilding, createBuilding, getBuildingRooms };
}

module.exports = { createBuildingsService };