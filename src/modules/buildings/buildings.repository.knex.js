function createBuildingsRepository(db) {
    return {
        async findAll() {
            const rows = await db("buildings")
                .select("buildings.id", "buildings.name", "buildings.address")
                .count("rooms.id as rooms_count")
                .leftJoin("rooms", "buildings.id", "rooms.building_id")
                .groupBy("buildings.id");

            return rows.map(r => ({
                id: r.id,
                name: r.name,
                address: r.address,
                roomsCount: parseInt(r.rooms_count, 10)
            }));
        },
        
        async findById(id) {
            const row = await db("buildings").where({ id }).first();
            return row ? { id: row.id, name: row.name, address: row.address } : null;
        },
        
        async create(data) {
            const [row] = await db("buildings").insert(data).returning("*");
            return { id: row.id, name: row.name, address: row.address };
        }
    };
}
module.exports = { createBuildingsRepository };