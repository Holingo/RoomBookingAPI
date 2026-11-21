const jwt = require('jsonwebtoken');
const env = require('../config/env');

function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing or invalid token' } });
    }

    const token = authHeader.split(' ')[1];

    try {
        const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
        
        req.user = { id: payload.sub, role: payload.role };
        next();
    } catch (error) {
        const message = error.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
        return res.status(401).json({ error: { code: 'UNAUTHORIZED', message } });
    }
}

module.exports = authenticate;