import User from '../models/User.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const SALT_ROUNDS = 12;
const TOKEN_EXPIRY = '7d';

const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET environment variable is not set');
    }
    if (secret.length < 32) {
        console.warn('⚠️  JWT_SECRET should be at least 32 characters long for security');
    }
    return secret;
};

const validatePassword = (password) => {
    if (!password || password.length < 8) {
        return 'Password must be at least 8 characters long';
    }
    if (!/[A-Z]/.test(password)) {
        return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
        return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(password)) {
        return 'Password must contain at least one number';
    }
    return null;
};

// Register a new user
export async function register(req, res) {
    try {
        const { name, email, password, role } = req.body;
        
        // Validate required fields
        if (!name || !email || !password) {
            return res.status(400).json({ 
                error: 'Validation failed',
                message: 'Name, email and password are required' 
            });
        }

        // Validate password strength
        const passwordError = validatePassword(password);
        if (passwordError) {
            return res.status(400).json({ 
                error: 'Validation failed',
                message: passwordError 
            });
        }

        // Normalize email
        const normalizedEmail = email.toLowerCase().trim();
        
        // Check if user exists
        const exists = await User.findOne({ email: normalizedEmail });
        if (exists) {
            return res.status(409).json({ 
                error: 'Conflict',
                message: 'User with this email already exists' 
            });
        }

        // Hash password with higher salt rounds
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
        
        // Create user
        const user = await User.create({ 
            name: name.trim(), 
            email: normalizedEmail, 
            passwordHash, 
            role: role || 'editor'
        });

        // Generate token
        const token = jwt.sign(
            { 
                sub: user._id, 
                role: user.role, 
                email: user.email 
            }, 
            getJwtSecret(), 
            { expiresIn: TOKEN_EXPIRY }
        );

        return res.status(201).json({ 
            ok: true, 
            message: 'User registered successfully',
            token,
            user: { 
                id: user._id, 
                name: user.name, 
                email: user.email, 
                role: user.role 
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        
        // Handle mongoose validation errors
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ 
                error: 'Validation failed',
                message: messages.join(', ') 
            });
        }
        
        return res.status(500).json({ 
            error: 'Internal server error',
            message: 'Failed to register user' 
        });
    }
}

// Login user
export async function login(req, res) {
    try {
        const { email, password } = req.body;
        
        // Validate required fields
        if (!email || !password) {
            return res.status(400).json({ 
                error: 'Validation failed',
                message: 'Email and password are required' 
            });
        }

        // Normalize email
        const normalizedEmail = email.toLowerCase().trim();
        
        // Find user and include password hash for verification
        const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');
        
        if (!user) {
            return res.status(401).json({ 
                error: 'Authentication failed',
                message: 'Invalid credentials' 
            });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(403).json({ 
                error: 'Account disabled',
                message: 'Your account has been deactivated' 
            });
        }

        // Verify password
        const match = await bcrypt.compare(password, user.passwordHash);
        if (!match) {
            return res.status(401).json({ 
                error: 'Authentication failed',
                message: 'Invalid credentials' 
            });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Generate token
        const token = jwt.sign(
            { 
                sub: user._id, 
                role: user.role, 
                email: user.email 
            }, 
            getJwtSecret(), 
            { expiresIn: TOKEN_EXPIRY }
        );

        return res.json({ 
            ok: true,
            token, 
            user: { 
                id: user._id, 
                name: user.name, 
                email: user.email, 
                role: user.role,
                lastLogin: user.lastLogin
            } 
        });
    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ 
            error: 'Internal server error',
            message: 'Failed to login' 
        });
    }
}
