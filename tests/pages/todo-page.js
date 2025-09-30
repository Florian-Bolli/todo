// Todo app page object model

import { BasePage } from '../helpers/page-helpers.js';
import { waitForNetworkIdle } from '../helpers/test-data.js';

export class TodoPage extends BasePage {
    constructor(page) {
        super(page);
        
        // Selectors
        this.selectors = {
            // Header
            header: '.header',
            title: 'h1',
            logoutLink: '.logout-link',
            
            // Todo input
            todoInput: 'input[placeholder*="Add a new todo"]',
            addButton: 'button:has-text("Add")',
            
            // Filter controls
            filterControls: '.filter-controls',
            filterButtons: '.filter-btn',
            separateFilter: '.filter-btn:has-text("Separate")',
            allFilter: '.filter-btn:has-text("All")',
            activeFilter: '.filter-btn:has-text("Active")',
            doneFilter: '.filter-btn:has-text("Done")',
            
            // Todo list
            todoList: '.todo-list',
            todoItems: '.todo',
            todoItem: (index) => `.todo:nth-child(${index})`,
            todoName: (index) => `.todo:nth-child(${index}) .name`,
            todoCheckbox: (index) => `.todo:nth-child(${index}) input[type="checkbox"]`,
            todoEditInput: (index) => `.todo:nth-child(${index}) .name-edit-input`,
            expandButton: (index) => `.todo:nth-child(${index}) .expand-icon`,
            deleteButton: (index) => `.todo:nth-child(${index}) .delete-button`,
            
            // Todo details (expanded)
            todoDetails: (index) => `.todo:nth-child(${index}) .todo-details`,
            notesTextarea: (index) => `.todo:nth-child(${index}) .field-textarea`,
            categorySelect: (index) => `.todo:nth-child(${index}) .field-select`,
            prioritySelect: (index) => `.todo:nth-child(${index}) .field-select`,
            parentInput: (index) => `.todo:nth-child(${index}) input[placeholder*="Parent task ID"]`,
            
            // Status
            status: '#status',
            
            // Sections
            activeSection: '.section-title:has-text("Active")',
            doneSection: '.section-title:has-text("Completed")',
            separator: '.separator'
        };
    }

    /**
     * Check if todo app is loaded
     */
    async isLoaded() {
        return await this.elementExists(this.selectors.header) && 
               await this.elementExists(this.selectors.todoInput);
    }

    /**
     * Wait for todo app to load
     */
    async waitForLoad() {
        await this.waitForElement(this.selectors.header);
        await this.waitForElement(this.selectors.todoInput);
    }

    /**
     * Add a new todo
     */
    async addTodo(text) {
        await this.fillAndWait(this.selectors.todoInput, text);
        await this.page.press(this.selectors.todoInput, 'Enter');
        await waitForNetworkIdle(this.page);
    }

    /**
     * Add todo using button
     */
    async addTodoWithButton(text) {
        await this.fillAndWait(this.selectors.todoInput, text);
        await this.clickAndWait(this.selectors.addButton);
    }

    /**
     * Get todo count
     */
    async getTodoCount() {
        const todos = await this.page.$$(this.selectors.todoItems);
        return todos.length;
    }

    /**
     * Get todo text by index
     */
    async getTodoText(index) {
        return await this.getElementText(this.selectors.todoName(index));
    }

    /**
     * Check if todo is done
     */
    async isTodoDone(index) {
        const checkbox = await this.page.$(this.selectors.todoCheckbox(index));
        return await checkbox.isChecked();
    }

    /**
     * Toggle todo completion
     */
    async toggleTodo(index) {
        await this.clickAndWait(this.selectors.todoCheckbox(index));
    }

    /**
     * Edit todo name
     */
    async editTodoName(index, newName) {
        // Double click to edit
        await this.page.dblclick(this.selectors.todoName(index));
        await this.waitForElement(this.selectors.todoEditInput(index));
        
        // Clear and type new name
        await this.page.fill(this.selectors.todoEditInput(index), '');
        await this.fillAndWait(this.selectors.todoEditInput(index), newName);
        
        // Press Enter to save
        await this.page.press(this.selectors.todoEditInput(index), 'Enter');
        await this.waitForNetworkIdle();
    }

    /**
     * Cancel todo edit
     */
    async cancelTodoEdit(index) {
        await this.page.dblclick(this.selectors.todoName(index));
        await this.waitForElement(this.selectors.todoEditInput(index));
        await this.page.press(this.selectors.todoEditInput(index), 'Escape');
        await this.waitForNetworkIdle();
    }

    /**
     * Expand todo details
     */
    async expandTodo(index) {
        await this.clickAndWait(this.selectors.expandButton(index));
    }

    /**
     * Collapse todo details
     */
    async collapseTodo(index) {
        await this.clickAndWait(this.selectors.expandButton(index));
    }

    /**
     * Check if todo is expanded
     */
    async isTodoExpanded(index) {
        const todo = await this.page.$(this.selectors.todoItem(index));
        const classes = await todo.getAttribute('class');
        return classes.includes('expanded');
    }

    /**
     * Update todo notes
     */
    async updateTodoNotes(index, notes) {
        await this.expandTodo(index);
        await this.fillAndWait(this.selectors.notesTextarea(index), notes);
        await this.page.blur(this.selectors.notesTextarea(index));
        await this.waitForNetworkIdle();
    }

    /**
     * Update todo category
     */
    async updateTodoCategory(index, categoryValue) {
        await this.expandTodo(index);
        await this.page.selectOption(this.selectors.categorySelect(index), categoryValue);
        await this.waitForNetworkIdle();
    }

    /**
     * Update todo priority
     */
    async updateTodoPriority(index, priority) {
        await this.expandTodo(index);
        await this.page.selectOption(this.selectors.prioritySelect(index), priority.toString());
        await this.waitForNetworkIdle();
    }

    /**
     * Delete todo
     */
    async deleteTodo(index) {
        await this.expandTodo(index);
        
        // Handle confirmation dialog
        this.page.on('dialog', dialog => dialog.accept());
        
        await this.clickAndWait(this.selectors.deleteButton(index));
        await this.waitForNetworkIdle();
    }

    /**
     * Set filter
     */
    async setFilter(filterType) {
        const filterSelectors = {
            'separate': this.selectors.separateFilter,
            'all': this.selectors.allFilter,
            'active': this.selectors.activeFilter,
            'done': this.selectors.doneFilter
        };
        
        const selector = filterSelectors[filterType];
        if (selector) {
            await this.clickAndWait(selector);
        }
    }

    /**
     * Get current filter
     */
    async getCurrentFilter() {
        const activeFilter = await this.page.$('.filter-btn.active');
        if (activeFilter) {
            return await activeFilter.textContent();
        }
        return null;
    }

    /**
     * Get status text
     */
    async getStatusText() {
        return await this.getElementText(this.selectors.status);
    }

    /**
     * Logout
     */
    async logout() {
        await this.clickAndWait(this.selectors.logoutLink);
    }

    /**
     * Click outside todos to collapse them
     */
    async clickOutsideTodos() {
        // Click on header to trigger outside click
        await this.page.click(this.selectors.header);
        await this.waitForNetworkIdle();
    }

    /**
     * Get all todo texts
     */
    async getAllTodoTexts() {
        const todos = await this.page.$$(this.selectors.todoItems);
        const texts = [];
        for (let i = 1; i <= todos.length; i++) {
            const text = await this.getTodoText(i);
            texts.push(text);
        }
        return texts;
    }

    /**
     * Find todo index by text
     */
    async findTodoIndexByText(text) {
        const todos = await this.page.$$(this.selectors.todoItems);
        for (let i = 1; i <= todos.length; i++) {
            const todoText = await this.getTodoText(i);
            if (todoText === text) {
                return i;
            }
        }
        return -1;
    }

    /**
     * Wait for todo to appear
     */
    async waitForTodo(text, timeout = 10000) {
        await this.page.waitForFunction(
            (text) => {
                const todos = Array.from(document.querySelectorAll('.todo .name'));
                return todos.some(todo => todo.textContent === text);
            },
            text,
            { timeout }
        );
    }

    /**
     * Wait for todo to disappear
     */
    async waitForTodoToDisappear(text, timeout = 10000) {
        await this.page.waitForFunction(
            (text) => {
                const todos = Array.from(document.querySelectorAll('.todo .name'));
                return !todos.some(todo => todo.textContent === text);
            },
            text,
            { timeout }
        );
    }

    /**
     * Click on a category filter button
     */
    async clickCategoryFilter(categoryName) {
        await this.clickAndWait(`.category-filter-btn:has-text("${categoryName}")`);
    }

    /**
     * Double-click on a category filter button
     */
    async doubleClickCategoryFilter(categoryName) {
        await this.page.dblclick(`.category-filter-btn:has-text("${categoryName}")`);
        await this.waitForNetworkIdle();
    }

    /**
     * Check if a category filter button is active
     */
    async isCategoryFilterActive(categoryName) {
        const button = this.page.locator(`.category-filter-btn:has-text("${categoryName}")`);
        return await button.evaluate(el => el.classList.contains('active'));
    }

    /**
     * Get all visible todo texts
     */
    async getVisibleTodoTexts() {
        const todos = await this.page.$$(this.selectors.todoItems);
        const texts = [];
        for (const todo of todos) {
            const nameElement = await todo.$('.name');
            if (nameElement) {
                const text = await nameElement.textContent();
                texts.push(text);
            }
        }
        return texts;
    }

    /**
     * Add a new category
     */
    async addCategory(name) {
        // Click on the add category button (if it exists) or use the category input
        const categoryInput = await this.page.$('input[placeholder*="category" i], input[placeholder*="Category"]');
        if (categoryInput) {
            await this.fillAndWait(categoryInput, name);
            await this.page.press(categoryInput, 'Enter');
            await waitForNetworkIdle(this.page);
        } else {
            // If no category input exists, we might need to create categories through the API
            // For now, we'll assume categories are created through the UI
            throw new Error('Category input not found. Categories may need to be created through the API.');
        }
    }
}
