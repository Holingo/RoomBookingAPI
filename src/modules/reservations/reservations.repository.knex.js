function createReservationsRepository(db) {
    return {
        async findById(id, connection = db) {
            const row = await connection("reservations")
                .join("rooms", "reservations.room_id", "rooms.id")
                .join("buildings", "rooms.building_id", "buildings.id")
                .join("users", "reservations.user_id", "users.id")
                .where("reservations.id", id)
                .select(
                    "reservations.*",
                    "rooms.id as r_id", "rooms.name as r_name",
                    "buildings.id as b_id", "buildings.name as b_name",
                            "users.id as u_id", "users.email as u_email"
                ).first();
            return row ? mapToNestedCamel(row) : null;
        },

        async list(filters = {}) {
            const { roomId, buildingId, status, from, to, page = 1, limit = 20, sort = "startTime" } = filters;

            const query = db("reservations")
                .join("rooms", "reservations.room_id", "rooms.id")
                .join("buildings", "rooms.building_id", "buildings.id")
                .join("users", "reservations.user_id", "users.id");
            
            if (roomId) query.where("reservations.room_id", roomId);
            if (buildingId) query.where("rooms.building_id", buildingId);
            if (status) query.where("reservations.status", status);

            if (to) query.where("reservations.start_time", "<", to);
            if (from) query.where("reservations.end_time", ">", from);
            
            const countQuery = query.clone().count("* as total").first();
            const countResult = await countQuery;
            const total = parseInt(countResult.total, 10);
            
            const isDesc = sort.startsWith("-");
            const sortFieldRaw = isDesc ? sort.substring(1) : sort;
            const sortMap = {
                startTime: "start_time",
                createdAt: "created_at",
                participants: "participants"
            };

            query.orderBy(`reservations.${sortMap[sortFieldRaw]}`, isDesc ? "desc" : "asc");
            query.orderBy("reservations.id", "asc"); // Stabilność (tie-breaker)[cite: 8]
            
            query.limit(limit).offset((page - 1) * limit);

            const rows = await query.select(
                "reservations.*",
                "rooms.id as r_id", "rooms.name as r_name",
                "buildings.id as b_id", "buildings.name as b_name",
                "users.id as u_id", "users.email as u_email"
            );

            return { data: rows.map(mapToNestedCamel), total };
        },
        
        async findByRoomAndStatus(roomId, status) {
            return db("reservations")
                .where({ room_id: roomId, status })
                .select("start_time as startTime", "end_time as endTime");
        },
        
        async create(data) {
            return db.transaction(async (trx) => {
                const [row] = await trx("reservations").insert({
                    room_id: data.roomId,
                    user_id: data.userId,
                    participants: data.participants,
                    start_time: data.startTime,
                    end_time: data.endTime,
                    status: data.status,
                    created_at: data.createdAt
                }).returning("id");

                return this.findById(row.id, trx);
            });
        },
        
        async updateStatus(id, { status, cancelledAt }) {
            return db.transaction(async (trx) => {
                await trx("reservations")
                    .where({ id })
                    .whereNot("status", status)
                    .update({ status, cancelled_at: cancelledAt });

                return this.findById(id, trx);
            });
        }
    };

    function mapToNestedCamel(row) {
        return {
            id: row.id,
            room: {
              id: row.r_id,
              name: row.r_name,
              buildings: {
                  id: row.b_id,
                  name: row.b_name
              }  
            },
            user: {
              id: row.u_id,
              email: row.u_email  
            },
            participants: row.participants,
            startTime: row.start_time.toISOString(),
            endTime: row.end_time.toISOString(),
            status: row.status,
            createdAt: row.created_at.toISOString(),
            cancelledAt: row.cancelled_at ? row.cancelled_at.toISOString() : null
        };
    }
}
module.exports = { createReservationsRepository };
