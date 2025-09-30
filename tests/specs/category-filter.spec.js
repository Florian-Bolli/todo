// Category filtering tests

import { test, expect } from '@playwright/test';
import { AuthPage } from '../pages/auth-page.js';
import { TodoPage } from '../pages/todo-page.js';
import { generateRandomEmail, generateRandomPassword, generateRandomTodo, clearStorage } from '../helpers/test-data.js';

test.describe('Category Filtering', () => {
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

    // Set global timeout for all tests
    test.setTimeout(5000);

    test('should show all categories by default', async ({ page }) => {
        // Create some todos
        await todoPage.addTodo('Work Task 1');
        await todoPage.addTodo('Personal Task 1');
        await todoPage.addTodo('Shopping Task 1');
        
        // All todos should be visible by default (no category filter applied)
        await expect(page.locator('.todo')).toHaveCount(3);
        
        // Check that category filter buttons exist and All button is active
        await expect(page.locator('.category-filter-btn:has-text("All")')).toBeVisible();
        await expect(page.locator('.category-filter-btn:has-text("All")')).toHaveClass(/active/);
    });

    test('should filter todos by single category', async ({ page }) => {
        // Create todos and categories
        await todoPage.addTodo('Work Task 1');
        await todoPage.addTodo('Personal Task 1');
        await todoPage.addTodo('Work Task 2');
        
        // Create categories through API
        await page.evaluate(async () => {
            const { categoriesAPI } = await import('/js/api.js');
            await categoriesAPI.create({ name: 'Work' });
            await categoriesAPI.create({ name: 'Personal' });
        });
        
        // Wait for categories to load
        await page.waitForTimeout(1000);
        
        // Assign categories
        await todoPage.expandTodo(0);
        await todoPage.selectCategory(0, 'Work');
        
        await todoPage.expandTodo(1);
        await todoPage.selectCategory(1, 'Personal');
        
        await todoPage.expandTodo(2);
        await todoPage.selectCategory(2, 'Work');
        
        // Click on Work category filter
        await page.click('.category-filter-btn:has-text("Work")');
        
        // Only Work todos should be visible
        await expect(page.locator('.todo')).toHaveCount(2);
        await expect(page.locator('.todo').nth(0)).toContainText('Work Task 1');
        await expect(page.locator('.todo').nth(1)).toContainText('Work Task 2');
    });

    test('should filter todos by multiple categories', async ({ page }) => {
        // Create todos and categories
        await todoPage.addTodo('Work Task 1');
        await todoPage.addTodo('Personal Task 1');
        await todoPage.addTodo('Shopping Task 1');
        await todoPage.addTodo('Work Task 2');
        
        // Create categories through API
        await page.evaluate(async () => {
            const { categoriesAPI } = await import('/js/api.js');
            await categoriesAPI.create({ name: 'Work' });
            await categoriesAPI.create({ name: 'Personal' });
            await categoriesAPI.create({ name: 'Shopping' });
        });
        
        // Wait for categories to load
        await page.waitForTimeout(1000);
        
        // Assign categories
        await todoPage.expandTodo(0);
        await todoPage.selectCategory(0, 'Work');
        
        await todoPage.expandTodo(1);
        await todoPage.selectCategory(1, 'Personal');
        
        await todoPage.expandTodo(2);
        await todoPage.selectCategory(2, 'Shopping');
        
        await todoPage.expandTodo(3);
        await todoPage.selectCategory(3, 'Work');
        
        // Click on Work and Personal category filters
        await page.click('.category-filter-btn:has-text("Work")');
        await page.click('.category-filter-btn:has-text("Personal")');
        
        // Work and Personal todos should be visible
        await expect(page.locator('.todo')).toHaveCount(3);
        await expect(page.locator('.todo').nth(0)).toContainText('Work Task 1');
        await expect(page.locator('.todo').nth(1)).toContainText('Personal Task 1');
        await expect(page.locator('.todo').nth(2)).toContainText('Work Task 2');
    });

    test('should show only one category when double-clicked', async ({ page }) => {
        // Create todos and categories
        await todoPage.addTodo('Work Task 1');
        await todoPage.addTodo('Personal Task 1');
        await todoPage.addTodo('Shopping Task 1');
        
        // Create categories through API
        await page.evaluate(async () => {
            const { categoriesAPI } = await import('/js/api.js');
            await categoriesAPI.create({ name: 'Work' });
            await categoriesAPI.create({ name: 'Personal' });
            await categoriesAPI.create({ name: 'Shopping' });
        });
        
        // Wait for categories to load
        await page.waitForTimeout(1000);
        
        // Assign categories
        await todoPage.expandTodo(0);
        await todoPage.selectCategory(0, 'Work');
        
        await todoPage.expandTodo(1);
        await todoPage.selectCategory(1, 'Personal');
        
        await todoPage.expandTodo(2);
        await todoPage.selectCategory(2, 'Shopping');
        
        // Double-click on Work category filter
        await page.dblclick('.category-filter-btn:has-text("Work")');
        
        // Only Work todos should be visible
        await expect(page.locator('.todo')).toHaveCount(1);
        await expect(page.locator('.todo').nth(0)).toContainText('Work Task 1');
    });

    test('should show all categories when All button is clicked', async ({ page }) => {
        // Create todos and categories
        await todoPage.addTodo('Work Task 1');
        await todoPage.addTodo('Personal Task 1');
        await todoPage.addTodo('Shopping Task 1');
        
        // Create categories through API
        await page.evaluate(async () => {
            const { categoriesAPI } = await import('/js/api.js');
            await categoriesAPI.create({ name: 'Work' });
            await categoriesAPI.create({ name: 'Personal' });
            await categoriesAPI.create({ name: 'Shopping' });
        });
        
        // Wait for categories to load
        await page.waitForTimeout(1000);
        
        // Assign categories
        await todoPage.expandTodo(0);
        await todoPage.selectCategory(0, 'Work');
        
        await todoPage.expandTodo(1);
        await todoPage.selectCategory(1, 'Personal');
        
        await todoPage.expandTodo(2);
        await todoPage.selectCategory(2, 'Shopping');
        
        // First filter to show only Work
        await page.click('.category-filter-btn:has-text("Work")');
        await expect(page.locator('.todo')).toHaveCount(1);
        
        // Then click All to show all categories
        await page.click('.category-filter-btn:has-text("All")');
        await expect(page.locator('.todo')).toHaveCount(3);
    });

    test('should handle todos without categories', async ({ page }) => {
        // Create todos with and without categories
        await todoPage.addTodo('Work Task 1');
        await todoPage.addTodo('Uncategorized Task 1');
        await todoPage.addTodo('Personal Task 1');
        
        // Create categories through API
        await page.evaluate(async () => {
            const { categoriesAPI } = await import('/js/api.js');
            await categoriesAPI.create({ name: 'Work' });
            await categoriesAPI.create({ name: 'Personal' });
        });
        
        // Wait for categories to load
        await page.waitForTimeout(1000);
        
        // Assign categories to some todos
        await todoPage.expandTodo(0);
        await todoPage.selectCategory(0, 'Work');
        
        await todoPage.expandTodo(2);
        await todoPage.selectCategory(2, 'Personal');
        
        // Filter by Work category
        await page.click('.category-filter-btn:has-text("Work")');
        
        // Only Work todo should be visible (uncategorized should be hidden)
        await expect(page.locator('.todo')).toHaveCount(1);
        await expect(page.locator('.todo').nth(0)).toContainText('Work Task 1');
    });

    test('should update filter buttons appearance when toggled', async ({ page }) => {
        // Create categories
        // Create categories through API
        await page.evaluate(async () => {
            const { categoriesAPI } = await import('/js/api.js');
            await categoriesAPI.create({ name: 'Work' });
            await categoriesAPI.create({ name: 'Personal' });
        });
        
        // Wait for categories to load
        await page.waitForTimeout(1000);
        
        // Check initial state - All button should be active
        await expect(page.locator('.category-filter-btn:has-text("All")')).toHaveClass(/active/);
        await expect(page.locator('.category-filter-btn:has-text("Work")')).not.toHaveClass(/active/);
        await expect(page.locator('.category-filter-btn:has-text("Personal")')).not.toHaveClass(/active/);
        
        // Click Work category
        await page.click('.category-filter-btn:has-text("Work")');
        
        // Work should be active, All should not be active
        await expect(page.locator('.category-filter-btn:has-text("Work")')).toHaveClass(/active/);
        await expect(page.locator('.category-filter-btn:has-text("All")')).not.toHaveClass(/active/);
        
        // Click Personal category
        await page.click('.category-filter-btn:has-text("Personal")');
        
        // Both Work and Personal should be active
        await expect(page.locator('.category-filter-btn:has-text("Work")')).toHaveClass(/active/);
        await expect(page.locator('.category-filter-btn:has-text("Personal")')).toHaveClass(/active/);
        await expect(page.locator('.category-filter-btn:has-text("All")')).not.toHaveClass(/active/);
        
        // Click All button
        await page.click('.category-filter-btn:has-text("All")');
        
        // All should be active, others should not
        await expect(page.locator('.category-filter-btn:has-text("All")')).toHaveClass(/active/);
        await expect(page.locator('.category-filter-btn:has-text("Work")')).not.toHaveClass(/active/);
        await expect(page.locator('.category-filter-btn:has-text("Personal")')).not.toHaveClass(/active/);
    });

    test('should persist category filter state across page reloads', async ({ page }) => {
        // Create todos and categories
        await todoPage.addTodo('Work Task 1');
        await todoPage.addTodo('Personal Task 1');
        await todoPage.addTodo('Shopping Task 1');
        
        // Create categories through API
        await page.evaluate(async () => {
            const { categoriesAPI } = await import('/js/api.js');
            await categoriesAPI.create({ name: 'Work' });
            await categoriesAPI.create({ name: 'Personal' });
            await categoriesAPI.create({ name: 'Shopping' });
        });
        
        // Wait for categories to load
        await page.waitForTimeout(1000);
        
        // Assign categories
        await todoPage.expandTodo(0);
        await todoPage.selectCategory(0, 'Work');
        
        await todoPage.expandTodo(1);
        await todoPage.selectCategory(1, 'Personal');
        
        await todoPage.expandTodo(2);
        await todoPage.selectCategory(2, 'Shopping');
        
        // Filter by Work category
        await page.click('.category-filter-btn:has-text("Work")');
        await expect(page.locator('.todo')).toHaveCount(1);
        
        // Reload the page
        await page.reload();
        await todoPage.waitForLoad();
        
        // Filter should still be applied
        await expect(page.locator('.todo')).toHaveCount(1);
        await expect(page.locator('.todo').nth(0)).toContainText('Work Task 1');
        await expect(page.locator('.category-filter-btn:has-text("Work")')).toHaveClass(/active/);
    });
});
