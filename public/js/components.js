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
export function TodoItem({ todo, index, isEditing, isExpanded, categories, onToggle, onEdit, onUpdate, onFieldUpdate, onCancel, onToggleExpanded, onDelete, onDragStart, onDragEnter, onDragOver, onDragLeave, onDrop, onDragEnd, onTouchStart, onTouchMove, onTouchEnd }) {
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
            e('div', {
                className: 'name-container',
                onClick: (e) => {
                    // Only expand if clicking in the container but not on the name text itself
                    if (!e.target.classList.contains('name')) {
                        e.stopPropagation();
                        onToggleExpanded(todo);
                    }
                }
            },
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
                            // Cancel editing on blur - don't save changes
                            onCancel(todo);
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
                    }, todo.name)
            ),
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
                            e('select', {
                                className: 'field-select',
                                value: todo.category_id || '',
                                disabled: !categories || categories.length === 0,
                                key: `category-select-${todo.id}-${categories?.length || 0}`,
                                onChange: (ev) => {
                                    const value = ev.target.value;
                                    const cleanValue = value === '' ? null : parseInt(value);

                                    // If categories array is empty, don't proceed
                                    if (!categories || categories.length === 0) {
                                        return;
                                    }

                                    // Validate that the selected category actually exists
                                    if (cleanValue !== null) {
                                        const categoryExists = categories.some(cat => cat.id === cleanValue);
                                        if (!categoryExists) {
                                            return; // Don't update if category doesn't exist
                                        }
                                    }

                                    if (cleanValue !== (todo.category_id || null)) {
                                        onFieldUpdate(todo, 'category_id', cleanValue);
                                    }
                                },
                                onClick: (ev) => ev.stopPropagation()
                            },
                                e('option', { value: '' }, 'No Category'),
                                ...(categories || []).filter(category => {
                                    // Only render categories with valid IDs
                                    const categoryObj = typeof category === 'string' ? { id: category, name: category } : category;
                                    return categoryObj && categoryObj.id && typeof categoryObj.id === 'number';
                                }).map(category => {
                                    // Handle both old format (string) and new format (object)
                                    const categoryObj = typeof category === 'string' ? { id: category, name: category } : category;
                                    return e('option', { 
                                        key: categoryObj.id, 
                                        value: categoryObj.id,
                                        selected: todo.category_id === categoryObj.id
                                    }, categoryObj.name);
                                })
                            )
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

// Category Filter Component
export function CategoryFilter({ categories, selectedCategories, onToggleCategory, onSelectAll, onSelectOnly }) {
    // Ensure selectedCategories is always a Set
    const safeSelectedCategories = selectedCategories instanceof Set ? selectedCategories : new Set();
    
    const container = e('div', { className: 'category-filter' },
        e('div', { className: 'category-filter-header' },
            e('label', { className: 'category-filter-label' }, 'Filter by Category:')
        ),
        e('div', { className: 'category-filter-buttons' },
            // All button
            e('button', {
                className: `category-filter-btn ${safeSelectedCategories.size === 0 ? 'active' : ''}`,
                onClick: (event) => {
                    event.stopPropagation();
                    onSelectAll();
                },
                title: 'Show all categories'
            }, 'All'),
            // Individual category buttons
            ...categories.map(category => {
                const isSelected = safeSelectedCategories.has(category.id);
                return e('button', {
                    key: `category-${category.id}`,
                    className: `category-filter-btn ${isSelected ? 'active' : ''}`,
                    onClick: (event) => {
                        event.stopPropagation();
                        onToggleCategory(category.id);
                    },
                    onDoubleClick: (event) => {
                        event.stopPropagation();
                        onSelectOnly(category.id);
                    },
                    title: `Click to toggle, double-click to show only this category`
                }, category.name);
            })
        )
    );

    return container;
}

// Filter Controls Component
export function FilterControls({ filter, onFilterChange, doneAgeFilter, onDoneAgeChange, categories, selectedCategories, onToggleCategory, onSelectAll, onSelectOnly }) {
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
        // Category filter component
        CategoryFilter({ 
            categories, 
            selectedCategories, 
            onToggleCategory, 
            onSelectAll, 
            onSelectOnly 
        }),
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


// Category Management Modal Component
export function CategoryModal({ isOpen, categories, onClose, onAddCategory, onDeleteCategory, onRenameCategory }) {
    if (!isOpen) return null;

    // Create a unique ID for this modal instance to manage state
    const modalId = 'category-modal-' + Date.now();

    // State management for modal - store in a global object
    if (!window.categoryModalState) {
        window.categoryModalState = {};
    }

    const state = window.categoryModalState[modalId] = window.categoryModalState[modalId] || {
        newCategoryName: '',
        editingCategory: null,
        editName: ''
    };

    const handleAddCategory = () => {
        const newName = state.newCategoryName.trim();
        if (newName && !categories.some(cat => {
            const catName = typeof cat === 'string' ? cat : cat.name;
            return catName === newName;
        })) {
            onAddCategory(newName);
            state.newCategoryName = '';
        }
    };

    const handleStartEdit = (category) => {
        state.editingCategory = category;
        state.editName = category.name;
    };

    const handleSaveEdit = () => {
        const newName = state.editName.trim();
        const oldName = state.editingCategory.name;
        if (newName && newName !== oldName && !categories.some(cat => {
            const catName = typeof cat === 'string' ? cat : cat.name;
            return catName === newName;
        })) {
            onRenameCategory(oldName, newName);
        }
        state.editingCategory = null;
        state.editName = '';
    };

    const handleCancelEdit = () => {
        state.editingCategory = null;
        state.editName = '';
    };

    const handleClose = () => {
        // Clean up state when modal closes
        if (window.categoryModalState && window.categoryModalState[modalId]) {
            delete window.categoryModalState[modalId];
        }
        onClose();
    };

    const container = e('div', { className: 'modal-overlay', onClick: handleClose },
        e('div', { className: 'modal-content', onClick: (e) => e.stopPropagation() },
            e('div', { className: 'modal-header' },
                e('h3', {}, 'Manage Categories'),
                e('button', { className: 'modal-close', onClick: handleClose }, '×')
            ),
            e('div', { className: 'modal-body' },
                e('div', { className: 'add-category-section' },
                    e('h4', {}, 'Add New Category'),
                    e('div', { className: 'add-category-form' },
                        e('input', {
                            type: 'text',
                            placeholder: 'Enter category name...',
                            value: state.newCategoryName,
                            onKeyDown: (e) => {
                                if (e.key === 'Enter') {
                                    state.newCategoryName = e.target.value;
                                    handleAddCategory();
                                }
                            },
                            onInput: (e) => {
                                state.newCategoryName = e.target.value;
                            }
                        }),
                        e('button', {
                            className: 'btn btn-primary',
                            onClick: (e) => {
                                const input = e.target.previousElementSibling;
                                state.newCategoryName = input.value;
                                handleAddCategory();
                            }
                        }, 'Add Category')
                    )
                ),
                e('div', { className: 'existing-categories-section' },
                    e('h4', {}, 'Existing Categories'),
                    e('div', { className: 'categories-list' },
                        ...categories.map(category => {
                            // Handle both old format (string) and new format (object)
                            const categoryObj = typeof category === 'string' ? { id: category, name: category } : category;
                            return e('div', { key: categoryObj.id, className: 'category-item' },
                                state.editingCategory && state.editingCategory.id === categoryObj.id ? (
                                    e('div', { className: 'category-edit-form' },
                                        e('input', {
                                            type: 'text',
                                            value: state.editName,
                                            onKeyDown: (e) => {
                                                if (e.key === 'Enter') {
                                                    state.editName = e.target.value;
                                                    handleSaveEdit();
                                                } else if (e.key === 'Escape') {
                                                    handleCancelEdit();
                                                }
                                            },
                                            onInput: (e) => {
                                                state.editName = e.target.value;
                                            }
                                        }),
                                        e('button', {
                                            className: 'btn btn-small btn-primary',
                                            onClick: (e) => {
                                                const input = e.target.previousElementSibling;
                                                state.editName = input.value;
                                                handleSaveEdit();
                                            }
                                        }, 'Save'),
                                        e('button', {
                                            className: 'btn btn-small btn-secondary',
                                            onClick: handleCancelEdit
                                        }, 'Cancel')
                                    )
                                ) : (
                                    e('div', { className: 'category-display' },
                                        e('span', { className: 'category-name' }, categoryObj.name),
                                        e('div', { className: 'category-actions' },
                                            e('button', {
                                                className: 'btn btn-small btn-secondary',
                                                onClick: () => handleStartEdit(categoryObj)
                                            }, 'Rename'),
                                            e('button', {
                                                className: 'btn btn-small btn-danger',
                                                onClick: () => {
                                                    if (confirm(`Are you sure you want to delete the category "${categoryObj.name}"? This will remove the category from all todos.`)) {
                                                        onDeleteCategory(categoryObj.name);
                                                    }
                                                }
                                            }, 'Delete')
                                        )
                                    )
                                )
                            );
                        })
                    )
                )
            )
        )
    );

    return container;
}

// Status Component
export function Status({ message }) {
    const container = e('div', { className: 'status' }, message);
    return container;
}
