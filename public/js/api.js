// API utility functions for Todo App

const API_BASE = '/api';

// Token management
function getToken() {
    return localStorage.getItem('todo_token') || '';
}

function setToken(token) {
    if (token) {
        localStorage.setItem('todo_token', token);
    } else {
        localStorage.removeItem('todo_token');
    }
}

// Offline queue management
function enqueue(action) {
    const queue = JSON.parse(localStorage.getItem('todo_queue') || '[]');
    queue.push(action);
    localStorage.setItem('todo_queue', JSON.stringify(queue));
}

function flushQueue() {
    const queue = JSON.parse(localStorage.getItem('todo_queue') || '[]');
    if (queue.length === 0) return Promise.resolve();

    const promises = queue.map(action => {
        return fetch(`${API_BASE}${action.endpoint}`, {
            method: action.method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: action.body ? JSON.stringify(action.body) : undefined
        });
    });

    return Promise.allSettled(promises).then(() => {
        localStorage.removeItem('todo_queue');
    });
}

// API request helper
async function apiRequest(endpoint, options = {}) {
    // Add cache-busting parameter for GET requests
    const separator = endpoint.includes('?') ? '&' : '?';
    const cacheBuster = `_t=${Date.now()}`;
    const url = `${API_BASE}${endpoint}${separator}${cacheBuster}`;
    const config = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`,
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
        },
        ...options
    };

    // Stringify body if it's an object
    if (config.body && typeof config.body === 'object') {
        config.body = JSON.stringify(config.body);
    }

    try {
        const response = await fetch(url, config);

        if (!response.ok) {
            if (response.status === 401) {
                setToken('');
                throw new Error('Unauthorized');
            }
            throw new Error(`HTTP ${response.status}`);
        }

        // Handle 204 No Content responses (like DELETE)
        if (response.status === 204) {
            return null;
        }

        return await response.json();
    } catch (error) {
        // If offline, queue the request
        if (!navigator.onLine) {
            enqueue({
                endpoint,
                method: options.method || 'GET',
                body: options.body
            });
            throw new Error('Offline - queued for later');
        }
        throw error;
    }
}

// Auth API
export const authAPI = {
    async register(email, password) {
        return apiRequest('/register', {
            method: 'POST',
            body: { email, password }
        });
    },

    async login(email, password) {
        const response = await apiRequest('/login', {
            method: 'POST',
            body: { email, password }
        });
        setToken(response.token);
        return response;
    },

    async logout() {
        try {
            await apiRequest('/logout', {
                method: 'POST'
            });
        } catch (error) {
            // Ignore logout errors, still clear token
            console.warn('Logout request failed:', error);
        } finally {
            setToken('');
        }
    }
};

// Todos API
export const todosAPI = {
    async getAll() {
        return apiRequest('/todos');
    },

    async create(todo) {
        return apiRequest('/todos', {
            method: 'POST',
            body: todo
        });
    },

    async update(id, updates) {
        return apiRequest(`/todos/${id}`, {
            method: 'PUT',
            body: updates
        });
    },

    async delete(id) {
        return apiRequest(`/todos/${id}`, {
            method: 'DELETE'
        });
    },

    async reorder(todos) {
        return apiRequest('/todos/reorder', {
            method: 'POST',
            body: { todos }
        });
    }
};

// Categories API
export const categoriesAPI = {
    async getAll() {
        return apiRequest('/categories');
    }
};

// Export utilities
export { getToken, setToken, enqueue, flushQueue };
