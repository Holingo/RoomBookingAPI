const knex = require("knex");
const knexfile = require("./knexfile");
const db = knex({
    ...knexfile.development,
    debug: process.env.NODE_ENV !== "test"
});

module.exports = db;
