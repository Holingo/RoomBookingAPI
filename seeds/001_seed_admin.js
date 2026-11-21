const bcrypt = require("bcryptjs");
const { registerSchema } = require("../src/schemas/auth.schema");

exports.seed = async function (knex) {
  const { email, password } = registerSchema.parse({
    email: process.env.ADMIN_EMAIL?.trim(),
    password: process.env.ADMIN_PASSWORD,
  });
  if (Buffer.byteLength(password, "utf8") > 72) {
    throw new Error("ADMIN_PASSWORD must be at most 72 bytes.");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [admin] = await knex("users")
    .insert({ email, password_hash: passwordHash, role: "ADMIN" })
    .onConflict("email")
    .merge({ password_hash: passwordHash })
    .where("users.role", "ADMIN")
    .returning("id");

  if (!admin) {
    throw new Error("ADMIN_EMAIL is already assigned to a non-admin user.");
  }
};
