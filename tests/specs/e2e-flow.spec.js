// Complete end-to-end flow test

import { test, expect } from '@playwright/test';
import { AuthPage } from '../pages/auth-page.js';
import { TodoPage } from '../pages/todo-page.js';
import { generateRandomEmail, generateRandomPassword, generateRandomTodo, clearStorage } from '../helpers/test-data.js';

test.describe('Complete E2E Flow', () => {
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
        
        userEmail = generateRandomEmail();
        userPassword = generateRandomPassword();
    });

    test('complete user journey: register -> login -> add items -> modify -> delete -> logout -> login -> reload', async ({ page }) => {
        // Step 1: Register new account
        await test.step('Register new account', async () => {
            await authPage.register(userEmail, userPassword);
            await todoPage.waitForLoad();
            expect(await todoPage.isLoaded()).toBe(true);
        });

        // Step 2: Add multiple todos
        await test.step('Add multiple todos', async () => {
            const todos = [
                'Buy groceries for the week',
                'Complete project report',
                'Call dentist for appointment',
                'Plan weekend trip',
                'Learn new programming language'
            ];

            for (const todo of todos) {
                await todoPage.addTodo(todo);
                await todoPage.waitForTodo(todo);
            }

            const todoCount = await todoPage.getTodoCount();
            expect(todoCount).toBe(5);

            // Verify all todos are active
            const statusText = await todoPage.getStatusText();
            expect(statusText).toContain('0/5 completed');
        });

        // Step 3: Modify todos (complete some, edit others)
        await test.step('Modify todos - complete and edit', async () => {
            // Complete first two todos
            await todoPage.toggleTodo(1); // Buy groceries
            await todoPage.toggleTodo(2); // Complete project report

            // Edit third todo
            await todoPage.editTodoName(3, 'Call dentist and schedule cleaning');

            // Add notes to fourth todo
            await todoPage.updateTodoNotes(4, 'Research destinations and book flights');

            // Update priority of fifth todo
            await todoPage.updateTodoPriority(5, '4'); // High priority

            // Wait for all changes to be applied
            await page.waitForTimeout(2000);

            // Verify changes
            expect(await todoPage.isTodoDone(1)).toBe(true);
            expect(await todoPage.isTodoDone(2)).toBe(true);
            expect(await todoPage.getTodoText(3)).toBe('Call dentist and schedule cleaning');

            const statusText = await todoPage.getStatusText();
            expect(statusText).toContain('2/5 completed');
        });

        // Step 4: Test filtering
        await test.step('Test filtering functionality', async () => {
            // Test Active filter
            await todoPage.setFilter('active');
            let activeCount = await todoPage.getTodoCount();
            expect(activeCount).toBe(3); // 3 remaining active todos

            // Test Done filter
            await todoPage.setFilter('done');
            let doneCount = await todoPage.getTodoCount();
            expect(doneCount).toBe(2); // 2 completed todos

            // Test Separate filter (default)
            await todoPage.setFilter('separate');
            let separateCount = await todoPage.getTodoCount();
            expect(separateCount).toBe(5); // All todos in separate view

            // Test All filter
            await todoPage.setFilter('all');
            let allCount = await todoPage.getTodoCount();
            expect(allCount).toBe(5); // All todos
        });

        // Step 5: Delete a todo
        await test.step('Delete a todo', async () => {
            await todoPage.setFilter('separate'); // Back to separate view
            
            const initialCount = await todoPage.getTodoCount();
            await todoPage.deleteTodo(3); // Delete "Call dentist..." todo
            
            await page.waitForTimeout(1000);
            
            const finalCount = await todoPage.getTodoCount();
            expect(finalCount).toBe(initialCount - 1);

            const statusText = await todoPage.getStatusText();
            expect(statusText).toContain('2/4 completed');
        });

        // Step 6: Test expand/collapse and click outside
        await test.step('Test expand/collapse and click outside', async () => {
            // Expand a todo
            await todoPage.expandTodo(1);
            expect(await todoPage.isTodoExpanded(1)).toBe(true);

            // Expand another todo
            await todoPage.expandTodo(2);
            expect(await todoPage.isTodoExpanded(2)).toBe(true);

            // Click outside to collapse all
            await todoPage.clickOutsideTodos();
            
            // All should be collapsed
            expect(await todoPage.isTodoExpanded(1)).toBe(false);
            expect(await todoPage.isTodoExpanded(2)).toBe(false);
        });

        // Step 7: Logout
        await test.step('Logout from the application', async () => {
            await todoPage.logout();
            await authPage.waitForElement(authPage.selectors.loginForm);
            expect(await authPage.isLoginFormVisible()).toBe(true);
        });

        // Step 8: Login again
        await test.step('Login with same credentials', async () => {
            await authPage.login(userEmail, userPassword);
            await todoPage.waitForLoad();
            expect(await todoPage.isLoaded()).toBe(true);

            // Verify todos are still there
            const todoCount = await todoPage.getTodoCount();
            expect(todoCount).toBe(4); // 4 todos remaining

            const statusText = await todoPage.getStatusText();
            expect(statusText).toContain('2/4 completed');
        });

        // Step 9: Reload page and verify persistence
        await test.step('Reload page and verify data persistence', async () => {
            await page.reload();
            await todoPage.waitForLoad();
            
            // Should still be logged in
            expect(await todoPage.isLoaded()).toBe(true);

            // Verify todos are still there
            const todoCount = await todoPage.getTodoCount();
            expect(todoCount).toBe(4);

            // Verify completed state is preserved
            expect(await todoPage.isTodoDone(1)).toBe(true);
            expect(await todoPage.isTodoDone(2)).toBe(true);

            // Verify edited todo name is preserved
            expect(await todoPage.getTodoText(3)).toBe('Call dentist and schedule cleaning');

            // Verify notes are preserved
            await todoPage.expandTodo(4);
            const notes = await page.inputValue(todoPage.selectors.notesTextarea(4));
            expect(notes).toBe('Research destinations and book flights');

            // Verify priority is preserved
            const priority = await page.inputValue(todoPage.selectors.prioritySelect(4));
            expect(priority).toBe('4');

            const statusText = await todoPage.getStatusText();
            expect(statusText).toContain('2/4 completed');
        });

        // Step 10: Final verification
        await test.step('Final verification of all functionality', async () => {
            // Test that we can still add new todos
            const newTodo = 'Final test todo';
            await todoPage.addTodo(newTodo);
            await todoPage.waitForTodo(newTodo);

            const finalTodoCount = await todoPage.getTodoCount();
            expect(finalTodoCount).toBe(5);

            const finalStatusText = await todoPage.getStatusText();
            expect(finalStatusText).toContain('2/5 completed');

            // Test that we can still edit and delete
            await todoPage.toggleTodo(5); // Complete the new todo
            expect(await todoPage.isTodoDone(5)).toBe(true);

            const updatedStatusText = await todoPage.getStatusText();
            expect(updatedStatusText).toContain('3/5 completed');
        });
    });

    test('error handling and edge cases', async ({ page }) => {
        // Register and login
        await authPage.register(userEmail, userPassword);
        await todoPage.waitForLoad();

        // Test adding empty todo
        await test.step('Handle empty todo input', async () => {
            const initialCount = await todoPage.getTodoCount();
            
            await todoPage.fillAndWait(todoPage.selectors.todoInput, '');
            await page.press(todoPage.selectors.todoInput, 'Enter');
            
            await page.waitForTimeout(1000);
            
            const finalCount = await todoPage.getTodoCount();
            expect(finalCount).toBe(initialCount);
        });

        // Test editing with empty name
        await test.step('Handle empty todo edit', async () => {
            const todoText = generateRandomTodo();
            await todoPage.addTodo(todoText);
            await todoPage.waitForTodo(todoText);

            const todoIndex = await todoPage.findTodoIndexByText(todoText);
            
            // Try to edit with empty name
            await page.dblclick(todoPage.selectors.todoName(todoIndex));
            await todoPage.waitForElement(todoPage.selectors.todoEditInput(todoIndex));
            
            await page.fill(todoPage.selectors.todoEditInput(todoIndex), '');
            await page.press(todoPage.selectors.todoEditInput(todoIndex), 'Enter');
            
            // Should keep original name
            const finalText = await todoPage.getTodoText(todoIndex);
            expect(finalText).toBe(todoText);
        });

        // Test rapid operations
        await test.step('Handle rapid successive operations', async () => {
            const initialCount = await todoPage.getTodoCount();
            
            // Add multiple todos rapidly
            const todos = [];
            for (let i = 0; i < 3; i++) {
                const todo = generateRandomTodo();
                todos.push(todo);
                await todoPage.addTodo(todo);
            }
            
            await page.waitForTimeout(2000);
            
            const finalCount = await todoPage.getTodoCount();
            expect(finalCount).toBe(initialCount + 3);
            
            // Verify all todos are there
            const allTodos = await todoPage.getAllTodoTexts();
            for (const todo of todos) {
                expect(allTodos).toContain(todo);
            }
        });
    });
});
