// State persistence and offline functionality tests

import { test, expect } from '@playwright/test';
import { AuthPage } from '../pages/auth-page.js';
import { TodoPage } from '../pages/todo-page.js';
import { generateRandomEmail, generateRandomPassword, generateRandomTodo, clearStorage } from '../helpers/test-data.js';

test.describe('State Persistence', () => {
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

    test('should persist todos after page reload', async ({ page }) => {
        const todos = [
            generateRandomTodo(),
            generateRandomTodo(),
            generateRandomTodo()
        ];
        
        // Add todos
        for (const todo of todos) {
            await todoPage.addTodo(todo);
            await todoPage.waitForTodo(todo);
        }
        
        // Complete one todo
        await todoPage.toggleTodo(1);
        
        // Reload page
        await page.reload();
        await todoPage.waitForLoad();
        
        // Verify todos are still there
        const todoCount = await todoPage.getTodoCount();
        expect(todoCount).toBe(3);
        
        const allTodos = await todoPage.getAllTodoTexts();
        for (const todo of todos) {
            expect(allTodos).toContain(todo);
        }
        
        // Verify completed state is preserved
        expect(await todoPage.isTodoDone(1)).toBe(true);
    });

    test('should persist user session after page reload', async ({ page }) => {
        // Add a todo to verify we're logged in
        const todoText = generateRandomTodo();
        await todoPage.addTodo(todoText);
        await todoPage.waitForTodo(todoText);
        
        // Reload page
        await page.reload();
        await todoPage.waitForLoad();
        
        // Should still be logged in and see the todo
        expect(await todoPage.isLoaded()).toBe(true);
        const todoCount = await todoPage.getTodoCount();
        expect(todoCount).toBe(1);
    });

    test('should persist filter selection after page reload', async ({ page }) => {
        const todos = [
            generateRandomTodo(),
            generateRandomTodo()
        ];
        
        // Add todos
        for (const todo of todos) {
            await todoPage.addTodo(todo);
            await todoPage.waitForTodo(todo);
        }
        
        // Complete one todo
        await todoPage.toggleTodo(1);
        
        // Change filter to "Active"
        await todoPage.setFilter('active');
        
        // Reload page
        await page.reload();
        await todoPage.waitForLoad();
        
        // Verify filter is preserved
        const currentFilter = await todoPage.getCurrentFilter();
        expect(currentFilter).toContain('Active');
        
        // Should only show active todos
        const todoCount = await todoPage.getTodoCount();
        expect(todoCount).toBe(1); // Only the incomplete todo
    });

    test('should persist expanded todo state after page reload', async ({ page }) => {
        const todoText = generateRandomTodo();
        
        await todoPage.addTodo(todoText);
        await todoPage.waitForTodo(todoText);
        
        // Expand todo and add notes
        await todoPage.expandTodo(1);
        await todoPage.updateTodoNotes(1, 'Test notes');
        
        // Reload page
        await page.reload();
        await todoPage.waitForLoad();
        
        // Todo should be collapsed after reload (expanded state is not persisted)
        expect(await todoPage.isTodoExpanded(1)).toBe(false);
        
        // But notes should be preserved
        await todoPage.expandTodo(1);
        const notes = await page.inputValue(todoPage.selectors.notesTextarea(1));
        expect(notes).toBe('Test notes');
    });

    test('should maintain data consistency across multiple tabs', async ({ browser }) => {
        const context = await browser.newContext();
        const page1 = await context.newPage();
        const page2 = await context.newPage();
        
        const authPage1 = new AuthPage(page1);
        const authPage2 = new AuthPage(page2);
        const todoPage1 = new TodoPage(page1);
        const todoPage2 = new TodoPage(page2);
        
        try {
            // Login on both pages
            await authPage1.login(userEmail, userPassword);
            await authPage2.login(userEmail, userPassword);
            
            await todoPage1.waitForLoad();
            await todoPage2.waitForLoad();
            
            // Add todo on page 1
            const todoText = generateRandomTodo();
            await todoPage1.addTodo(todoText);
            await todoPage1.waitForTodo(todoText);
            
            // Reload page 2 to see the new todo
            await page2.reload();
            await todoPage2.waitForLoad();
            
            // Page 2 should see the new todo
            await todoPage2.waitForTodo(todoText);
            const todoCount = await todoPage2.getTodoCount();
            expect(todoCount).toBe(1);
            
        } finally {
            await context.close();
        }
    });

    test('should handle offline mode gracefully', async ({ page, context }) => {
        const todoText = generateRandomTodo();
        
        // Add a todo while online
        await todoPage.addTodo(todoText);
        await todoPage.waitForTodo(todoText);
        
        // Go offline
        await context.setOffline(true);
        
        // Try to add another todo while offline
        const offlineTodo = generateRandomTodo();
        await todoPage.addTodo(offlineTodo);
        
        // Should still work (local state)
        await page.waitForTimeout(1000); // Wait for potential offline handling
        const todoCount = await todoPage.getTodoCount();
        expect(todoCount).toBe(2);
        
        // Go back online
        await context.setOffline(false);
        
        // Wait for potential sync
        await page.waitForTimeout(2000);
        
        // Data should still be there
        const finalTodoCount = await todoPage.getTodoCount();
        expect(finalTodoCount).toBe(2);
    });

    test('should preserve todos after logout and login', async ({ page }) => {
        const todos = [
            generateRandomTodo(),
            generateRandomTodo()
        ];
        
        // Add todos
        for (const todo of todos) {
            await todoPage.addTodo(todo);
            await todoPage.waitForTodo(todo);
        }
        
        // Logout
        await todoPage.logout();
        await authPage.waitForElement(authPage.selectors.loginForm);
        
        // Login again
        await authPage.login(userEmail, userPassword);
        await todoPage.waitForLoad();
        
        // Todos should still be there
        const todoCount = await todoPage.getTodoCount();
        expect(todoCount).toBe(2);
        
        const allTodos = await todoPage.getAllTodoTexts();
        for (const todo of todos) {
            expect(allTodos).toContain(todo);
        }
    });

    test('should handle rapid successive operations', async ({ page }) => {
        const todos = [];
        
        // Add multiple todos rapidly
        for (let i = 0; i < 5; i++) {
            const todo = generateRandomTodo();
            todos.push(todo);
            await todoPage.addTodo(todo);
        }
        
        // Wait for all to appear
        await page.waitForTimeout(2000);
        
        const todoCount = await todoPage.getTodoCount();
        expect(todoCount).toBe(5);
        
        // Reload and verify all are still there
        await page.reload();
        await todoPage.waitForLoad();
        
        const finalTodoCount = await todoPage.getTodoCount();
        expect(finalTodoCount).toBe(5);
    });
});
