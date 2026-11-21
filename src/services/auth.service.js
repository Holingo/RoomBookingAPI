const bcrypt = require('bcryptjs');
const knex = require('../../db');
const jwt = require('jsonwebtoken');

async function registerUser({ email, password }) {
    const passwordHash = await bcrypt.hash(password, 10);

    try {
        const [newUser] = await knex('users').insert({
            email,
            password_hash: passwordHash,
            role: 'USER'
        }).returning(['id', 'email', 'role', 'created_at']);
        
        return {
            id: newUser.id,
            email: newUser.email,
            role: newUser.role,
            createdAt: newUser.created_at
        };
    } catch (error) {
        if (error.code === '23505') {
            const conflictError = new Error('EMAIL_TAKEN');
            conflictError.status = 409;
            conflictError.code = 'EMAIL_TAKEN';
            throw conflictError;
        }
        throw error;
    }
}

async function loginUser({ email, password }) {
    const user = await knex('users').where({ email }).first();
    
    const unauthorizedError = new Error('Invalid email or password');
    unauthorizedError.status = 401;
    unauthorizedError.code = 'UNAUTHORIZED';

    if (!user) throw unauthorizedError;

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) throw unauthorizedError;

    // Czas życia tokenu ze zmiennej środowiskowej, domyślnie 15m
    const expiresIn = process.env.JWT_EXPIRES_IN || '15m';
    
    const payload = {
        sub: String(user.id),
        role: user.role
    };
    
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
        algorithm: 'HS256',
        expiresIn
    });

    return {
        accessToken,
        tokenType: 'Bearer',
        expiresIn
    };
}

async function getUserById(id) {
    const user = await knex('users').where({ id }).first();
    if (!user) return null;

    return {
        id: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.created_at
    };
}

module.exports = { registerUser, loginUser, getUserById };