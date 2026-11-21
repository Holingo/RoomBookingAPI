/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    // Aktywacja rozszerzenia btree_gist dla PostgreSQL
    await knex.raw('CREATE EXTENSION IF NOT EXISTS btree_gist');

    // Dodanie exclusion constraint uwzględniającego tylko rezerwacje CONFIRMED
    // Operator && dla tstzrange sprawdza nakładanie się przedziałów (domyślnie [) )
    await knex.raw(`
        ALTER TABLE reservations ADD CONSTRAINT no_double_booking
        EXCLUDE USING gist (
          room_id WITH =,
          tstzrange(start_time, end_time) WITH &&
        )
        WHERE (status = 'CONFIRMED')
    `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
    await knex.raw('ALTER TABLE reservations DROP CONSTRAINT no_double_booking');
    await knex.raw('DROP EXTENSION IF EXISTS btree_gist');
};
