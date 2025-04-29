const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

module.exports = function (req, res, next) {
    // Get token from header
    const authHeader = req.header('Authorization');
    console.log('Auth header received:', authHeader);

    const token = authHeader && authHeader.split(' ')[1];

    // Check if no token
    if (!token) {
        console.log('No token provided');
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    // Verify token
    try {
        console.log('Verifying token:', token.substring(0, 20) + '...');  // Log part of token for security
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Token verified, user:', decoded.user);

        req.user = decoded.user;
        next();
    } catch (err) {
        console.error('Token verification error:', err.message);
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ msg: 'Token has expired', error: 'expired' });
        }
        res.status(401).json({ msg: 'Token is not valid', error: err.message });
    }
};
