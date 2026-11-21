exports.up = function (knex) {
  return knex.schema.createTable("audit_log", (table) => {
    table.increments("id");
    table.string("event_type").notNullable();
    table.jsonb("payload").notNullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.index(["created_at", "id"]);
    table.index(["event_type", "created_at", "id"]);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable("audit_log");
};
