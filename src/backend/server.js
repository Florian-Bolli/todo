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

// Set JWT_SECRET on app for routes to access
app.set('JWT_SECRET', JWT_SECRET);

// Database setup
const db = new Database('databases/production/todo-app.db');

// Create tables
db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (account_id) REFERENCES accounts (id),
        UNIQUE(account_id, name)
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
        category_id INTEGER DEFAULT NULL,
        category TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_changed DATETIME DEFAULT CURRENT_TIMESTAMP,
        done_at DATETIME,
        FOREIGN KEY (account_id) REFERENCES accounts (id),
        FOREIGN KEY (parent_node_id) REFERENCES todo_items (id),
        FOREIGN KEY (category_id) REFERENCES categories (id)
    );
`);

// Add new columns to existing table if they don't exist
try {
    db.exec(`ALTER TABLE todo_items ADD COLUMN last_changed DATETIME DEFAULT CURRENT_TIMESTAMP;`);
} catch (e) {
    // Column already exists, ignore
}

try {
    db.exec(`ALTER TABLE todo_items ADD COLUMN category_id INTEGER DEFAULT NULL;`);
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
        console.log('Auth middleware - decoded user:', decoded);
        req.user = decoded;
        next();
    } catch (error) {
        console.log('Auth middleware - token verification failed:', error.message);
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
console.log('Registering API routes...');

// Apply auth middleware to all API routes except auth routes
app.use('/api', (req, res, next) => {
    // Skip auth middleware for auth routes (login, register, logout)
    if (req.path.startsWith('/auth') || req.path === '/login' || req.path === '/register' || req.path === '/logout') {
        return next();
    }
    authMiddleware(req, res, next);
});

app.use('/api', authRoutes);
app.use('/api', todoRoutes);
console.log('API routes registered.');

// Static file serving with cache control (only for non-API routes)
app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
        return next(); // Skip static file serving for API routes
    }
    express.static(path.join(__dirname, '../../public'), {
        setHeaders: (res, path) => {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
    })(req, res, next);
});

// Catch-all handler for SPA (only for non-API routes)
app.use((req, res, next) => {
    console.log('Catch-all handler hit:', req.path);
    // Don't serve HTML for API routes
    if (req.path.startsWith('/api')) {
        console.log('API route not found:', req.path);
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path.join(__dirname, '../../public/index.html'));
});

// Database Admin Route (simple interface)
app.get('/db-admin', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Database Admin - Todo App</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
        .section { margin: 20px 0; }
        .section h2 { color: #555; background: #f8f9fa; padding: 10px; border-left: 4px solid #007bff; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; font-weight: bold; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .stats { display: flex; gap: 20px; margin: 20px 0; }
        .stat-card { background: #e3f2fd; padding: 15px; border-radius: 5px; text-align: center; min-width: 120px; }
        .stat-number { font-size: 24px; font-weight: bold; color: #1976d2; }
        .stat-label { font-size: 14px; color: #666; }
        .query-section { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .query-input { width: 100%; height: 100px; font-family: monospace; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
        .query-button { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; margin-top: 10px; }
        .query-button:hover { background: #0056b3; }
        .result { margin-top: 15px; }
        .error { color: #d32f2f; background: #ffebee; padding: 10px; border-radius: 4px; }
        .success { color: #2e7d32; background: #e8f5e8; padding: 10px; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🗄️ Database Admin - Todo App</h1>
        
        <div class="stats">
            <div class="stat-card">
                <div class="stat-number" id="total-accounts">-</div>
                <div class="stat-label">Accounts</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="total-todos">-</div>
                <div class="stat-label">Todos</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="total-categories">-</div>
                <div class="stat-label">Categories</div>
            </div>
        </div>

        <div class="section">
            <h2>👥 Accounts</h2>
            <div id="accounts-content">Loading...</div>
        </div>

        <div class="section">
            <h2>📝 Todos</h2>
            <div id="todos-content">Loading...</div>
        </div>

        <div class="section">
            <h2>🏷️ Categories</h2>
            <div id="categories-content">Loading...</div>
        </div>

        <div class="query-section">
            <h2>🔍 Custom SQL Query</h2>
            <textarea class="query-input" id="sql-query" placeholder="Enter SQL query here...">SELECT * FROM accounts LIMIT 5;</textarea>
            <br>
            <button class="query-button" onclick="executeQuery()">Execute Query</button>
            <div id="query-result" class="result"></div>
        </div>
    </div>

    <script>
        async function loadData() {
            try {
                // Load stats
                const statsResponse = await fetch('/api/db-stats');
                const stats = await statsResponse.json();
                document.getElementById('total-accounts').textContent = stats.accounts;
                document.getElementById('total-todos').textContent = stats.todos;
                document.getElementById('total-categories').textContent = stats.categories;

                // Load accounts
                const accountsResponse = await fetch('/api/db-accounts');
                const accounts = await accountsResponse.json();
                document.getElementById('accounts-content').innerHTML = createTable(accounts, ['id', 'email', 'created_at']);

                // Load todos
                const todosResponse = await fetch('/api/db-todos');
                const todos = await todosResponse.json();
                document.getElementById('todos-content').innerHTML = createTable(todos, ['id', 'name', 'done', 'category', 'created_at']);

                // Load categories
                const categoriesResponse = await fetch('/api/db-categories');
                const categories = await categoriesResponse.json();
                document.getElementById('categories-content').innerHTML = createTable(categories, ['id', 'name', 'account_id']);

            } catch (error) {
                console.error('Error loading data:', error);
            }
        }

        function createTable(data, columns) {
            if (!data || data.length === 0) return '<p>No data found</p>';
            
            let html = '<table><thead><tr>';
            columns.forEach(col => {
                html += '<th>' + col + '</th>';
            });
            html += '</tr></thead><tbody>';
            
            data.forEach(row => {
                html += '<tr>';
                columns.forEach(col => {
                    const value = row[col];
                    html += '<td>' + (value !== null && value !== undefined ? value : '-') + '</td>';
                });
                html += '</tr>';
            });
            
            html += '</tbody></table>';
            return html;
        }

        async function executeQuery() {
            const query = document.getElementById('sql-query').value;
            const resultDiv = document.getElementById('query-result');
            
            try {
                const response = await fetch('/api/db-query', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query })
                });
                
                const result = await response.json();
                
                if (result.error) {
                    resultDiv.innerHTML = '<div class="error">Error: ' + result.error + '</div>';
                } else {
                    resultDiv.innerHTML = '<div class="success">Query executed successfully!</div>' + createTable(result.data, Object.keys(result.data[0] || {}));
                }
            } catch (error) {
                resultDiv.innerHTML = '<div class="error">Error: ' + error.message + '</div>';
            }
        }

        // Load data on page load
        loadData();
    </script>
</body>
</html>
    `);
});

// Database Admin API endpoints
app.get('/api/db-stats', (req, res) => {
    try {
        const accounts = db.prepare('SELECT COUNT(*) as count FROM accounts').get().count;
        const todos = db.prepare('SELECT COUNT(*) as count FROM todo_items').get().count;
        const categories = db.prepare('SELECT COUNT(*) as count FROM categories').get().count;

        res.json({ accounts, todos, categories });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/db-accounts', (req, res) => {
    try {
        const accounts = db.prepare('SELECT id, email, created_at FROM accounts ORDER BY created_at DESC LIMIT 20').all();
        res.json(accounts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/db-todos', (req, res) => {
    try {
        const todos = db.prepare(`
            SELECT t.id, t.name, t.done, c.name as category, t.created_at
            FROM todo_items t
            LEFT JOIN categories c ON t.category_id = c.id
            ORDER BY t.created_at DESC LIMIT 50
        `).all();
        res.json(todos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/db-categories', (req, res) => {
    try {
        const categories = db.prepare('SELECT id, name, account_id FROM categories ORDER BY name').all();
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/db-query', (req, res) => {
    try {
        const { query } = req.body;

        // Basic security check - only allow SELECT statements
        if (!query.trim().toLowerCase().startsWith('select')) {
            return res.status(400).json({ error: 'Only SELECT queries are allowed' });
        }

        const result = db.prepare(query).all();
        res.json({ data: result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
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
