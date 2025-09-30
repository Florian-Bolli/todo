// Authentication tests

import { test, expect } from '@playwright/test';
import { AuthPage } from '../pages/auth-page.js';
import { TodoPage } from '../pages/todo-page.js';
import { generateRandomEmail, generateRandomPassword, clearStorage } from '../helpers/test-data.js';

test.describe('Authentication', () => {
    let authPage;
    let todoPage;

    test.beforeEach(async ({ page }) => {
        authPage = new AuthPage(page);
        todoPage = new TodoPage(page);
        
        // Navigate to page first, then clear storage
        await page.goto('/');
        await clearStorage(page);
    });

    test('should display login form on initial load', async ({ page }) => {
        await authPage.gotoLogin();
        
        await expect(page.locator('h2')).toContainText('Welcome to Minimal Todo');
        await expect(page.locator(authPage.selectors.emailInput)).toBeVisible();
        await expect(page.locator(authPage.selectors.passwordInput)).toBeVisible();
        await expect(page.locator(authPage.selectors.loginButton)).toBeVisible();
        await expect(page.locator(authPage.selectors.registerButton)).toBeVisible();
    });

    test('should register a new user successfully', async ({ page }) => {
        const email = generateRandomEmail();
        const password = generateRandomPassword();

        await authPage.register(email, password);
        
        // Should be redirected to todo app
        await todoPage.waitForLoad();
        expect(await todoPage.isLoaded()).toBe(true);
        await expect(page.locator('.header h1')).toContainText('ToDo List');
    });

    test('should login with valid credentials', async ({ page }) => {
        const email = generateRandomEmail();
        const password = generateRandomPassword();

        // First register
        await authPage.register(email, password);
        await todoPage.waitForLoad();
        
        // Logout
        await todoPage.logout();
        await authPage.waitForElement(authPage.selectors.loginForm);
        
        // Login
        await authPage.login(email, password);
        await todoPage.waitForLoad();
        
        // Should be back in todo app
        expect(await todoPage.isLoaded()).toBe(true);
    });

    test('should show error for invalid login credentials', async ({ page }) => {
        await authPage.gotoLogin();
        await authPage.submitLoginForm('invalid@example.com', 'wrongpassword');
        
        // Should show error (either alert or stay on login page)
        const hasError = await authPage.hasErrorMessage();
        const stillOnLogin = await authPage.isLoginFormVisible();
        
        expect(hasError || stillOnLogin).toBe(true);
    });

    test('should logout successfully', async ({ page }) => {
        const email = generateRandomEmail();
        const password = generateRandomPassword();

        // Register and login
        await authPage.register(email, password);
        await todoPage.waitForLoad();
        
        // Logout
        await todoPage.logout();
        
        // Should be back to login form
        await authPage.waitForElement(authPage.selectors.loginForm);
        expect(await authPage.isLoginFormVisible()).toBe(true);
    });

    test('should persist login state after page reload', async ({ page }) => {
        const email = generateRandomEmail();
        const password = generateRandomPassword();

        // Register and login
        await authPage.register(email, password);
        await todoPage.waitForLoad();
        
        // Reload page
        await page.reload();
        await todoPage.waitForLoad();
        
        // Should still be logged in
        expect(await todoPage.isLoaded()).toBe(true);
        await expect(page.locator('.header h1')).toContainText('ToDo List');
    });

    test('should require email and password for login', async ({ page }) => {
        await authPage.gotoLogin();
        
        // Try to submit empty form
        await authPage.clickLogin();
        
        // Should stay on login page or show validation error
        expect(await authPage.isLoginFormVisible()).toBe(true);
    });

    test('should handle registration with existing email', async ({ page }) => {
        const email = generateRandomEmail();
        const password = generateRandomPassword();

        // Register first time
        await authPage.register(email, password);
        await todoPage.waitForLoad();
        
        // Logout
        await todoPage.logout();
        await authPage.waitForElement(authPage.selectors.loginForm);
        
        // Try to register again with same email
        await authPage.submitRegisterForm(email, password);
        
        // Should show error or stay on login page
        const hasError = await authPage.hasErrorMessage();
        const stillOnLogin = await authPage.isLoginFormVisible();
        
        expect(hasError || stillOnLogin).toBe(true);
    });
});
