// Drag and drop functionality for Todo App

export class DragHandler {
    constructor(onReorder) {
        this.onReorder = onReorder;
        this.isDragging = false;
        this.dragIndex = -1;
        this.longPressTimer = null;
        this.dragOverIndex = -1;
        this.initialTouchY = null;
        this.initialTouchX = null;
        this.touchStartTime = null;
        this.touchStartIndex = -1;
    }

    // Desktop drag and drop handlers
    handleDragStart(e, index) {
        // Only allow dragging from the drag handle
        if (!e.target.classList.contains('drag-handle')) {
            e.preventDefault();
            return;
        }

        this.isDragging = true;
        this.dragIndex = index;

        // Add dragging class to the parent todo item, not the handle
        const todoItem = e.target.closest('.todo');
        if (todoItem) {
            todoItem.classList.add('dragging');
        }

        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', todoItem ? todoItem.outerHTML : '');
    }

    handleDragEnter(e, index) {
        e.preventDefault();
        if (this.isDragging && index !== this.dragIndex) {
            this.dragOverIndex = index;
            e.target.classList.add('drag-over');
        }
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    handleDragLeave(e) {
        e.target.classList.remove('drag-over');
    }

    handleDrop(e, index) {
        e.preventDefault();
        e.target.classList.remove('drag-over');

        if (this.isDragging && index !== this.dragIndex) {
            this.onReorder(this.dragIndex, index);
        }
    }

    handleDragEnd(e) {
        this.isDragging = false;
        this.dragIndex = -1;
        this.dragOverIndex = -1;

        // Remove dragging class from the parent todo item
        const todoItem = e.target.closest('.todo');
        if (todoItem) {
            todoItem.classList.remove('dragging');
        }
        e.target.classList.remove('drag-over');

        // Remove drag-over class from all elements
        document.querySelectorAll('.todo').forEach(el => {
            el.classList.remove('drag-over');
        });
    }

    // Mobile touch handlers
    handleTouchStart(e, idx) {
        try {
            // Only activate drag on the drag handle
            if (!e.target.classList.contains('drag-handle')) {
                return;
            }

            // Store the initial touch position
            const touch = e.touches[0];
            this.initialTouchY = touch.clientY;
            this.initialTouchX = touch.clientX;
            this.touchStartTime = Date.now();
            this.touchStartIndex = idx;

            // Show long press indicator after 200ms
            const indicatorTimer = setTimeout(() => {
                if (e.target && !this.isDragging) {
                    e.target.classList.add('long-press');
                }
            }, 200);

            const timer = setTimeout(() => {
                try {
                    // Mobile-specific drag start
                    this.isDragging = true;
                    this.dragIndex = idx;
                    console.log('Mobile drag started - isDragging:', this.isDragging, 'dragIndex:', this.dragIndex);

                    // Add visual feedback to the parent todo item
                    const todoItem = e.target.closest('.todo');
                    if (todoItem) {
                        todoItem.classList.remove('long-press');
                        todoItem.classList.add('dragging');
                        console.log('Added dragging class to todo item');
                    }
                } catch (err) {
                    console.error('Touch drag start error:', err);
                }
            }, 300); // 300ms long press
            this.longPressTimer = timer;

            // Store indicator timer for cleanup
            e.target._indicatorTimer = indicatorTimer;
        } catch (err) {
            console.error('Touch start error:', err);
        }
    }

    handleTouchMove(e, idx) {
        try {
            // Only handle if we're actually dragging
            if (this.isDragging && this.dragIndex !== -1) {
                e.preventDefault();
                e.stopPropagation();

                const touch = e.touches[0];
                if (touch) {
                    console.log('Touch move - clientY:', touch.clientY, 'clientX:', touch.clientX);

                    // Get all todo elements
                    const todoElements = document.querySelectorAll('.todo');
                    console.log('Found', todoElements.length, 'todo elements');

                    let targetIndex = -1;
                    let closestElement = null;
                    let minDistance = Infinity;

                    // Check each todo element to find the closest one
                    for (let i = 0; i < todoElements.length; i++) {
                        const rect = todoElements[i].getBoundingClientRect();
                        const centerY = rect.top + (rect.height / 2);
                        const distance = Math.abs(touch.clientY - centerY);

                        console.log(`Todo ${i}: rect.top=${rect.top}, rect.bottom=${rect.bottom}, centerY=${centerY}, distance=${distance}`);

                        // If touch is directly over this element, use it immediately
                        if (touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
                            targetIndex = i;
                            closestElement = todoElements[i];
                            console.log('Touch is directly over todo', i);
                            break;
                        }

                        // Otherwise, track the closest one
                        if (distance < minDistance) {
                            minDistance = distance;
                            targetIndex = i;
                            closestElement = todoElements[i];
                        }
                    }

                    console.log('Selected target index:', targetIndex, 'minDistance:', minDistance);

                    // Only reorder if we've moved to a different position
                    if (targetIndex !== -1 &&
                        targetIndex !== this.dragIndex &&
                        targetIndex >= 0 &&
                        targetIndex < todoElements.length) {

                        console.log('Reordering from', this.dragIndex, 'to', targetIndex);

                        // Add visual feedback for the target position
                        todoElements.forEach((el, index) => {
                            el.classList.remove('drag-over');
                            if (index === targetIndex) {
                                el.classList.add('drag-over');
                            }
                        });

                        // Mobile-specific reorder logic
                        this.onReorder(this.dragIndex, targetIndex);
                        this.dragIndex = targetIndex;
                    }
                }
            }
        } catch (err) {
            console.error('Touch move error:', err);
        }
    }

    handleTouchEnd(e) {
        try {
            if (this.longPressTimer) {
                clearTimeout(this.longPressTimer);
                this.longPressTimer = null;
            }

            // Clean up indicator timer
            if (e.target && e.target._indicatorTimer) {
                clearTimeout(e.target._indicatorTimer);
                e.target._indicatorTimer = null;
            }

            if (this.isDragging) {
                // Only prevent default when actually dragging
                e.preventDefault();
                e.stopPropagation();

                // Mobile-specific drag end - just reset state
                this.isDragging = false;
                this.dragIndex = -1;
                this.initialTouchY = null;
                this.initialTouchX = null;
                this.touchStartTime = null;
                this.touchStartIndex = -1;

                // Reset visual feedback on both drag handle and todo item
                if (e.target) {
                    e.target.classList.remove('long-press');
                }
                const todoItem = e.target.closest('.todo');
                if (todoItem) {
                    todoItem.classList.remove('dragging', 'long-press');
                }

                // Remove drag-over class from all elements
                document.querySelectorAll('.todo').forEach(el => {
                    el.classList.remove('drag-over');
                });
            } else {
                // Reset visual feedback if not dragging
                if (e.target) {
                    e.target.classList.remove('long-press');
                }
            }
        } catch (err) {
            console.error('Touch end error:', err);
        }
    }

    // Reorder helper
    reorderItems(items, fromIndex, toIndex) {
        const arr = items.slice();
        [arr[fromIndex], arr[toIndex]] = [arr[toIndex], arr[fromIndex]];
        return arr;
    }
}