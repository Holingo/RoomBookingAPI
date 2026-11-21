const { randomBytes } = require("node:crypto");

const connectionString = process.env.TEST_DATABASE_URL;
let databaseUrl;
try {
  databaseUrl = new URL(connectionString);
} catch {
  throw new Error("Set TEST_DATABASE_URL to a valid PostgreSQL test database URL.");
}

if (
  !["postgres:", "postgresql:"].includes(databaseUrl.protocol) ||
  !/^\/[a-zA-Z0-9_]+_test$/.test(databaseUrl.pathname)
) {
  throw new Error("TEST_DATABASE_URL must point to a PostgreSQL database ending in _test.");
}

process.env.NODE_ENV = "test";
process.env.DATABASE_URL = connectionString;
process.env.JWT_SECRET = randomBytes(32).toString("hex");
process.env.JWT_EXPIRES_IN = "15m";
