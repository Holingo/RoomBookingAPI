const { z } = require('zod');
require('dotenv').config();

const envSchema = z.object({
    DATABASE_URL: z.string().url(),
    JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters long"),
    JWT_EXPIRES_IN: z.string().default('15m'),
    PORT: z.coerce.number().default(3000)
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
    console.error("❌ Błąd konfiguracji środowiska:");
    parsedEnv.error.issues.forEach(issue => {
        console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    });

    process.exit(1);
}

module.exports = parsedEnv.data;