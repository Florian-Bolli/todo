// Todo CRUD operations tests

import { test, expect } from '@playwright/test';
import { AuthPage } from '../pages/auth-page.js';
import { TodoPage } from '../pages/todo-page.js';
import { generateRandomEmail, generateRandomPassword, generateRandomTodo, clearStorage } from '../helpers/test-data.js';

test.describe('Todo CRUD Operations', () => {
    let authPage;
    let todoPage;
    let userEmail;
    let userPassword;

    test.beforeEach(async ({ page }) => {
        authPage = new AuthPage(page);
        todoPage = new TodoPage(page);
        
        // Navigate to page first, then clear storage
        await page.goto('/');
        await clearStorage(page);
        
        // Set up user for each test
        userEmail = generateRandomEmail();
        userPassword = generateRandomPassword();
        
        await authPage.register(userEmail, userPassword);
        await todoPage.waitForLoad();
    });

    test('should create a new todo', async ({ page }) => {
        const todoText = generateRandomTodo();
        
        await todoPage.addTodo(todoText);
        await todoPage.waitForTodo(todoText);
        
        const todoCount = await todoPage.getTodoCount();
        expect(todoCount).toBe(1);
        
        const allTodos = await todoPage.getAllTodoTexts();
        expect(allTodos).toContain(todoText);
    });

    test('should create multiple todos', async ({ page }) => {
        const todos = [
            generateRandomTodo(),
            generateRandomTodo(),
            generateRandomTodo()
        ];
        
        for (const todo of todos) {
            await todoPage.addTodo(todo);
            await todoPage.waitForTodo(todo);
        }
        
        const todoCount = await todoPage.getTodoCount();
        expect(todoCount).toBe(3);
        
        const allTodos = await todoPage.getAllTodoTexts();
        for (const todo of todos) {
            expect(allTodos).toContain(todo);
        }
    });

    test('should add todo using Enter key', async ({ page }) => {
        const todoText = generateRandomTodo();
        
        await todoPage.fillAndWait(todoPage.selectors.todoInput, todoText);
        await page.press(todoPage.selectors.todoInput, 'Enter');
        await todoPage.waitForTodo(todoText);
        
        const todoCount = await todoPage.getTodoCount();
        expect(todoCount).toBe(1);
    });

    test('should add todo using Add button', async ({ page }) => {
        const todoText = generateRandomTodo();
        
        await todoPage.addTodoWithButton(todoText);
        await todoPage.waitForTodo(todoText);
        
        const todoCount = await todoPage.getTodoCount();
        expect(todoCount).toBe(1);
    });

    test('should not add empty todo', async ({ page }) => {
        const initialCount = await todoPage.getTodoCount();
        
        // Try to add empty todo
        await todoPage.fillAndWait(todoPage.selectors.todoInput, '');
        await page.press(todoPage.selectors.todoInput, 'Enter');
        
        // Wait a bit to see if any todo appears
        await page.waitForTimeout(1000);
        
        const finalCount = await todoPage.getTodoCount();
        expect(finalCount).toBe(initialCount);
    });

    test('should edit todo name', async ({ page }) => {
        const originalText = generateRandomTodo();
        const newText = generateRandomTodo();
        
        await todoPage.addTodo(originalText);
        await todoPage.waitForTodo(originalText);
        
        const todoIndex = await todoPage.findTodoIndexByText(originalText);
        await todoPage.editTodoName(todoIndex, newText);
        
        // Wait for the todo to update
        await page.waitForTimeout(1000);
        
        const updatedText = await todoPage.getTodoText(todoIndex);
        expect(updatedText).toBe(newText);
    });

    test('should cancel todo edit with Escape key', async ({ page }) => {
        const originalText = generateRandomTodo();
        const newText = generateRandomTodo();
        
        await todoPage.addTodo(originalText);
        await todoPage.waitForTodo(originalText);
        
        const todoIndex = await todoPage.findTodoIndexByText(originalText);
        
        // Start editing
        await page.dblclick(todoPage.selectors.todoName(todoIndex));
        await todoPage.waitForElement(todoPage.selectors.todoEditInput(todoIndex));
        
        // Type new text
        await page.fill(todoPage.selectors.todoEditInput(todoIndex), newText);
        
        // Cancel with Escape
        await todoPage.cancelTodoEdit(todoIndex);
        
        // Original text should remain
        const finalText = await todoPage.getTodoText(todoIndex);
        expect(finalText).toBe(originalText);
    });

    test('should toggle todo completion', async ({ page }) => {
        const todoText = generateRandomTodo();
        
        await todoPage.addTodo(todoText);
        await todoPage.waitForTodo(todoText);
        
        const todoIndex = await todoPage.findTodoIndexByText(todoText);
        
        // Initially not done
        expect(await todoPage.isTodoDone(todoIndex)).toBe(false);
        
        // Toggle to done
        await todoPage.toggleTodo(todoIndex);
        expect(await todoPage.isTodoDone(todoIndex)).toBe(true);
        
        // Toggle back to not done
        await todoPage.toggleTodo(todoIndex);
        expect(await todoPage.isTodoDone(todoIndex)).toBe(false);
    });

    test('should delete todo', async ({ page }) => {
        const todoText = generateRandomTodo();
        
        await todoPage.addTodo(todoText);
        await todoPage.waitForTodo(todoText);
        
        const todoIndex = await todoPage.findTodoIndexByText(todoText);
        await todoPage.deleteTodo(todoIndex);
        
        await todoPage.waitForTodoToDisappear(todoText);
        
        const todoCount = await todoPage.getTodoCount();
        expect(todoCount).toBe(0);
    });

    test('should update todo notes', async ({ page }) => {
        const todoText = generateRandomTodo();
        const notes = 'These are test notes for the todo item.';
        
        await todoPage.addTodo(todoText);
        await todoPage.waitForTodo(todoText);
        
        const todoIndex = await todoPage.findTodoIndexByText(todoText);
        await todoPage.updateTodoNotes(todoIndex, notes);
        
        // Verify notes were saved by expanding again
        await todoPage.expandTodo(todoIndex);
        const savedNotes = await page.inputValue(todoPage.selectors.notesTextarea(todoIndex));
        expect(savedNotes).toBe(notes);
    });

    test('should update todo priority', async ({ page }) => {
        const todoText = generateRandomTodo();
        
        await todoPage.addTodo(todoText);
        await todoPage.waitForTodo(todoText);
        
        const todoIndex = await todoPage.findTodoIndexByText(todoText);
        await todoPage.updateTodoPriority(todoIndex, '3'); // High priority
        
        // Verify priority was saved
        await todoPage.expandTodo(todoIndex);
        const savedPriority = await page.inputValue(todoPage.selectors.prioritySelect(todoIndex));
        expect(savedPriority).toBe('3');
    });

    test('should expand and collapse todo details', async ({ page }) => {
        const todoText = generateRandomTodo();
        
        await todoPage.addTodo(todoText);
        await todoPage.waitForTodo(todoText);
        
        const todoIndex = await todoPage.findTodoIndexByText(todoText);
        
        // Initially collapsed
        expect(await todoPage.isTodoExpanded(todoIndex)).toBe(false);
        
        // Expand
        await todoPage.expandTodo(todoIndex);
        expect(await todoPage.isTodoExpanded(todoIndex)).toBe(true);
        
        // Collapse
        await todoPage.collapseTodo(todoIndex);
        expect(await todoPage.isTodoExpanded(todoIndex)).toBe(false);
    });

    test('should show correct status count', async ({ page }) => {
        const todos = [generateRandomTodo(), generateRandomTodo(), generateRandomTodo()];
        
        // Add todos
        for (const todo of todos) {
            await todoPage.addTodo(todo);
            await todoPage.waitForTodo(todo);
        }
        
        // All should be active initially
        const statusText = await todoPage.getStatusText();
        expect(statusText).toContain('0/3 completed');
        
        // Complete one todo
        const firstTodoIndex = 1;
        await todoPage.toggleTodo(firstTodoIndex);
        
        const updatedStatusText = await todoPage.getStatusText();
        expect(updatedStatusText).toContain('1/3 completed');
    });
});
