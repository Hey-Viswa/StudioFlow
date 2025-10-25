import User from '../models/User.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET environment variable is not set');
    }
    return secret;
};

// Register a new user
export async function register(req, res) {
    try {
        const { name, email, password, role } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Name, email and password are required' });
        }
        const normalizedEmail = email.toLowerCase();
        const exists = await User.findOne({ email: normalizedEmail });
        if (exists) {
            return res.status(400).json({ message: 'User already exists' });
        }
        const passwordHash = await bcrypt.hash(password, 10);
        const user = await User.create({ name, email: normalizedEmail, passwordHash, role });
        return res.json({ ok: true, message: 'User registered successfully', userId: user._id });
    } catch (error) {
        console.error('register error ', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

// Login user
export async function login(req, res) {
    try {
    const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'email and password required' });
    const normalizedEmail = email.toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
        if (!user) return res.status(401).json({ error: 'invalid credentials' });

        const match = await bcrypt.compare(password, user.passwordHash);
        if (!match) return res.status(401).json({ error: 'invalid credentials' });

    const token = jwt.sign({ sub: user._id, role: user.role, email: user.email }, getJwtSecret(), { expiresIn: '6h' });
        return res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
    } catch (err) {
        console.error('login error', err);
        return res.status(500).json({ error: 'server error' });
    }
}