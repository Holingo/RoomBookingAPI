/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    await knex.schema.createTable("buildings", (table) => {
        table.increments("id").primary();
        table.string("name").notNullable().unique(); // constraint: buildings.name - UNIQUE
        table.string("address").notNullable();
        table.timestamp("created_at", { useTz: true }).defaultTo(knex.fn.now());
    });

    await knex.schema.createTable("rooms", (table) => {
        table.increments("id").primary();
        table.integer("building_id").unsigned().notNullable()
            .references("id").inTable("buildings").onDelete("CASCADE");
        table.string("name").notNullable();
        table.integer("capacity").notNullable();
        table.timestamp("created_at", { useTz: true }).defaultTo(knex.fn.now());

        table.unique(["building_id", "name"]); // constraint: para (building_id, name) unikalna
    });

    // constraint: capacity > 0
    await knex.raw("ALTER TABLE rooms ADD CONSTRAINT rooms_capacity_check CHECK (capacity > 0)");

    await knex.schema.createTable("reservations", (table) => {
        table.increments("id").primary();
        table.integer("room_id").unsigned().notNullable()
            .references("id").inTable("rooms").onDelete("CASCADE");
        table.string("reserved_by").notNullable();
        table.integer("participants").notNullable();
        table.timestamp("start_time", { useTz: true }).notNullable(); // daty jako timestamptz
        table.timestamp("end_time", { useTz: true }).notNullable();
        table.string("status").notNullable();
        table.timestamp("cancelled_at", { useTz: true });
        table.timestamp("created_at", { useTz: true }).defaultTo(knex.fn.now());

        // indeks pod zapytanie sprawdzające kolizje
        table.index(["room_id", "start_time", "end_time"]);
    });

    // constraint: end_time > start_time
    await knex.raw("ALTER TABLE reservations ADD CONSTRAINT res_time_check CHECK (end_time > start_time)");
    // constraint: status
    await knex.raw(`ALTER TABLE reservations ADD CONSTRAINT res_status_check CHECK (status IN ('CONFIRMED', 'CANCELLED'))`);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
    await knex.schema.dropTableIfExists("reservations");
    await knex.schema.dropTableIfExists("rooms");
    await knex.schema.dropTableIfExists("buildings");
};
