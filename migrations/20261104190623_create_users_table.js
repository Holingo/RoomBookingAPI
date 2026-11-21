/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('users', (table) => {
        table.increments('id').primary();
        table.string('email').notNullable().unique(); // Wymóg: UNIQUE dla email
        table.string('password_hash').notNullable();
        table.string('role').notNullable().defaultTo('USER');
        // Wymóg: CHECK dla roli
        table.check('role IN (\'USER\', \'ADMIN\')');
        table.timestamp('created_at').defaultTo(knex.fn.now());
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.dropTableIfExists('users');
};
