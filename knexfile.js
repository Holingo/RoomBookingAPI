require("dotenv").config();

const env = require('./src/config/env');
module.exports = {
    development: {
        client: "pg",
        connection: env.DATABASE_URL,
        migrations: {
            directory: "./migrations",
        },
        seeds: {
            directory: "./seeds",
        },   
    }
};