// Todo routes

import express from 'express';

const router = express.Router();

// POST test route - at the very beginning
router.post('/test-categories', (req, res) => {
    console.log('POST /test-categories called with body:', req.body);
    res.json({ message: 'Test category created', name: req.body.name });
});

// POST categories route - right after existing POST routes
router.post('/categories', (req, res) => {
    console.log('POST /categories called with body:', req.body);
    res.json({ message: 'Category created', name: req.body.name });
});

// Get all todos for authenticated user
router.get('/todos', (req, res) => {
    try {
        const rows = req.db.prepare(`
            SELECT t.id, t.name, t.group_name as "group", t.sort_order as "order", t.priority, t.done, 
                   t.notes, t.parent_node_id, t.category_id, c.name as category_name, t.last_changed, t.done_at
            FROM todo_items t
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE t.account_id = ? 
            ORDER BY t.sort_order ASC
        `).all(req.user.id);

        // Get categories for this user
        console.log('Getting categories for user ID:', req.user.id);
        const categories = req.db.prepare(`
            SELECT id, name 
            FROM categories 
            WHERE account_id = ? 
            ORDER BY name ASC
        `).all(req.user.id);
        console.log('Categories found for user', req.user.id, ':', categories);

        console.log('Returning todos and categories:', { todos: rows.length, categories: categories.length });
        res.json({
            todos: rows.map(r => ({ ...r, done: !!r.done })),
            categories: categories
        });
    } catch (error) {
        console.error('Get todos error:', error);
        res.status(500).json({ error: 'Failed to fetch todos' });
    }
});

// Create new todo
router.post('/todos', (req, res) => {
    try {
        console.log('POST /todos body:', req.body);
        const { name, group = 'default', priority = 1, done = false, notes = '', parent_node_id = null, category_id = null, category = '', _createCategory = false } = req.body;

        console.log('_createCategory value:', _createCategory, 'type:', typeof _createCategory);

        // Special handling for category creation
        if (_createCategory === true && name) {
            console.log('Creating category:', name);
            console.log('User ID from auth:', req.user.id);

            // Check if category already exists
            const existing = req.db.prepare(`
                        SELECT id FROM categories 
                        WHERE account_id = ? AND name = ?
                    `).get(req.user.id, name.trim());

            if (existing) {
                return res.status(409).json({ error: 'Category already exists' });
            }

            // Create the category
            const result = req.db.prepare(`
                INSERT INTO categories (account_id, name) 
                VALUES (?, ?)
            `).run(req.user.id, name.trim());

            return res.status(201).json({
                id: result.lastInsertRowid,
                name: name.trim(),
                _isCategory: true
            });
        }

        if (!name) {
            return res.status(400).json({ error: 'Todo name is required' });
        }

        // Get next sort order
        const lastTodo = req.db.prepare(`
            SELECT sort_order FROM todo_items 
            WHERE account_id = ? 
            ORDER BY sort_order DESC LIMIT 1
        `).get(req.user.id);

        const nextOrder = lastTodo ? lastTodo.sort_order + 1 : 0;

        const now = new Date().toISOString();
        const result = req.db.prepare(`
            INSERT INTO todo_items (account_id, name, group_name, sort_order, priority, done, notes, parent_node_id, category_id, category, last_changed, done_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(req.user.id, name, group, nextOrder, priority, done ? 1 : 0, notes, parent_node_id, category_id, category, now, done ? now : null);

        const newTodo = req.db.prepare(`
            SELECT id, name, group_name as "group", sort_order as "order", priority, done, 
                   notes, parent_node_id, category, last_changed, done_at
            FROM todo_items 
            WHERE id = ?
        `).get(result.lastInsertRowid);

        res.status(201).json({ ...newTodo, done: !!newTodo.done });
    } catch (error) {
        console.error('Create todo error:', error);
        res.status(500).json({ error: 'Failed to create todo' });
    }
});

// Update todo
router.put('/todos/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { name, group, priority, done, notes, parent_node_id, category_id, category } = req.body;

        console.log('PUT /todos/' + id, 'body:', req.body);
        console.log('category_id:', category_id, 'type:', typeof category_id);

        // Verify todo belongs to user
        const todo = req.db.prepare(`
            SELECT * FROM todo_items 
            WHERE id = ? AND account_id = ?
        `).get(id, req.user.id);

        if (!todo) {
            return res.status(404).json({ error: 'Todo not found' });
        }

        // Build update query dynamically
        const updates = [];
        const values = [];

        if (name !== undefined) {
            updates.push('name = ?');
            values.push(name);
        }
        if (group !== undefined) {
            updates.push('group_name = ?');
            values.push(group);
        }
        if (priority !== undefined) {
            updates.push('priority = ?');
            values.push(priority);
        }
        if (done !== undefined) {
            updates.push('done = ?');
            values.push(done ? 1 : 0);

            // Update done_at timestamp when marking as done
            if (done) {
                updates.push('done_at = ?');
                values.push(new Date().toISOString());
            } else {
                updates.push('done_at = NULL');
            }
        }
        if (notes !== undefined) {
            updates.push('notes = ?');
            values.push(notes);
        }
        if (parent_node_id !== undefined) {
            updates.push('parent_node_id = ?');
            values.push(parent_node_id);
        }
        if (category_id !== undefined) {
            updates.push('category_id = ?');
            values.push(category_id);
        }

        // Always update last_changed
        updates.push('last_changed = ?');
        values.push(new Date().toISOString());

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No updates provided' });
        }

        values.push(id, req.user.id);

        req.db.prepare(`
            UPDATE todo_items 
            SET ${updates.join(', ')} 
            WHERE id = ? AND account_id = ?
        `).run(...values);

        // Return updated todo
        const updatedTodo = req.db.prepare(`
            SELECT id, name, group_name as "group", sort_order as "order", priority, done, 
                   notes, parent_node_id, category, last_changed, done_at
            FROM todo_items 
            WHERE id = ? AND account_id = ?
        `).get(id, req.user.id);

        res.json({ ...updatedTodo, done: !!updatedTodo.done });
    } catch (error) {
        console.error('Update todo error:', error);
        res.status(500).json({ error: 'Failed to update todo' });
    }
});

// Delete todo
router.delete('/todos/:id', (req, res) => {
    try {
        const { id } = req.params;

        const result = req.db.prepare(`
            DELETE FROM todo_items 
            WHERE id = ? AND account_id = ?
        `).run(id, req.user.id);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Todo not found' });
        }

        res.json({ message: 'Todo deleted successfully' });
    } catch (error) {
        console.error('Delete todo error:', error);
        res.status(500).json({ error: 'Failed to delete todo' });
    }
});

// Reorder todos
router.post('/todos/reorder', (req, res) => {
    try {
        const { todos } = req.body;

        if (!Array.isArray(todos)) {
            return res.status(400).json({ error: 'Todos array is required' });
        }

        // Update sort order for each todo
        const updateStmt = req.db.prepare(`
            UPDATE todo_items 
            SET sort_order = ? 
            WHERE id = ? AND account_id = ?
        `);

        const transaction = req.db.transaction(() => {
            todos.forEach((todo, index) => {
                updateStmt.run(index, todo.id, req.user.id);
            });
        });

        transaction();

        // Return updated todos
        const updatedTodos = req.db.prepare(`
            SELECT id, name, group_name as "group", sort_order as "order", priority, done, 
                   notes, parent_node_id, category, last_changed, done_at
            FROM todo_items 
            WHERE account_id = ? 
            ORDER BY sort_order ASC
        `).all(req.user.id);

        res.json(updatedTodos.map(t => ({ ...t, done: !!t.done })));
    } catch (error) {
        console.error('Reorder todos error:', error);
        res.status(500).json({ error: 'Failed to reorder todos' });
    }
});

// Old categories endpoint removed - using new categories table instead

// Test endpoint
router.get('/test-categories', (req, res) => {
    res.json({ message: 'Test categories endpoint works', user: req.user.id });
});

// Get categories (using todos router since categories router has issues)
router.get('/categories', (req, res) => {
    try {
        console.log('GET /categories called, user ID:', req.user.id);

        // Check if categories table exists and has data
        const tableCheck = req.db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='categories'`).get();
        console.log('Categories table exists:', !!tableCheck);

        const rows = req.db.prepare(`
            SELECT id, name 
            FROM categories 
            WHERE account_id = ? 
            ORDER BY name ASC
        `).all(req.user.id);

        console.log('Categories found:', rows);
        console.log('Categories count:', rows.length);
        res.json(rows);
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

export default router;
