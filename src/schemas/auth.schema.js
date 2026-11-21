const { z } = require('zod');

const registerSchema = z.object({
    email: z.string().email().toLowerCase(),
    password: z.string().min(10).max(72)
}).strict();

const loginSchema = z.object({
    email: z.string().email().toLowerCase(),
    password: z.string().min(1) // Nie wymuszamy tu min. 10 znaków, żeby nie zdradzać polityki haseł przy logowaniu
}).strict();

module.exports = { registerSchema, loginSchema };