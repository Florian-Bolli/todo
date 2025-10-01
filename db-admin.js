// Simple Database Admin Interface
import express from 'express';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 8083;

// Use production database path if in production
const DB_PATH = process.env.NODE_ENV === 'production' 
    ? '/opt/todo-app/current/data.db' 
    : 'data.db';

const db = new Database(DB_PATH);

app.use(express.json());
// Don't serve static files from public directory to avoid conflicts

// Serve the admin interface
app.get('/', (req, res) => {
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
            <h2>📊 Database Statistics</h2>
            <div id="stats-content">Loading...</div>
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
                // Detect if we're running under /admin path
                const apiBase = window.location.pathname.startsWith('/admin') ? '/admin/api' : '/api';
                
                // Load stats
                const statsResponse = await fetch(apiBase + '/stats');
                const stats = await statsResponse.json();
                document.getElementById('total-accounts').textContent = stats.accounts;
                document.getElementById('total-todos').textContent = stats.todos;
                document.getElementById('total-categories').textContent = stats.categories;

                // Load accounts
                const accountsResponse = await fetch(apiBase + '/accounts');
                const accounts = await accountsResponse.json();
                document.getElementById('accounts-content').innerHTML = createTable(accounts, ['id', 'email', 'created_at']);

                // Load todos
                const todosResponse = await fetch(apiBase + '/todos');
                const todos = await todosResponse.json();
                document.getElementById('todos-content').innerHTML = createTable(todos, ['id', 'name', 'done', 'category', 'created_at']);

                // Load categories
                const categoriesResponse = await fetch(apiBase + '/categories');
                const categories = await categoriesResponse.json();
                document.getElementById('categories-content').innerHTML = createTable(categories, ['name', 'count']);

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
            const apiBase = window.location.pathname.startsWith('/admin') ? '/admin/api' : '/api';
            
            try {
                const response = await fetch(apiBase + '/query', {
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

// API endpoints
app.get('/api/stats', (req, res) => {
    try {
        const accounts = db.prepare('SELECT COUNT(*) as count FROM accounts').get().count;
        const todos = db.prepare('SELECT COUNT(*) as count FROM todo_items').get().count;
        const categories = db.prepare("SELECT COUNT(DISTINCT category) as count FROM todo_items WHERE category != ''").get().count;
        
        res.json({ accounts, todos, categories });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/accounts', (req, res) => {
    try {
        const accounts = db.prepare('SELECT id, email, created_at FROM accounts ORDER BY created_at DESC LIMIT 20').all();
        res.json(accounts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/todos', (req, res) => {
    try {
        const todos = db.prepare(`
            SELECT id, name, done, category, created_at, account_id
            FROM todo_items
            ORDER BY created_at DESC LIMIT 50
        `).all();
        res.json(todos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/categories', (req, res) => {
    try {
        const categories = db.prepare(`
            SELECT DISTINCT category as name, COUNT(*) as count
            FROM todo_items
            WHERE category != ''
            GROUP BY category
            ORDER BY category
        `).all();
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/query', (req, res) => {
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

app.listen(PORT, () => {
    console.log(`🗄️  Database Admin Interface running at http://localhost:${PORT}`);
    console.log(`📊 View your Todo app database in the browser!`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down database admin...');
    db.close();
    process.exit(0);
});
