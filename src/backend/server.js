// Main Express server for Todo App

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

// Import route handlers
import authRoutes from './routes/auth.js';
import todoRoutes from './routes/todos.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Database setup
const db = new Database('data.db');

// Create tables
db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS todo_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        group_name TEXT DEFAULT 'default',
        sort_order INTEGER DEFAULT 0,
        priority INTEGER DEFAULT 1,
        done BOOLEAN DEFAULT 0,
        notes TEXT DEFAULT '',
        parent_node_id INTEGER DEFAULT NULL,
        category TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_changed DATETIME DEFAULT CURRENT_TIMESTAMP,
        done_at DATETIME,
        FOREIGN KEY (account_id) REFERENCES accounts (id),
        FOREIGN KEY (parent_node_id) REFERENCES todo_items (id)
    );
`);

// Add new columns to existing table if they don't exist
try {
    db.exec(`ALTER TABLE todo_items ADD COLUMN last_changed DATETIME DEFAULT CURRENT_TIMESTAMP;`);
} catch (e) {
    // Column already exists, ignore
}

try {
    db.exec(`ALTER TABLE todo_items ADD COLUMN done_at DATETIME;`);
} catch (e) {
    // Column already exists, ignore
}

try {
    db.exec(`ALTER TABLE todo_items ADD COLUMN notes TEXT DEFAULT '';`);
} catch (e) {
    // Column already exists, ignore
}

try {
    db.exec(`ALTER TABLE todo_items ADD COLUMN parent_node_id INTEGER DEFAULT NULL;`);
} catch (e) {
    // Column already exists, ignore
}

try {
    db.exec(`ALTER TABLE todo_items ADD COLUMN category TEXT DEFAULT '';`);
} catch (e) {
    // Column already exists, ignore
}

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Auth middleware
const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies.token;

    if (!token) {
        return res.status(401).json({ error: 'Missing token' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// Make db and authMiddleware available to routes
app.use((req, res, next) => {
    req.db = db;
    req.authMiddleware = authMiddleware;
    next();
});

// API Routes
app.use('/api', authRoutes);
app.use('/api', authMiddleware, todoRoutes);

// Static file serving with cache control
app.use(express.static(path.join(__dirname, '../../public'), {
    setHeaders: (res, path) => {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
}));

// Catch-all handler for SPA
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/index.html'));
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});

export { db, JWT_SECRET };
