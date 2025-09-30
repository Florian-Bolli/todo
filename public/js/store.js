// Simple State Management Store for Todo App
// Provides centralized state management with local caching and offline support

class TodoStore {
    constructor() {
        // Initial state
        this.state = {
            todos: [],
            categories: [],
            filter: 'separate',
            editingTodo: null,
            doneAgeFilter: 7,
            expandedTodos: new Set(),
            selectedCategories: new Set(), // Track which categories are selected for filtering
            loading: false,
            error: null,
            user: null,
            isAuthenticated: false
        };

        // Subscribers for state changes
        this.subscribers = new Map();
        this.subscriberId = 0;

        // Load initial state from localStorage
        this.loadFromStorage();
        
        // Listen for online/offline events
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
    }

    // Subscribe to state changes
    subscribe(callback) {
        const id = ++this.subscriberId;
        this.subscribers.set(id, callback);
        
        // Return unsubscribe function
        return () => {
            this.subscribers.delete(id);
        };
    }

    // Notify all subscribers of state changes
    notify() {
        this.subscribers.forEach(callback => {
            try {
                callback(this.state);
            } catch (error) {
                console.error('Subscriber callback error:', error);
            }
        });
    }

    // Update state and notify subscribers
    setState(updates) {
        const oldState = { ...this.state };
        
        // Deep merge updates into state
        Object.keys(updates).forEach(key => {
            if ((key === 'expandedTodos' || key === 'selectedCategories') && updates[key] instanceof Set) {
                this.state[key] = updates[key];
            } else if (typeof updates[key] === 'object' && updates[key] !== null && !Array.isArray(updates[key])) {
                this.state[key] = { ...this.state[key], ...updates[key] };
            } else {
                this.state[key] = updates[key];
            }
        });

        // Save to localStorage
        this.saveToStorage();
        
        // Notify subscribers
        this.notify();
    }

    // Get current state
    getState() {
        return { ...this.state };
    }

    // Load state from localStorage
    loadFromStorage() {
        try {
            const stored = localStorage.getItem('todo_store_state');
            if (stored) {
                const parsed = JSON.parse(stored);
                
                // Restore todos and categories
                if (parsed.todos) this.state.todos = parsed.todos;
                if (parsed.categories) this.state.categories = parsed.categories;
                if (parsed.filter) this.state.filter = parsed.filter;
                if (parsed.doneAgeFilter) this.state.doneAgeFilter = parsed.doneAgeFilter;
                if (parsed.expandedTodos) this.state.expandedTodos = new Set(parsed.expandedTodos);
                if (parsed.selectedCategories) this.state.selectedCategories = new Set(parsed.selectedCategories);
                // Ensure selectedCategories is always a Set
                if (!this.state.selectedCategories || !(this.state.selectedCategories instanceof Set)) {
                    this.state.selectedCategories = new Set();
                }
                if (parsed.user) this.state.user = parsed.user;
                if (parsed.isAuthenticated) this.state.isAuthenticated = parsed.isAuthenticated;
            }
        } catch (error) {
            console.warn('Failed to load state from storage:', error);
        }
    }

    // Save state to localStorage
    saveToStorage() {
        try {
            const toStore = {
                ...this.state,
                expandedTodos: Array.from(this.state.expandedTodos),
                selectedCategories: Array.from(this.state.selectedCategories),
                loading: false, // Don't persist loading state
                error: null     // Don't persist error state
            };
            localStorage.setItem('todo_store_state', JSON.stringify(toStore));
        } catch (error) {
            console.warn('Failed to save state to storage:', error);
        }
    }

    // Handle going online
    async handleOnline() {
        console.log('Back online, syncing data...');
        this.setState({ error: null });
        
        // Trigger a sync if we have data
        if (this.state.todos.length > 0 || this.state.categories.length > 0) {
            await this.syncWithServer();
        }
    }

    // Handle going offline
    handleOffline() {
        console.log('Gone offline, using cached data');
        this.setState({ error: 'Offline - using cached data' });
    }

    // Sync local state with server
    async syncWithServer() {
        if (!this.state.isAuthenticated) return;

        try {
            this.setState({ loading: true });
            
            // Import API functions dynamically to avoid circular dependencies
            const { todosAPI, categoriesAPI } = await import('./api.js');
            
            const [todosResponse, categoriesResponse] = await Promise.all([
                todosAPI.getAll(),
                categoriesAPI.getAll()
            ]);

            const todos = Array.isArray(todosResponse) ? todosResponse : todosResponse.todos || [];
            const categories = Array.isArray(categoriesResponse) ? categoriesResponse : categoriesResponse.categories || [];

            this.setState({
                todos,
                categories,
                loading: false,
                error: null
            });

        } catch (error) {
            console.error('Sync error:', error);
            this.setState({
                loading: false,
                error: error.message.includes('Offline') ? 'Offline - using cached data' : `Sync error: ${error.message}`
            });
        }
    }

    // Action creators
    actions = {
        // Authentication actions
        setAuthenticated: (user) => {
            this.setState({
                isAuthenticated: true,
                user,
                error: null
            });
        },

        setUnauthenticated: () => {
            this.setState({
                isAuthenticated: false,
                user: null,
                todos: [],
                categories: [],
                editingTodo: null,
                expandedTodos: new Set(),
                selectedCategories: new Set()
            });
        },

        // Todo actions
        setTodos: (todos) => {
            this.setState({ todos });
        },

        addTodo: (todo) => {
            const todos = [...this.state.todos, todo];
            this.setState({ todos });
        },

        updateTodo: (id, updates) => {
            const todos = this.state.todos.map(todo => 
                todo.id === id ? { ...todo, ...updates } : todo
            );
            this.setState({ todos });
        },

        removeTodo: (id) => {
            const todos = this.state.todos.filter(todo => todo.id !== id);
            this.setState({ todos });
        },

        reorderTodos: (newOrder) => {
            this.setState({ todos: newOrder });
        },

        // Category actions
        setCategories: (categories) => {
            this.setState({ categories });
        },

        addCategory: (category) => {
            const categories = [...this.state.categories, category];
            this.setState({ categories });
        },

        updateCategory: (id, updates) => {
            const categories = this.state.categories.map(cat => 
                cat.id === id ? { ...cat, ...updates } : cat
            );
            this.setState({ categories });
        },

        removeCategory: (id) => {
            const categories = this.state.categories.filter(cat => cat.id !== id);
            this.setState({ categories });
        },

        createCategory: async (categoryData) => {
            try {
                const { categoriesAPI } = await import('./api.js');
                const newCategory = await categoriesAPI.create(categoryData);
                const categories = [...this.state.categories, newCategory];
                this.setState({ categories });
                return newCategory;
            } catch (error) {
                console.error('Failed to create category:', error);
                throw error;
            }
        },

        // UI actions
        setFilter: (filter) => {
            this.setState({ filter });
        },

        setDoneAgeFilter: (days) => {
            this.setState({ doneAgeFilter: days });
        },

        setEditingTodo: (todo) => {
            this.setState({ editingTodo: todo });
        },

        clearEditingTodo: () => {
            this.setState({ editingTodo: null });
        },

        toggleExpandedTodo: (todoId) => {
            const expandedTodos = new Set(this.state.expandedTodos);
            if (expandedTodos.has(todoId)) {
                expandedTodos.delete(todoId);
            } else {
                expandedTodos.add(todoId);
            }
            this.setState({ expandedTodos });
        },

        clearExpandedTodos: () => {
            this.setState({ expandedTodos: new Set() });
        },

        // Category filter actions
        toggleCategoryFilter: (categoryId) => {
            const selectedCategories = new Set(this.state.selectedCategories);
            if (selectedCategories.has(categoryId)) {
                selectedCategories.delete(categoryId);
            } else {
                selectedCategories.add(categoryId);
            }
            this.setState({ selectedCategories });
        },

        selectAllCategories: () => {
            this.setState({ selectedCategories: new Set() });
        },

        selectOnlyCategory: (categoryId) => {
            this.setState({ selectedCategories: new Set([categoryId]) });
        },

        clearCategoryFilters: () => {
            this.setState({ selectedCategories: new Set() });
        },

        setError: (error) => {
            this.setState({ error });
        },

        clearError: () => {
            this.setState({ error: null });
        },

        setLoading: (loading) => {
            this.setState({ loading });
        }
    };

    // Computed getters
    getters = {
        getFilteredTodos: () => {
            // Ensure selectedCategories is always a Set
            if (!this.state.selectedCategories || !(this.state.selectedCategories instanceof Set)) {
                this.state.selectedCategories = new Set();
            }
            
            const now = new Date();
            const cutoffDate = new Date(now.getTime() - (this.state.doneAgeFilter * 24 * 60 * 60 * 1000));

            const isDoneRecently = (todo) => {
                if (!todo.done || !todo.done_at) return false;
                const doneDate = new Date(todo.done_at);
                return doneDate >= cutoffDate;
            };

            const matchesCategoryFilter = (todo) => {
                // If no categories are selected, show all todos
                if (this.state.selectedCategories.size === 0) return true;
                
                // If todo has no category, only show if "no category" is selected (empty set means show all)
                if (!todo.category_id) {
                    return this.state.selectedCategories.size === 0;
                }
                
                // Check if todo's category is in the selected categories
                return this.state.selectedCategories.has(todo.category_id);
            };

            let filteredTodos;
            switch (this.state.filter) {
                case 'active':
                    filteredTodos = this.state.todos.filter(t => !t.done);
                    break;
                case 'done':
                    filteredTodos = this.state.todos.filter(t => t.done && isDoneRecently(t));
                    break;
                case 'separate':
                    const active = this.state.todos.filter(t => !t.done);
                    const done = this.state.todos.filter(t => t.done && isDoneRecently(t));
                    filteredTodos = [...active, ...done];
                    break;
                default:
                    filteredTodos = this.state.todos;
            }

            // Apply category filter
            return filteredTodos.filter(matchesCategoryFilter);
        },

        getTodoById: (id) => {
            return this.state.todos.find(todo => todo.id === id);
        },

        getCategoryById: (id) => {
            return this.state.categories.find(cat => cat.id === id);
        },

        getActiveTodosCount: () => {
            return this.state.todos.filter(t => !t.done).length;
        },

        getDoneTodosCount: () => {
            return this.state.todos.filter(t => t.done).length;
        },

        getTotalTodosCount: () => {
            return this.state.todos.length;
        }
    };
}

// Create and export singleton store instance
export const store = new TodoStore();
export default store;