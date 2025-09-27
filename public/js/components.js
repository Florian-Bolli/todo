// React-like components for Todo App

// Simple React-like element creator
function e(type, props, ...children) {
    const element = document.createElement(type);

    if (props) {
        Object.keys(props).forEach(key => {
            if (key === 'className') {
                element.className = props[key];
            } else if (key === 'style' && typeof props[key] === 'object') {
                Object.assign(element.style, props[key]);
            } else if (key.startsWith('on')) {
                element.addEventListener(key.slice(2).toLowerCase(), props[key]);
            } else if (key === 'checked' && type === 'input') {
                // For checkboxes, set the property instead of attribute
                element.checked = !!props[key];
            } else if (key === 'disabled') {
                // For disabled, set the property instead of attribute
                element.disabled = !!props[key];
            } else if (key === 'value' && (type === 'input' || type === 'textarea' || type === 'select')) {
                // For form elements, set the value property instead of attribute
                element.value = props[key];
            } else {
                element.setAttribute(key, props[key]);
            }
        });
    }

    children.forEach(child => {
        if (typeof child === 'string') {
            element.appendChild(document.createTextNode(child));
        } else if (child instanceof Node) {
            element.appendChild(child);
        }
    });

    return element;
}

// Login Component
export function Login({ onLogin }) {
    const container = e('div', { className: 'login-form' },
        e('h2', {}, 'Welcome to Minimal Todo'),
        e('p', { className: 'muted' }, 'Please log in to continue'),
        e('form', {
            onSubmit: async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const email = formData.get('email');
                const password = formData.get('password');
                try {
                    await onLogin(email, password);
                } catch (error) {
                    alert('Login failed: ' + error.message);
                }
            }
        },
            e('div', { className: 'form-group' },
                e('label', { for: 'email' }, 'Email'),
                e('input', {
                    type: 'email',
                    id: 'email',
                    name: 'email',
                    required: true
                })
            ),
            e('div', { className: 'form-group' },
                e('label', { for: 'password' }, 'Password'),
                e('input', {
                    type: 'password',
                    id: 'password',
                    name: 'password',
                    required: true
                })
            ),
            e('button', { type: 'submit', className: 'btn' }, 'Login'),
            e('button', {
                type: 'button',
                className: 'btn btn-secondary',
                onClick: async () => {
                    const form = document.querySelector('form');
                    const formData = new FormData(form);
                    const email = formData.get('email');
                    const password = formData.get('password');
                    try {
                        await onLogin(email, password, true);
                    } catch (error) {
                        alert('Registration failed: ' + error.message);
                    }
                }
            }, 'Register')
        )
    );

    return container;
}

// Todo Item Component
export function TodoItem({ todo, index, isEditing, isExpanded, onToggle, onEdit, onUpdate, onFieldUpdate, onCancel, onToggleExpanded, onDelete, onDragStart, onDragEnter, onDragOver, onDragLeave, onDrop, onDragEnd, onTouchStart, onTouchMove, onTouchEnd }) {
    const container = e('div', {
        className: `todo ${todo.done ? 'done' : ''} ${isEditing ? 'editing' : ''} ${isExpanded ? 'expanded' : 'collapsed'}`,
        'data-todo-id': todo.id,
        draggable: false,
        onDragEnter: onDragEnter,
        onDragOver: onDragOver,
        onDragLeave: onDragLeave,
        onDrop: onDrop,
        onTouchStart: onTouchStart,
        onTouchMove: onTouchMove,
        onTouchEnd: onTouchEnd
    },
        e('div', { className: 'todo-header' },
            e('div', {
                className: 'drag-handle',
                draggable: !isEditing,
                onDragStart: onDragStart,
                onDragEnd: onDragEnd
            }, '⋮⋮'),
            e('input', {
                type: 'checkbox',
                checked: !!todo.done,
                onChange: () => onToggle(todo)
            }),
            isEditing ?
                e('input', {
                    className: 'name-edit-input',
                    value: todo.name,
                    onKeyDown: (ev) => {
                        if (ev.key === 'Enter') {
                            ev.preventDefault();
                            onUpdate(todo, ev.target.value);
                        }
                        if (ev.key === 'Escape') {
                            ev.target.value = todo.name;
                            ev.target.blur();
                        }
                    },
                    onBlur: (ev) => {
                        if (ev.target.value.trim() && ev.target.value !== todo.name) {
                            onUpdate(todo, ev.target.value.trim());
                        } else {
                            ev.target.value = todo.name;
                        }
                    },
                    onClick: (ev) => ev.stopPropagation(),
                    onFocus: (ev) => {
                        // Select all text when the input gets focus
                        ev.target.select();
                    }
                }) :
                e('span', {
                    className: 'name',
                    onClick: (e) => {
                        e.stopPropagation();
                        onEdit(todo);
                    }
                }, todo.name),
            e('button', {
                className: 'expand-icon',
                onClick: (e) => {
                    e.stopPropagation();
                    onToggleExpanded(todo);
                }
            }, isExpanded ? '▼' : '▶')
        ),
        e('div', { className: 'todo-content' },
            e('div', { className: 'todo-details' },
                e('div', { className: 'todo-fields' },
                    e('div', { className: 'field-group' },
                        e('label', { className: 'field-label' }, 'Notes'),
                        e('textarea', {
                            className: 'field-textarea',
                            placeholder: 'Add notes...',
                            rows: 3,
                            value: todo.notes || '',
                            onKeyDown: (ev) => {
                                if (ev.key === 'Enter' && ev.ctrlKey) {
                                    ev.preventDefault();
                                    onFieldUpdate(todo, 'notes', ev.target.value);
                                }
                            },
                            onBlur: (ev) => {
                                if (ev.target.value !== (todo.notes || '')) {
                                    onFieldUpdate(todo, 'notes', ev.target.value);
                                }
                            },
                            onClick: (ev) => ev.stopPropagation()
                        })
                    ),
                    e('div', { className: 'field-row' },
                        e('div', { className: 'field-group' },
                            e('label', { className: 'field-label' }, 'Category'),
                            e('input', {
                                type: 'text',
                                className: 'field-input',
                                placeholder: 'Enter category...',
                                value: todo.category || '',
                                onBlur: (ev) => {
                                    if (ev.target.value !== (todo.category || '')) {
                                        onFieldUpdate(todo, 'category', ev.target.value);
                                    }
                                },
                                onClick: (ev) => ev.stopPropagation()
                            })
                        ),
                        e('div', { className: 'field-group' },
                            e('label', { className: 'field-label' }, 'Parent Task ID'),
                            e('input', {
                                type: 'number',
                                className: 'field-input',
                                placeholder: 'Parent task ID',
                                value: todo.parent_node_id || '',
                                onBlur: (ev) => {
                                    const value = ev.target.value ? parseInt(ev.target.value) : null;
                                    if (value !== todo.parent_node_id) {
                                        onFieldUpdate(todo, 'parent_node_id', value);
                                    }
                                },
                                onClick: (ev) => ev.stopPropagation()
                            })
                        )
                    ),
                    e('div', { className: 'field-group' },
                        e('label', { className: 'field-label' }, 'Priority'),
                        e('select', {
                            className: 'field-select',
                            value: todo.priority || 1,
                            onChange: (ev) => {
                                const value = parseInt(ev.target.value);
                                if (value !== (todo.priority || 1)) {
                                    onFieldUpdate(todo, 'priority', value);
                                }
                            },
                            onClick: (ev) => ev.stopPropagation()
                        },
                            e('option', { value: 1 }, 'Low (1)'),
                            e('option', { value: 2 }, 'Medium (2)'),
                            e('option', { value: 3 }, 'High (3)'),
                            e('option', { value: 4 }, 'Urgent (4)'),
                            e('option', { value: 5 }, 'Critical (5)')
                        )
                    )
                ),
                e('div', { className: 'timestamps' },
                    todo.last_changed ? e('span', { className: 'timestamp' }, `Modified: ${new Date(todo.last_changed).toLocaleDateString()}`) : null,
                    todo.created_at ? e('span', { className: 'timestamp' }, `Created: ${new Date(todo.created_at).toLocaleDateString()}`) : null,
                    todo.done_at ? e('span', { className: 'timestamp done-timestamp' }, `Completed: ${new Date(todo.done_at).toLocaleDateString()}`) : null
                ),
                e('div', { className: 'todo-actions' },
                    e('button', {
                        className: 'delete-button',
                        onClick: (e) => {
                            e.stopPropagation();
                            if (confirm('Are you sure you want to delete this todo?')) {
                                onDelete(todo);
                            }
                        }
                    }, 'Delete')
                )
            )
        )
    );

    return container;
}

// Filter Controls Component
export function FilterControls({ filter, onFilterChange, doneAgeFilter, onDoneAgeChange }) {
    const container = e('div', { className: 'filter-controls' },
        e('div', { className: 'filter-buttons' },
            e('button', {
                className: `filter-btn ${filter === 'separate' ? 'active' : ''}`,
                onClick: () => onFilterChange('separate')
            }, 'Separate'),
            e('button', {
                className: `filter-btn ${filter === 'all' ? 'active' : ''}`,
                onClick: () => onFilterChange('all')
            }, 'All'),
            e('button', {
                className: `filter-btn ${filter === 'active' ? 'active' : ''}`,
                onClick: () => onFilterChange('active')
            }, 'Active'),
            e('button', {
                className: `filter-btn ${filter === 'done' ? 'active' : ''}`,
                onClick: () => onFilterChange('done')
            }, 'Done')
        ),
        e('div', { className: 'age-filter' },
            e('label', { for: 'age-filter' }, 'Show done items from last:'),
            e('select', {
                id: 'age-filter',
                value: doneAgeFilter,
                onChange: (e) => onDoneAgeChange(parseInt(e.target.value))
            },
                e('option', { value: '1' }, '1 day'),
                e('option', { value: '3' }, '3 days'),
                e('option', { value: '7' }, '7 days'),
                e('option', { value: '14' }, '14 days'),
                e('option', { value: '30' }, '30 days'),
                e('option', { value: '90' }, '90 days'),
                e('option', { value: '365' }, '1 year'),
                e('option', { value: '9999' }, 'All time')
            )
        )
    );

    return container;
}

// Todo Input Component
export function TodoInput({ onAdd }) {
    const container = e('div', { className: 'todo-input' },
        e('input', {
            type: 'text',
            placeholder: 'Add a new todo...',
            onKeyDown: (e) => {
                if (e.key === 'Enter' && e.target.value.trim()) {
                    onAdd(e.target.value.trim());
                    e.target.value = '';
                }
            }
        }),
        e('button', {
            onClick: (e) => {
                const input = e.target.previousElementSibling;
                if (input.value.trim()) {
                    onAdd(input.value.trim());
                    input.value = '';
                }
            }
        }, 'Add')
    );

    return container;
}


// Status Component
export function Status({ message }) {
    const container = e('div', { className: 'status' }, message);
    return container;
}
