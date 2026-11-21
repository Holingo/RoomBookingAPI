/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    // 1. Dodajemy nową kolumnę bez wymogu NOT NULL (aby nie wywalić błędu przy istniejących wierszach)
    await knex.schema.alterTable('reservations', (table) => {
        table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
    });

    // 2. Przypisujemy istniejące rezerwacje z seeda do istniejącego konta (np. ADMINa utworzonego w zadaniu 1)
    const admin = await knex('users').where({ role: 'ADMIN' }).first();
    if (admin) {
        await knex('reservations').update({ user_id: admin.id });
    }

    // 3. Ustawiamy kolumnę user_id jako wymaganą (NOT NULL) i usuwamy starą kolumnę reserved_by
    await knex.schema.alterTable('reservations', (table) => {
        table.integer('user_id').notNullable().alter();
        table.dropColumn('reserved_by');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
    await knex.schema.alterTable('reservations', (table) => {
        table.string('reserved_by').defaultTo('Unknown');
    });
    await knex('reservations').update({ reserved_by: 'Admin' });
    await knex.schema.alterTable('reservations', (table) => {
        table.dropColumn('user_id');
    });
};
