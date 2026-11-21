function createBuildingsController(buildingsService) {
    return {
        async list(req, res) {
            const buildings = await buildingsService.listBuildings();
            res.json(buildings);
        },
        
        async getById(req, res) {
            const building = await buildingsService.getBuilding(req.validated.params.id);
            res.json(building);
        },
        
        async create(req, res) {
            const building = await buildingsService.createBuilding(req.validated.body);
            res.status(201).json(building);
        },

        async getRooms(req, res) { 
            res.json(await buildingsService.getBuildingRooms(req.validated.params.id)); 
        },
    };
}

module.exports = { createBuildingsController };