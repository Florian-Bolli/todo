// Main Todo App Application

import { authAPI, todosAPI, categoriesAPI, getToken, setToken, flushQueue } from './api.js';
import { Login, TodoItem, FilterControls, TodoInput, Status } from './components.js';
import { DragHandler } from './drag-handler.js';
import { store } from './store.js';

class TodoApp {
    constructor() {
        this.dragHandler = new DragHandler((fromIndex, toIndex) => {
            this.handleReorder(fromIndex, toIndex);
        });

        // Subscribe to store changes
        this.unsubscribe = store.subscribe((state) => {
            this.render();
            
            // If categories just got loaded, update all expanded todos
            if (state.categories.length > 0) {
                this.updateAllExpandedTodos();
            }
        });

        // Add click outside handler to collapse all todos
        this.handleClickOutside = this.handleClickOutside.bind(this);

        this.init();
    }

    async init() {
        // Check if we have a valid token
        const token = getToken();
        if (token) {
            try {
                // Test the token by making a simple API call
                await todosAPI.getAll();
                store.actions.setAuthenticated({ token });
                this.showTodoApp();
            } catch (error) {
                console.log('Token validation failed:', error.message);
                setToken('');
                store.actions.setUnauthenticated();
                this.showLogin();
            }
        } else {
            this.showLogin();
        }

        // Flush offline queue when back online
        window.addEventListener('online', () => {
            flushQueue().then(() => {
                store.actions.syncWithServer();
            });
        });
    }

    showLogin() {
        // Remove click outside listener
        document.removeEventListener('click', this.handleClickOutside);
        
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

        // Add click outside listener for collapsing todos
        document.addEventListener('click', this.handleClickOutside);
    }

    renderTodoApp(container) {
        const state = store.getState();
        
        // Add todo input
        const todoInput = TodoInput({ onAdd: this.handleAdd.bind(this) });
        container.appendChild(todoInput);

        // Add filter controls
        const filterControls = FilterControls({
            filter: state.filter,
            onFilterChange: this.handleFilterChange.bind(this),
            doneAgeFilter: state.doneAgeFilter,
            onDoneAgeChange: this.handleDoneAgeChange.bind(this),
            categories: state.categories,
            selectedCategories: state.selectedCategories,
            onToggleCategory: this.handleToggleCategory.bind(this),
            onSelectAll: this.handleSelectAllCategories.bind(this),
            onSelectOnly: this.handleSelectOnlyCategory.bind(this)
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
            const response = await authAPI.login(email, password);
            store.actions.setAuthenticated({ email, token: response.token });
            this.showTodoApp();
        } catch (error) {
            throw error;
        }
    }

    async handleLogout() {
        try {
            await authAPI.logout();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            setToken('');
            store.actions.setUnauthenticated();
            this.cleanup();
            this.showLogin();
        }
    }

    cleanup() {
        // Remove event listeners
        document.removeEventListener('click', this.handleClickOutside);
    }

    async load() {
        try {
            store.actions.setLoading(true);
            await store.syncWithServer();
        } catch (error) {
            console.error('Load error:', error);
            store.actions.setError(error.message);
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
            store.actions.addTodo(newTodo);
        } catch (error) {
            console.error('Add error:', error);
            store.actions.setError(`Failed to add todo: ${error.message}`);
        }
    }

    async handleToggle(todo) {
        try {
            const updated = await todosAPI.update(todo.id, { done: !todo.done });
            store.actions.updateTodo(todo.id, updated);
        } catch (error) {
            console.error('Toggle error:', error);
            store.actions.setError(`Failed to toggle todo: ${error.message}`);
        }
    }

    handleEdit(todo) {
        store.actions.setEditingTodo(todo);
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
                store.actions.updateTodo(todo.id, updated);
            }
            store.actions.clearEditingTodo();
            // Update only the specific todo item instead of re-rendering the entire list
            const latestTodo = store.getters.getTodoById(todo.id) || todo;
            this.replaceTodoItem(latestTodo);
        } catch (error) {
            console.error('Update error:', error);
            store.actions.setError(`Failed to update todo: ${error.message}`);
        }
    }

    handleCancel(todo) {
        store.actions.clearEditingTodo();
        const latestTodo = store.getters.getTodoById(todo.id) || todo;
        this.replaceTodoItem(latestTodo);
    }

    async handleNotesUpdate(todo, notes) {
        try {
            const updated = await todosAPI.update(todo.id, { notes });
            store.actions.updateTodo(todo.id, updated);
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
            store.actions.setError(`Failed to update notes: ${error.message}`);
        }
    }

    async handleFieldUpdate(todo, field, value) {
        try {
            const updateData = { [field]: value };
            const updated = await todosAPI.update(todo.id, updateData);
            
            // Update store with the new data
            store.actions.updateTodo(todo.id, updated);
            
            // For category updates, we need to be more careful about DOM updates
            if (field === 'category_id') {
                // Find the target element
                const targetElement = document.querySelector(`[data-todo-id="${todo.id}"]`);
                if (targetElement) {
                    // Find the category select element
                    const categorySelect = targetElement.querySelector('.field-row .field-select');
                    if (categorySelect) {
                        // Update the select value directly
                        categorySelect.value = value || '';
                    }
                }
            } else {
                // For other fields, use the normal update process
                const targetElement = document.querySelector(`[data-todo-id="${todo.id}"]`);
                if (targetElement) {
                    setTimeout(() => {
                        this.updateTodoFields(targetElement, updated);
                    }, 10);
                }
            }
        } catch (error) {
            console.error('Field update error:', error);
            store.actions.setError(`Failed to update field: ${error.message}`);
        }
    }


    handleToggleExpanded(todo) {
        store.actions.toggleExpandedTodo(todo.id);
        // Only update the specific todo item instead of re-rendering the entire list
        // Use the latest todo data from store to ensure we have the most up-to-date state
        const latestTodo = store.getters.getTodoById(todo.id) || todo;
        this.updateTodoItem(latestTodo);
    }

    replaceTodoItem(todo) {
        // Find the todo element in the DOM using data attribute
        const targetElement = document.querySelector(`[data-todo-id="${todo.id}"]`);

        if (targetElement) {
            const state = store.getState();
            // Find the actual index in the todos array
            const actualIndex = state.todos.findIndex(t => t.id === todo.id);
            if (actualIndex === -1) return;

            // Create a new TodoItem component with the current state
            const isEditing = state.editingTodo && state.editingTodo.id === todo.id;
            const isExpanded = state.expandedTodos.has(todo.id);

            const newTodoElement = TodoItem({
                todo,
                index: actualIndex,
                isEditing,
                isExpanded,
                categories: state.categories,
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
            const state = store.getState();
            const isExpanded = state.expandedTodos.has(todo.id);
            const isEditing = state.editingTodo && state.editingTodo.id === todo.id;

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

        // Update category select (first select element in field-row)
        const categorySelect = todoElement.querySelector('.field-row .field-select');
        if (categorySelect) {
            const newCategoryValue = todo.category_id || '';
            const currentValue = categorySelect.value;
            
            if (currentValue !== newCategoryValue.toString()) {
                // Check if the option exists before setting
                const optionExists = Array.from(categorySelect.options).some(option => 
                    option.value === newCategoryValue.toString()
                );
                
                if (optionExists || newCategoryValue === '') {
                    categorySelect.value = newCategoryValue.toString();
                }
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

        // Update priority select (second select element)
        const prioritySelects = todoElement.querySelectorAll('.field-select');
        const prioritySelect = prioritySelects[prioritySelects.length - 1]; // Last select is priority
        if (prioritySelect) {
            const newPriorityValue = todo.priority || 1;
            if (prioritySelect.value !== newPriorityValue.toString()) {
                prioritySelect.value = newPriorityValue.toString();
            }
        }
    }

    async handleDelete(todo) {
        try {
            const todoId = parseInt(todo.id);
            await todosAPI.delete(todoId);
            store.actions.removeTodo(todo.id);
        } catch (error) {
            console.error('Error deleting todo:', error);
            store.actions.setError('Failed to delete todo. Please try again.');
        }
    }

    handleFilterChange(filter) {
        store.actions.setFilter(filter);
    }

    handleDoneAgeChange(days) {
        store.actions.setDoneAgeFilter(days);
    }

    handleToggleCategory(categoryId) {
        store.actions.toggleCategoryFilter(categoryId);
    }

    handleSelectAllCategories() {
        store.actions.selectAllCategories();
    }

    handleSelectOnlyCategory(categoryId) {
        store.actions.selectOnlyCategory(categoryId);
    }

    async handleReorder(fromIndex, toIndex) {
        try {
            const currentTodos = store.getState().todos;

            // Update the local data immediately
            const newOrder = this.dragHandler.reorderItems(currentTodos, fromIndex, toIndex);
            store.actions.reorderTodos(newOrder);

            // Save to server in background (works offline too via queue)
            todosAPI.reorder(newOrder).catch(error => {
                // Don't revert - the change is already applied locally
                // The offline queue will handle syncing when online
            });
        } catch (error) {
            console.error('Reorder error:', error);
            store.actions.setError(`Failed to reorder todos: ${error.message}`);
        }
    }



    async finalizeReorder() {
        try {
            // Save the final order to server when drag ends
            const currentTodos = store.getState().todos;
            await todosAPI.reorder(currentTodos);
        } catch (error) {
            console.error('Finalize reorder error:', error);
        }
    }

    isDoneRecently(todo) {
        const now = new Date();
        const state = store.getState();
        const cutoffDate = new Date(now.getTime() - (state.doneAgeFilter * 24 * 60 * 60 * 1000));
        if (!todo.done || !todo.done_at) return false;
        const doneDate = new Date(todo.done_at);
        return doneDate >= cutoffDate;
    }

    getFilteredTodos() {
        return store.getters.getFilteredTodos();
    }

    handleClickOutside(event) {
        // Check if the click is outside of any todo item
        const clickedTodo = event.target.closest('.todo');
        
        // If click is not on a todo item and there are expanded todos, collapse them all
        if (!clickedTodo && store.getState().expandedTodos.size > 0) {
            store.actions.clearExpandedTodos();
        }
    }

    updateAllExpandedTodos() {
        const state = store.getState();
        
        // Update all expanded todos to ensure their category selects show the correct values
        state.expandedTodos.forEach(todoId => {
            const todo = store.getters.getTodoById(todoId);
            if (todo) {
                const targetElement = document.querySelector(`[data-todo-id="${todoId}"]`);
                if (targetElement) {
                    this.updateTodoFields(targetElement, todo);
                }
            }
        });
    }

    render() {
        const state = store.getState();
        
        // Re-render filter controls to update active state
        const filterControlsContainer = document.querySelector('.filter-controls');
        if (filterControlsContainer) {
            const newFilterControls = FilterControls({
                filter: state.filter,
                onFilterChange: this.handleFilterChange.bind(this),
                doneAgeFilter: state.doneAgeFilter,
                onDoneAgeChange: this.handleDoneAgeChange.bind(this),
                categories: state.categories,
                selectedCategories: state.selectedCategories,
                onToggleCategory: this.handleToggleCategory.bind(this),
                onSelectAll: this.handleSelectAllCategories.bind(this),
                onSelectOnly: this.handleSelectOnlyCategory.bind(this)
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
                status.textContent = state.filter === 'all' ? 'No todos yet' :
                    state.filter === 'active' ? 'No active todos' :
                        state.filter === 'done' ? 'No completed todos' : 'No todos';
            }
            return;
        }

        if (state.filter === 'separate') {
            // Render separate view with sections
            const active = filteredTodos.filter(t => !t.done);
            const done = filteredTodos.filter(t => t.done && this.isDoneRecently(t));

            // Active todos section
            if (active.length > 0) {
                const activeTitle = document.createElement('div');
                activeTitle.className = 'section-title';
                activeTitle.textContent = 'Active';
                todoList.appendChild(activeTitle);

                active.forEach((todo, index) => {
                    const isEditing = state.editingTodo && state.editingTodo.id === todo.id;
                    // Find the actual index in the full todos array
                    const actualIndex = state.todos.findIndex(t => t.id === todo.id);
                    const todoElement = TodoItem({
                        todo,
                        index: actualIndex,
                        isEditing,
                        isExpanded: state.expandedTodos.has(todo.id),
                        categories: state.categories,
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
                    const isEditing = state.editingTodo && state.editingTodo.id === todo.id;
                    // Find the actual index in the full todos array
                    const actualIndex = state.todos.findIndex(t => t.id === todo.id);
                    const todoElement = TodoItem({
                        todo,
                        index: actualIndex,
                        isEditing,
                        isExpanded: state.expandedTodos.has(todo.id),
                        categories: state.categories,
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
                const isEditing = state.editingTodo && state.editingTodo.id === todo.id;
                const todoElement = TodoItem({
                    todo,
                    index,
                    isEditing,
                    isExpanded: state.expandedTodos.has(todo.id),
                    categories: state.categories,
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
            const total = store.getters.getTotalTodosCount();
            const done = store.getters.getDoneTodosCount();
            const loading = state.loading ? ' (Loading...)' : '';
            const error = state.error ? ` (${state.error})` : '';
            status.textContent = `${done}/${total} completed${loading}${error}`;
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new TodoApp();
});
