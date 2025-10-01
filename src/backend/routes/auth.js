// Authentication routes

import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Register endpoint
router.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        // Check if user already exists
        const existingUser = req.db.prepare('SELECT id FROM accounts WHERE email = ?').get(email);
        if (existingUser) {
            return res.status(409).json({ error: 'Email already exists' });
        }

        // Hash password
        const salt = bcrypt.genSaltSync(10);
        const passwordHash = bcrypt.hashSync(password, salt);

        // Create user
        const result = req.db.prepare(`
            INSERT INTO accounts (email, password_hash, salt) 
            VALUES (?, ?, ?)
        `).run(email, passwordHash, salt);

        // Generate token
        const token = jwt.sign(
            { id: result.lastInsertRowid, email },
            req.app.get('JWT_SECRET') || 'your-secret-key-change-in-production',
            { expiresIn: '7d' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.json({
            message: 'User created successfully',
            token,
            user: { id: result.lastInsertRowid, email }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login endpoint
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Login attempt for email:', email);

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        // Find user
        const user = req.db.prepare('SELECT * FROM accounts WHERE email = ?').get(email);
        console.log('User found:', user ? 'Yes' : 'No');
        if (user) {
            console.log('User ID:', user.id);
            console.log('User email:', user.email);
            console.log('Hash length:', user.password_hash ? user.password_hash.length : 'No hash');
            console.log('Hash start:', user.password_hash ? user.password_hash.substring(0, 20) : 'No hash');
        }

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password
        const isValid = bcrypt.compareSync(password, user.password_hash);
        console.log('Password valid:', isValid);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate token
        const token = jwt.sign(
            { id: user.id, email: user.email },
            req.app.get('JWT_SECRET') || 'your-secret-key-change-in-production',
            { expiresIn: '7d' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.json({
            message: 'Login successful',
            token,
            user: { id: user.id, email: user.email }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Logout endpoint
router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logout successful' });
});

export default router;
