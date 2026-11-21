const authService = require('../services/auth.service');
const { loginSchema, registerSchema } = require('../schemas/auth.schema');

async function register(req, res, next) {
    try {
        const validatedData = registerSchema.parse(req.body);
        
        const user = await authService.registerUser(validatedData);
        
        res.status(201).json(user);
    } catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({ error: 'Bad Request', details: error.errors });
        }

        if (error.status === 409) {
            return res.status(409).json({ error: { code: 'EMAIL_TAKEN', message: 'Email is already in use.' } });
        }

        next(error);
    }
}

async function login(req, res, next) {
    try {
        const validatedData = loginSchema.parse(req.body);
        const result = await authService.loginUser(validatedData);
        res.json(result);
    } catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({ error: 'Bad Request', details: error.errors });
        }
        if (error.status === 401) {
            return res.status(401).json({ error: { code: error.code, message: error.message } });
        }
        next(error);
    }
}

async function me(req, res, next) {
    try {
        // req.user jest wstrzykiwane przez middleware authenticate
        const user = await authService.getUserById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
        }
        res.json(user);
    } catch (error) {
        next(error);
    }
}

module.exports = { register, login, me };