// Main Todo App Application

import { authAPI, todosAPI, categoriesAPI, getToken, setToken, flushQueue } from './api.js';
import { Login, TodoItem, FilterControls, TodoInput, Status } from './components.js';
import { DragHandler } from './drag-handler.js';

class TodoApp {
    constructor() {
        this.todos = [];
        this.categories = [];
        this.filter = 'separate'; // Default to separate view
        this.editingTodo = null;
        this.doneAgeFilter = 7; // Show done items from last 7 days by default
        this.expandedTodos = new Set(); // Track which todos are expanded
        this.dragHandler = new DragHandler((fromIndex, toIndex) => {
            this.handleReorder(fromIndex, toIndex);
        });

        this.init();
    }

    async init() {
        // Check if we have a valid token
        const token = getToken();
        if (token) {
            try {
                await todosAPI.getAll();
                this.showTodoApp();
            } catch (error) {
                setToken('');
                this.showLogin();
            }
        } else {
            this.showLogin();
        }

        // Flush offline queue when back online
        window.addEventListener('online', () => {
            flushQueue().then(() => {
                this.load();
            });
        });
    }

    showLogin() {
        const container = document.getElementById('app');
        container.innerHTML = '';
        container.appendChild(Login({ onLogin: this.handleLogin.bind(this) }));
    }

    showTodoApp() {
        const container = document.getElementById('app');
        container.innerHTML = '';

        const todoApp = document.createElement('div');
        todoApp.className = 'todo-app';
        todoApp.innerHTML = `
            <div class="header">
                <div class="header-content">
                    <h1>ToDo List</h1>
                    <a href="#" class="logout-link" onclick="app.handleLogout(); return false;">Logout</a>
                </div>
            </div>
        `;

        container.appendChild(todoApp);

        this.renderTodoApp(todoApp);
        this.load();
    }

    renderTodoApp(container) {
        // Add todo input
        const todoInput = TodoInput({ onAdd: this.handleAdd.bind(this) });
        container.appendChild(todoInput);

        // Add filter controls
        const filterControls = FilterControls({
            filter: this.filter,
            onFilterChange: this.handleFilterChange.bind(this),
            doneAgeFilter: this.doneAgeFilter,
            onDoneAgeChange: this.handleDoneAgeChange.bind(this)
        });
        container.appendChild(filterControls);

        // Add todo list container
        const todoList = document.createElement('div');
        todoList.className = 'todo-list';
        todoList.id = 'todo-list';
        container.appendChild(todoList);

        // Add status
        const status = Status({ message: 'Loading...' });
        status.id = 'status';
        container.appendChild(status);
    }

    async handleLogin(email, password, isRegister = false) {
        try {
            if (isRegister) {
                await authAPI.register(email, password);
            }
            await authAPI.login(email, password);
            this.showTodoApp();
        } catch (error) {
            throw error;
        }
    }

    async handleLogout() {
        try {
            await authAPI.logout();
            setToken('');
            this.showLogin();
        } catch (error) {
            console.error('Logout error:', error);
            // Still clear token and show login even if logout fails
            setToken('');
            this.showLogin();
        }
    }

    async load() {
        try {
            const status = document.getElementById('status');
            if (status) status.textContent = 'Loading...';

            console.log('Loading todos and categories...');
            this.todos = await todosAPI.getAll();
            this.categories = await categoriesAPI.getAll();

            console.log('Loaded todos:', this.todos);
            console.log('Loaded categories:', this.categories);

            this.render();
        } catch (error) {
            const status = document.getElementById('status');
            console.error('Load error:', error);

            // Only show offline message if it's actually a network error
            if (error.message.includes('Offline') || !navigator.onLine) {
                if (status) status.textContent = 'Offline - showing cached';
            } else {
                if (status) status.textContent = `Error: ${error.message}`;
            }
        }
    }

    async handleAdd(name) {
        try {
            const newTodo = await todosAPI.create({
                name,
                group: 'default',
                priority: 1,
                done: false
            });
            this.todos.push(newTodo);
            this.render();
        } catch (error) {
            console.error('Add error:', error);
        }
    }

    async handleToggle(todo) {
        try {
            const updated = await todosAPI.update(todo.id, { done: !todo.done });
            const index = this.todos.findIndex(t => t.id === todo.id);
            if (index !== -1) {
                this.todos[index] = updated;
                this.render();
            }
        } catch (error) {
            console.error('Toggle error:', error);
        }
    }

    handleEdit(todo) {
        this.editingTodo = todo;
        this.replaceTodoItem(todo);
        // Focus the input field after updating
        setTimeout(() => {
            const input = document.querySelector(`[data-todo-id="${todo.id}"] .name-edit-input`);
            if (input) {
                input.focus();
                input.select();
            }
        }, 10);
    }


    async handleUpdate(todo, newName) {
        try {
            if (newName.trim()) {
                const updated = await todosAPI.update(todo.id, { name: newName.trim() });
                const index = this.todos.findIndex(t => t.id === todo.id);
                if (index !== -1) {
                    this.todos[index] = updated;
                }
            }
            this.editingTodo = null;
            // Update only the specific todo item instead of re-rendering the entire list
            const latestTodo = this.todos.find(t => t.id === todo.id) || todo;
            this.replaceTodoItem(latestTodo);
        } catch (error) {
            console.error('Update error:', error);
        }
    }

    handleCancel(todo) {
        this.editingTodo = null;
        const latestTodo = this.todos.find(t => t.id === todo.id) || todo;
        this.replaceTodoItem(latestTodo);
    }

    async handleNotesUpdate(todo, notes) {
        try {
            const updated = await todosAPI.update(todo.id, { notes });
            const index = this.todos.findIndex(t => t.id === todo.id);
            if (index !== -1) {
                this.todos[index] = updated;
            }
            // Update the specific todo item in the DOM
            const targetElement = document.querySelector(`[data-todo-id="${todo.id}"]`);
            if (targetElement) {
                // Add a small delay to ensure DOM is ready
                setTimeout(() => {
                    this.updateTodoFields(targetElement, updated);
                }, 10);
            }
        } catch (error) {
            console.error('Notes update error:', error);
        }
    }

    async handleFieldUpdate(todo, field, value) {
        try {
            const updateData = { [field]: value };
            const updated = await todosAPI.update(todo.id, updateData);
            const index = this.todos.findIndex(t => t.id === todo.id);
            if (index !== -1) {
                this.todos[index] = updated;
            }
            // Update the specific todo item in the DOM
            const targetElement = document.querySelector(`[data-todo-id="${todo.id}"]`);
            if (targetElement) {
                // Add a small delay to ensure DOM is ready
                setTimeout(() => {
                    this.updateTodoFields(targetElement, updated);
                }, 10);
            }
        } catch (error) {
            console.error('Field update error:', error);
        }
    }


    handleToggleExpanded(todo) {
        if (this.expandedTodos.has(todo.id)) {
            this.expandedTodos.delete(todo.id);
        } else {
            this.expandedTodos.add(todo.id);
        }
        // Only update the specific todo item instead of re-rendering the entire list
        // Use the latest todo data from this.todos to ensure we have the most up-to-date state
        const latestTodo = this.todos.find(t => t.id === todo.id) || todo;
        this.updateTodoItem(latestTodo);
    }

    replaceTodoItem(todo) {
        // Find the todo element in the DOM using data attribute
        const targetElement = document.querySelector(`[data-todo-id="${todo.id}"]`);

        if (targetElement) {
            // Find the actual index in the todos array
            const actualIndex = this.todos.findIndex(t => t.id === todo.id);
            if (actualIndex === -1) return;

            // Create a new TodoItem component with the current state
            const isEditing = this.editingTodo && this.editingTodo.id === todo.id;
            const isExpanded = this.expandedTodos.has(todo.id);

            const newTodoElement = TodoItem({
                todo,
                index: actualIndex,
                isEditing,
                isExpanded,
                onToggle: this.handleToggle.bind(this),
                onEdit: this.handleEdit.bind(this),
                onUpdate: this.handleUpdate.bind(this),
                onFieldUpdate: this.handleFieldUpdate.bind(this),
                onCancel: this.handleCancel.bind(this),
                onToggleExpanded: this.handleToggleExpanded.bind(this),
                onDelete: this.handleDelete.bind(this),
                onDragStart: (e) => this.dragHandler.handleDragStart(e, actualIndex),
                onDragEnter: (e) => this.dragHandler.handleDragEnter(e, actualIndex),
                onDragOver: (e) => this.dragHandler.handleDragOver(e),
                onDragLeave: (e) => this.dragHandler.handleDragLeave(e),
                onDrop: (e) => this.dragHandler.handleDrop(e, actualIndex),
                onDragEnd: (e) => this.dragHandler.handleDragEnd(e),
                onTouchStart: (e) => this.dragHandler.handleTouchStart(e, actualIndex),
                onTouchMove: (e) => this.dragHandler.handleTouchMove(e, actualIndex),
                onTouchEnd: (e) => this.dragHandler.handleTouchEnd(e)
            });

            // Replace the old element with the new one
            targetElement.parentNode.replaceChild(newTodoElement, targetElement);
        }
    }

    updateTodoItem(todo) {
        // Find the todo element in the DOM using data attribute
        const targetElement = document.querySelector(`[data-todo-id="${todo.id}"]`);

        if (targetElement) {
            const isExpanded = this.expandedTodos.has(todo.id);
            const isEditing = this.editingTodo && this.editingTodo.id === todo.id;

            // Update classes
            targetElement.classList.toggle('expanded', isExpanded);
            targetElement.classList.toggle('collapsed', !isExpanded);
            targetElement.classList.toggle('editing', isEditing);

            // Update expand icon
            const expandIcon = targetElement.querySelector('.expand-icon');
            if (expandIcon) {
                expandIcon.textContent = isExpanded ? '▼' : '▶';
            }

            // Update name display
            const nameSpan = targetElement.querySelector('.name');
            if (nameSpan && !isEditing) {
                nameSpan.textContent = todo.name;
            }

            // Update input field value if it exists
            const nameInput = targetElement.querySelector('.name-edit-input');
            if (nameInput && isEditing) {
                nameInput.value = todo.name;
            }

            // Update field values when expanding
            if (isExpanded) {
                // Add a small delay to ensure DOM is ready after animation
                setTimeout(() => {
                    this.updateTodoFields(targetElement, todo);
                }, 50);
            } else {
                // When collapsing, also update fields to ensure they have the latest data
                this.updateTodoFields(targetElement, todo);
            }
        }
    }

    updateTodoFields(todoElement, todo) {
        // Update notes textarea
        const notesTextarea = todoElement.querySelector('.field-textarea');
        if (notesTextarea) {
            // Force update by clearing and setting the value
            const newValue = todo.notes || '';
            if (notesTextarea.value !== newValue) {
                notesTextarea.value = '';
                notesTextarea.value = newValue;
            }
        }

        // Update category input
        const categoryInput = todoElement.querySelector('input[placeholder="Enter category..."]');
        if (categoryInput) {
            const newCategoryValue = todo.category || '';
            if (categoryInput.value !== newCategoryValue) {
                categoryInput.value = newCategoryValue;
            }
        }

        // Update parent node ID input
        const parentInput = todoElement.querySelector('input[placeholder="Parent task ID"]');
        if (parentInput) {
            const newParentValue = todo.parent_node_id || '';
            if (parentInput.value !== newParentValue) {
                parentInput.value = newParentValue;
            }
        }

        // Update priority select
        const prioritySelect = todoElement.querySelector('.field-select');
        if (prioritySelect) {
            const newPriorityValue = todo.priority || 1;
            if (prioritySelect.value !== newPriorityValue.toString()) {
                prioritySelect.value = newPriorityValue;
            }
        }
    }

    async handleDelete(todo) {
        try {
            const todoId = parseInt(todo.id);
            await todosAPI.delete(todoId);
            this.todos = this.todos.filter(t => t.id !== todo.id);
            this.render();
        } catch (error) {
            console.error('Error deleting todo:', error);
            alert('Failed to delete todo. Please try again.');
        }
    }

    handleFilterChange(filter) {
        this.filter = filter;
        this.render();
    }

    handleDoneAgeChange(days) {
        this.doneAgeFilter = days;
        this.render();
    }

    async handleReorder(fromIndex, toIndex) {
        try {
            console.log('handleReorder called:', fromIndex, 'to', toIndex);
            console.log('Before reorder:', this.todos.map(t => ({ id: t.id, name: t.name })));

            // Update the local data immediately
            this.todos = this.dragHandler.reorderItems(this.todos, fromIndex, toIndex);

            console.log('After reorder:', this.todos.map(t => ({ id: t.id, name: t.name })));

            // Re-render the entire list (fast and reliable)
            this.render();

            // Save to server in background (works offline too via queue)
            todosAPI.reorder(this.todos).catch(error => {
                console.log('Background reorder queued for later (offline mode)');
                // Don't revert - the change is already applied locally
                // The offline queue will handle syncing when online
            });
        } catch (error) {
            console.error('Reorder error:', error);
        }
    }



    async finalizeReorder() {
        try {
            // Save the final order to server when drag ends
            await todosAPI.reorder(this.todos);
        } catch (error) {
            console.error('Finalize reorder error:', error);
        }
    }

    isDoneRecently(todo) {
        const now = new Date();
        const cutoffDate = new Date(now.getTime() - (this.doneAgeFilter * 24 * 60 * 60 * 1000));
        if (!todo.done || !todo.done_at) return false;
        const doneDate = new Date(todo.done_at);
        return doneDate >= cutoffDate;
    }

    getFilteredTodos() {
        const now = new Date();
        const cutoffDate = new Date(now.getTime() - (this.doneAgeFilter * 24 * 60 * 60 * 1000));

        const isDoneRecently = (todo) => {
            if (!todo.done || !todo.done_at) return false;
            const doneDate = new Date(todo.done_at);
            return doneDate >= cutoffDate;
        };

        switch (this.filter) {
            case 'active':
                return this.todos.filter(t => !t.done);
            case 'done':
                return this.todos.filter(t => t.done && isDoneRecently(t));
            case 'separate':
                const active = this.todos.filter(t => !t.done);
                const done = this.todos.filter(t => t.done && isDoneRecently(t));
                return [...active, ...done];
            default:
                return this.todos;
        }
    }

    render() {
        // Re-render filter controls to update active state
        const filterControlsContainer = document.querySelector('.filter-controls');
        if (filterControlsContainer) {
            const newFilterControls = FilterControls({
                filter: this.filter,
                onFilterChange: this.handleFilterChange.bind(this),
                doneAgeFilter: this.doneAgeFilter,
                onDoneAgeChange: this.handleDoneAgeChange.bind(this)
            });
            filterControlsContainer.parentNode.replaceChild(newFilterControls, filterControlsContainer);
        }

        const todoList = document.getElementById('todo-list');
        if (!todoList) return;

        const filteredTodos = this.getFilteredTodos();
        todoList.innerHTML = '';

        if (filteredTodos.length === 0) {
            const status = document.getElementById('status');
            if (status) {
                status.textContent = this.filter === 'all' ? 'No todos yet' :
                    this.filter === 'active' ? 'No active todos' :
                        this.filter === 'done' ? 'No completed todos' : 'No todos';
            }
            return;
        }

        if (this.filter === 'separate') {
            // Render separate view with sections
            const active = this.todos.filter(t => !t.done);
            const done = this.todos.filter(t => t.done && this.isDoneRecently(t));

            // Active todos section
            if (active.length > 0) {
                const activeTitle = document.createElement('div');
                activeTitle.className = 'section-title';
                activeTitle.textContent = 'Active';
                todoList.appendChild(activeTitle);

                active.forEach((todo, index) => {
                    const isEditing = this.editingTodo && this.editingTodo.id === todo.id;
                    // Find the actual index in the full todos array
                    const actualIndex = this.todos.findIndex(t => t.id === todo.id);
                    console.log('Active todo:', todo.name, 'filtered index:', index, 'actual index:', actualIndex);
                    const todoElement = TodoItem({
                        todo,
                        index: actualIndex,
                        isEditing,
                        isExpanded: this.expandedTodos.has(todo.id),
                        onToggle: this.handleToggle.bind(this),
                        onEdit: this.handleEdit.bind(this),
                        onUpdate: this.handleUpdate.bind(this),
                        onFieldUpdate: this.handleFieldUpdate.bind(this),
                        onCancel: this.handleCancel.bind(this),
                        onToggleExpanded: this.handleToggleExpanded.bind(this),
                        onDelete: this.handleDelete.bind(this),
                        onDragStart: (e) => this.dragHandler.handleDragStart(e, actualIndex),
                        onDragEnter: (e) => this.dragHandler.handleDragEnter(e, actualIndex),
                        onDragOver: (e) => this.dragHandler.handleDragOver(e),
                        onDragLeave: (e) => this.dragHandler.handleDragLeave(e),
                        onDrop: (e) => this.dragHandler.handleDrop(e, actualIndex),
                        onDragEnd: (e) => this.dragHandler.handleDragEnd(e),
                        onTouchStart: (e) => this.dragHandler.handleTouchStart(e, actualIndex),
                        onTouchMove: (e) => this.dragHandler.handleTouchMove(e, actualIndex),
                        onTouchEnd: (e) => {
                            this.dragHandler.handleTouchEnd(e);
                            this.finalizeReorder();
                        }
                    });
                    todoList.appendChild(todoElement);
                });
            }

            // Separator between active and done
            if (active.length > 0 && done.length > 0) {
                const separator = document.createElement('hr');
                separator.className = 'separator';
                todoList.appendChild(separator);
            }

            // Done todos section
            if (done.length > 0) {
                const doneTitle = document.createElement('div');
                doneTitle.className = 'section-title';
                doneTitle.textContent = 'Completed';
                todoList.appendChild(doneTitle);

                done.forEach((todo, index) => {
                    const isEditing = this.editingTodo && this.editingTodo.id === todo.id;
                    // Find the actual index in the full todos array
                    const actualIndex = this.todos.findIndex(t => t.id === todo.id);
                    console.log('Done todo:', todo.name, 'filtered index:', index, 'actual index:', actualIndex);
                    const todoElement = TodoItem({
                        todo,
                        index: actualIndex,
                        isEditing,
                        isExpanded: this.expandedTodos.has(todo.id),
                        onToggle: this.handleToggle.bind(this),
                        onEdit: this.handleEdit.bind(this),
                        onUpdate: this.handleUpdate.bind(this),
                        onFieldUpdate: this.handleFieldUpdate.bind(this),
                        onCancel: this.handleCancel.bind(this),
                        onToggleExpanded: this.handleToggleExpanded.bind(this),
                        onDelete: this.handleDelete.bind(this),
                        onDragStart: (e) => this.dragHandler.handleDragStart(e, actualIndex),
                        onDragEnter: (e) => this.dragHandler.handleDragEnter(e, actualIndex),
                        onDragOver: (e) => this.dragHandler.handleDragOver(e),
                        onDragLeave: (e) => this.dragHandler.handleDragLeave(e),
                        onDrop: (e) => this.dragHandler.handleDrop(e, actualIndex),
                        onDragEnd: (e) => this.dragHandler.handleDragEnd(e),
                        onTouchStart: (e) => this.dragHandler.handleTouchStart(e, actualIndex),
                        onTouchMove: (e) => this.dragHandler.handleTouchMove(e, actualIndex),
                        onTouchEnd: (e) => {
                            this.dragHandler.handleTouchEnd(e);
                            this.finalizeReorder();
                        }
                    });
                    todoList.appendChild(todoElement);
                });
            }
        } else {
            // Render normal view
            filteredTodos.forEach((todo, index) => {
                const isEditing = this.editingTodo && this.editingTodo.id === todo.id;
                const todoElement = TodoItem({
                    todo,
                    index,
                    isEditing,
                    isExpanded: this.expandedTodos.has(todo.id),
                    onToggle: this.handleToggle.bind(this),
                    onEdit: this.handleEdit.bind(this),
                    onUpdate: this.handleUpdate.bind(this),
                    onCancel: this.handleCancel.bind(this),
                    onToggleExpanded: this.handleToggleExpanded.bind(this),
                    onDragStart: (e) => this.dragHandler.handleDragStart(e, index),
                    onDragEnter: (e) => this.dragHandler.handleDragEnter(e, index),
                    onDragOver: (e) => this.dragHandler.handleDragOver(e),
                    onDragLeave: (e) => this.dragHandler.handleDragLeave(e),
                    onDrop: (e) => this.dragHandler.handleDrop(e, index),
                    onDragEnd: (e) => this.dragHandler.handleDragEnd(e),
                    onTouchStart: (e) => this.dragHandler.handleTouchStart(e, index),
                    onTouchMove: (e) => this.dragHandler.handleTouchMove(e, index),
                    onTouchEnd: (e) => this.dragHandler.handleTouchEnd(e)
                });
                todoList.appendChild(todoElement);
            });
        }

        const status = document.getElementById('status');
        if (status) {
            const total = this.todos.length;
            const done = this.todos.filter(t => t.done).length;
            status.textContent = `${done}/${total} completed`;
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new TodoApp();
});
