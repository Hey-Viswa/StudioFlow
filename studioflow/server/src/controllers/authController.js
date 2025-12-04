import User from '../models/User.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { logAudit } from '../services/auditService.js';

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

        // Log audit
        await logAudit({
            userId: user._id,
            action: 'register',
            resourceType: 'user',
            resourceId: user._id,
            details: { email: user.email, role: user.role },
            req
        });

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
            // Log failed login attempt (if we want to track non-existent users, maybe just log email)
            await logAudit({
                userId: 'system',
                action: 'login_failed',
                resourceType: 'system',
                resourceId: null,
                details: { email: normalizedEmail, reason: 'user_not_found' },
                status: 'failure',
                req
            });

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
            await logAudit({
                userId: user._id,
                action: 'login_failed',
                resourceType: 'user',
                resourceId: user._id,
                details: { reason: 'invalid_password' },
                status: 'failure',
                req
            });

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

        await logAudit({
            userId: user._id,
            action: 'login',
            resourceType: 'user',
            resourceId: user._id,
            req
        });

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
// Get current user profile
export async function getUserProfile(req, res) {
    try {
        // req.user is populated by verifyClerk middleware
        if (!req.user) {
            // If authenticated via Clerk but not in DB, return basic info with guest role
            // or 404 if we enforce DB presence
            return res.json({
                user: {
                    clerkId: req.userId,
                    email: req.userEmail,
                    name: req.userName,
                    role: 'guest', // Default role if not in DB
                    isGuest: true
                }
            });
        }

        return res.json({
            user: {
                id: req.user._id,
                clerkId: req.user.clerkUserId,
                email: req.user.email,
                name: req.user.name,
                role: req.user.role,
                subscription: req.user.subscription
            }
        });
    } catch (error) {
        console.error('Get profile error:', error);
        return res.status(500).json({ error: 'Failed to fetch profile' });
    }
}
