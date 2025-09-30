import express from 'express';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import fs from 'fs';
import path from 'path';

const __dirname = path.resolve();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'data.db');

// Ensure DB exists and schema is created
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS todo_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  group_name TEXT DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  priority INTEGER NOT NULL DEFAULT 0,
  done INTEGER NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  parent_node_id INTEGER DEFAULT NULL,
  category TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  done_at TEXT DEFAULT NULL,
  FOREIGN KEY(account_id) REFERENCES accounts(id),
  FOREIGN KEY(parent_node_id) REFERENCES todo_items(id)
);

CREATE INDEX IF NOT EXISTS idx_todo_account_order ON todo_items(account_id, sort_order);
`);

// Add new columns to existing table if they don't exist
// First check if columns exist before trying to add them
const tableInfo = db.prepare("PRAGMA table_info(todo_items)").all();
const existingColumns = tableInfo.map(col => col.name);

if (!existingColumns.includes('notes')) {
    try {
        db.exec(`ALTER TABLE todo_items ADD COLUMN notes TEXT DEFAULT '';`);
        console.log('Added notes column');
    } catch (e) {
        console.log('Notes column already exists or error:', e.message);
    }
}

if (!existingColumns.includes('parent_node_id')) {
    try {
        db.exec(`ALTER TABLE todo_items ADD COLUMN parent_node_id INTEGER DEFAULT NULL;`);
        console.log('Added parent_node_id column');
    } catch (e) {
        console.log('Parent_node_id column already exists or error:', e.message);
    }
}

if (!existingColumns.includes('category')) {
    try {
        db.exec(`ALTER TABLE todo_items ADD COLUMN category TEXT DEFAULT '';`);
        console.log('Added category column');
    } catch (e) {
        console.log('Category column already exists or error:', e.message);
    }
}

if (!existingColumns.includes('done_at')) {
    try {
        db.exec(`ALTER TABLE todo_items ADD COLUMN done_at TEXT DEFAULT NULL;`);
        console.log('Added done_at column');
    } catch (e) {
        console.log('Done_at column already exists or error:', e.message);
    }
}

// Create indexes for new columns if they exist
try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_todo_parent ON todo_items(parent_node_id);`);
} catch (e) {
    console.log('Parent index creation failed:', e.message);
}

try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_todo_category ON todo_items(category);`);
} catch (e) {
    console.log('Category index creation failed:', e.message);
}

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

// Add no-cache headers to all API responses
app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

// Helpers
function createToken(account) {
    return jwt.sign({ id: account.id, email: account.email }, JWT_SECRET, { expiresIn: '7d' });
}

function authMiddleware(req, res, next) {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing token' });
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = payload;
        next();
    } catch (e) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}

// Auth endpoints
app.post('/api/register', (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });
    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(password + salt, 10);
    try {
        const stmt = db.prepare('INSERT INTO accounts (email, password_hash, salt) VALUES (?, ?, ?)');
        const info = stmt.run(email, password_hash, salt);
        const account = { id: info.lastInsertRowid, email };
        const token = createToken(account);
        return res.json({ token });
    } catch (e) {
        if (e && e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.status(409).json({ error: 'email already exists' });
        }
        return res.status(500).json({ error: 'registration failed' });
    }
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });
    const row = db.prepare('SELECT * FROM accounts WHERE email = ?').get(email);
    if (!row) return res.status(401).json({ error: 'invalid credentials' });
    const ok = bcrypt.compareSync(password + row.salt, row.password_hash);
    if (!ok) return res.status(401).json({ error: 'invalid credentials' });
    const token = createToken({ id: row.id, email: row.email });
    return res.json({ token });
});

// Todos CRUD
app.get('/api/todos', authMiddleware, (req, res) => {
    console.log('GET /api/todos - User ID:', req.user.id);
    const rows = db.prepare('SELECT id, name, group_name as "group", sort_order as "order", priority, done, notes, parent_node_id, category, created_at, last_changed, done_at FROM todo_items WHERE account_id = ? ORDER BY sort_order ASC').all(req.user.id);
    console.log('Found todos:', rows.length);
    const result = rows.map(r => ({
        ...r,
        done: !!r.done,
        last_changed: r.last_changed
    }));
    console.log('Returning todos:', result);
    res.json(result);
});

app.post('/api/todos', authMiddleware, (req, res) => {
    const { name, group = '', priority = 0, done = false, notes = '', parent_node_id = null, category = '' } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name required' });
    const maxOrderRow = db.prepare('SELECT COALESCE(MAX(sort_order), -1) as max_order FROM todo_items WHERE account_id = ?').get(req.user.id);
    const sort_order = (maxOrderRow?.max_order ?? -1) + 1;
    const done_at = done ? new Date().toISOString() : null;
    const info = db.prepare('INSERT INTO todo_items (account_id, name, group_name, sort_order, priority, done, notes, parent_node_id, category, done_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(req.user.id, name, group, sort_order, priority, done ? 1 : 0, notes, parent_node_id, category, done_at);
    const row = db.prepare('SELECT id, name, group_name as "group", sort_order as "order", priority, done, notes, parent_node_id, category, created_at, last_changed, done_at FROM todo_items WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({
        ...row,
        done: !!row.done,
        last_changed: row.last_changed
    });
});

app.put('/api/todos/:id', authMiddleware, (req, res) => {
    const { id } = req.params;
    const { name, group, priority, done, notes, parent_node_id, category } = req.body || {};
    const existing = db.prepare('SELECT * FROM todo_items WHERE id = ? AND account_id = ?').get(id, req.user.id);
    if (!existing) return res.status(404).json({ error: 'not found' });

    const newName = name ?? existing.name;
    const newGroup = group ?? existing.group_name;
    const newPriority = priority ?? existing.priority;
    const newDone = typeof done === 'boolean' ? (done ? 1 : 0) : existing.done;
    const newNotes = notes ?? existing.notes;
    const newParentNodeId = parent_node_id ?? existing.parent_node_id;
    const newCategory = category ?? existing.category;

    // Set done_at timestamp when marking as done
    const done_at = (typeof done === 'boolean' && done && !existing.done) ? new Date().toISOString() :
        (typeof done === 'boolean' && !done && existing.done) ? null : existing.done_at;

    db.prepare('UPDATE todo_items SET name = ?, group_name = ?, priority = ?, done = ?, notes = ?, parent_node_id = ?, category = ?, done_at = ?, last_changed = datetime(\'now\') WHERE id = ?')
        .run(newName, newGroup, newPriority, newDone, newNotes, newParentNodeId, newCategory, done_at, id);
    const row = db.prepare('SELECT id, name, group_name as "group", sort_order as "order", priority, done, notes, parent_node_id, category, created_at, last_changed, done_at FROM todo_items WHERE id = ?').get(id);
    res.json({
        ...row,
        done: !!row.done,
        last_changed: row.last_changed
    });
});

app.delete('/api/todos/:id', authMiddleware, (req, res) => {
    const { id } = req.params;
    const info = db.prepare('DELETE FROM todo_items WHERE id = ? AND account_id = ?').run(id, req.user.id);
    if (info.changes === 0) return res.status(404).json({ error: 'not found' });
    res.status(204).end();
});

// Get categories
app.get('/api/categories', authMiddleware, (req, res) => {
    console.log('GET /api/categories - User ID:', req.user.id);
    const rows = db.prepare('SELECT DISTINCT category FROM todo_items WHERE account_id = ? AND category != \'\' ORDER BY category ASC').all(req.user.id);
    const result = rows.map(r => r.category);
    console.log('Found categories:', result);
    res.json(result);
});

// Create a new category (by creating a todo with that category)
app.post('/api/categories', authMiddleware, (req, res) => {
    const { name } = req.body || {};
    if (!name || !name.trim()) return res.status(400).json({ error: 'category name required' });

    const categoryName = name.trim();

    // Check if category already exists
    const existing = db.prepare('SELECT DISTINCT category FROM todo_items WHERE account_id = ? AND category = ?').get(req.user.id, categoryName);
    if (existing) return res.status(409).json({ error: 'category already exists' });

    // Create a placeholder todo with this category to establish the category
    const maxOrderRow = db.prepare('SELECT COALESCE(MAX(sort_order), -1) as max_order FROM todo_items WHERE account_id = ?').get(req.user.id);
    const sort_order = (maxOrderRow?.max_order ?? -1) + 1;

    const info = db.prepare('INSERT INTO todo_items (account_id, name, group_name, sort_order, priority, done, category) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(req.user.id, `Category: ${categoryName}`, 'categories', sort_order, 0, 1, categoryName);

    // Delete the placeholder todo immediately
    db.prepare('DELETE FROM todo_items WHERE id = ?').run(info.lastInsertRowid);

    res.status(201).json({ name: categoryName });
});

// Rename a category
app.put('/api/categories/:oldName', authMiddleware, (req, res) => {
    const { oldName } = req.params;
    const { newName } = req.body || {};

    if (!newName || !newName.trim()) return res.status(400).json({ error: 'new category name required' });

    const newCategoryName = newName.trim();

    // Check if new category already exists
    const existing = db.prepare('SELECT DISTINCT category FROM todo_items WHERE account_id = ? AND category = ?').get(req.user.id, newCategoryName);
    if (existing) return res.status(409).json({ error: 'category already exists' });

    // Update all todos with the old category name
    const result = db.prepare('UPDATE todo_items SET category = ?, last_changed = datetime(\'now\') WHERE account_id = ? AND category = ?')
        .run(newCategoryName, req.user.id, oldName);

    if (result.changes === 0) return res.status(404).json({ error: 'category not found' });

    res.json({ oldName, newName: newCategoryName, updatedCount: result.changes });
});

// Delete a category
app.delete('/api/categories/:name', authMiddleware, (req, res) => {
    const { name } = req.params;

    // Remove category from all todos (set to empty string)
    const result = db.prepare('UPDATE todo_items SET category = \'\', last_changed = datetime(\'now\') WHERE account_id = ? AND category = ?')
        .run(req.user.id, name);

    if (result.changes === 0) return res.status(404).json({ error: 'category not found' });

    res.json({ name, removedCount: result.changes });
});

// Reorder endpoint: accepts array of ids in desired order
app.post('/api/todos/reorder', authMiddleware, (req, res) => {
    const { order } = req.body || {};
    if (!Array.isArray(order)) return res.status(400).json({ error: 'order must be array of ids' });
    const update = db.prepare('UPDATE todo_items SET sort_order = ?, updated_at = datetime(\'now\') WHERE id = ? AND account_id = ?');
    const txn = db.transaction((ids) => {
        ids.forEach((todoId, index) => {
            update.run(index, todoId, req.user.id);
        });
    });
    txn(order);
    const rows = db.prepare('SELECT id, name, group_name as "group", sort_order as "order", priority, done FROM todo_items WHERE account_id = ? ORDER BY sort_order ASC').all(req.user.id);
    res.json(rows.map(r => ({ ...r, done: !!r.done })));
});

// Serve static frontend with no-cache headers
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir);
app.use(express.static(publicDir, {
    setHeaders: (res, path) => {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
}));
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});


