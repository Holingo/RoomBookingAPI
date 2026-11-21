function createRoomsRepository(db) {
    return {
        async findAll() {
            const rooms = await db("rooms").select("*");
            return rooms.map(row => ({
                id: row.id,
                buildingId: row.building_id,
                name: row.name,
                capacity: row.capacity,
                createdAt: row.created_at
            }));
        },

        async findById(id) {
            const row = await db("rooms")
                .join("buildings", "rooms.building_id", "buildings.id")
                .where("rooms.id", id)
                .select(
                    "rooms.id", "rooms.name", "rooms.capacity",
                    "buildings.id as b_id", "buildings.name as b_name"
                ).first();

            if (!row) return null;
            return {
                id: row.id,
                name: row.name,
                capacity: row.capacity,
                building: { id: row.b_id, name: row.b_name }
            };
        },
        
        async findByBuildingId(buildingId) {
            const rows = await db("rooms").where({ building_id: buildingId }).select("*");
            return rows.map(row => ({
                id: row.id, buildingId: row.building_id, name: row.name, capacity: row.capacity
            }));
        },
        
        async create(data) {
            const [row] = await db("rooms").insert({
                building_id: data.buildingId,
                name: data.name,
                capacity: data.capacity
            }).returning("*");
            return {
                id: row.id,
                buildingId: row.building_id,
                name: row.name,
                capacity: row.capacity,
                createdAt: row.created_at
            };
        }
    };
}
module.exports = { createRoomsRepository };